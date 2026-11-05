#!/usr/bin/env bash
# mr-stack-watch.sh: watch my GitLab MR stacks so the merge train stays full.
#
# Polls with glab (no model tokens) and exits only when something needs action.
#
# Usage: mr-stack-watch.sh [--once] [--reset] [--project group/proj] [--author user] [--interval SEC] [iid ...]
#   --once   print a compact status table and exit
#   iid ...  track only these MRs (default: all my open MRs in the project)
# Only eligible MRs are considered: mine, not a draft, fully approved, and no open
# review threads. Anything else shows as SKIP/<reason> in --once and never wakes the model.
#   --reset  delete this project's saved state (seen, tracked, parent files) and exit
# The tracked set is saved on the first watcher start and reused on restarts, so MRs
# opened later are not picked up mid-run. Pass iids to replace it.
#
# Event lines (one per MR, printed on exit):
#   READY    iid sha stacked=0|1 src=branch [parent=sha]
#                                  target is the default branch, approved, no blockers, auto-merge off;
#                                  parent= is the old parent tip saved while the MR was stacked
#   FAILED   iid sha               head pipeline failed
#   CONFLICT iid sha src=branch [parent=sha]
#                                  merge conflicts, needs a local rebase
#   CLOSED   iid                   closed without merging
#   DONE                           every tracked MR is merged or closed
# SKIP reasons: NOT_MINE, DRAFT, UNAPPROVED, THREADS. Skipped MRs do not count as open,
# so the watcher prints DONE once every eligible MR is merged or closed.
# Each (iid, reason, sha) is reported once, tracked in a seen file, so a standing
# blocker does not wake the model again until the MR head changes.
# --ack iid sha REASON records that my own push moved the head, so REASON is not
# reported again for that sha (for example --ack 2926 <new sha> FAILED), then exits.
# MRs that still target another MR's branch are only watched for merged/closed.
# GitLab statuses that are still being computed (checking, unchecked) are ignored.
set -euo pipefail

once=0 reset=0 interval=60 project="" author="" ids=() ack=()
while [ $# -gt 0 ]; do
  case "$1" in
    --once) once=1 ;;
    --reset) reset=1 ;;
    --ack) ack=("$2" "$3" "$4"); shift 3 ;;
    --project) project="$2"; shift ;;
    --author) author="$2"; shift ;;
    --interval) interval="$2"; shift ;;
    *) ids+=("$1") ;;
  esac
  shift
done

if [ -z "$project" ]; then
  project=$(git remote get-url origin | sed -E 's#^(git@[^:]+:|https?://[^/]+/)##; s#\.git$##')
fi
enc=${project//\//%2F}
seen_dir=~/.cache/opencode-tmp/mr-stack-watch
if [ $reset -eq 1 ]; then rm -f "$seen_dir/${enc}".*; exit 0; fi
if [ ${#ack[@]} -eq 3 ]; then
  mkdir -p "$seen_dir"; echo "${ack[0]} ${ack[2]} ${ack[1]}" >> "$seen_dir/${enc}.seen"; exit 0
fi
api() { glab api "projects/$enc/$1"; }
[ -n "$author" ] || author=$(glab api user | jq -r .username)
default_branch=$(glab api "projects/$enc" | jq -r .default_branch)

mkdir -p "$seen_dir"
seen="$seen_dir/${enc}.seen"
touch "$seen"
tracked="$seen_dir/${enc}.tracked"
if [ ${#ids[@]} -eq 0 ] && [ -s "$tracked" ]; then
  mapfile -t ids < "$tracked"
elif [ ${#ids[@]} -eq 0 ]; then
  mapfile -t ids < <(api "merge_requests?state=opened&author_username=$author&per_page=100" | jq -r '.[].iid')
fi
if [ $once -eq 0 ]; then printf '%s\n' "${ids[@]}" > "$tracked"; fi
declare -A stacked  # iid -> 1 once it has targeted a non-default branch

q=$(printf 'iids[]=%s&' "${ids[@]}")
# One list call per poll (not one per MR). The list has no head_pipeline, so
# only MRs that may have failed CI get a per-MR read.
fetch_all() {
  api "merge_requests?per_page=100&${q}" | jq -c '.[]' | while read -r m; do
    m=$(add_approval "$m")
    if jq -e '.state == "opened" and .merge_when_pipeline_succeeds != true
              and .detailed_merge_status == "ci_must_pass"' <<<"$m" >/dev/null; then
      api "merge_requests/$(jq -r .iid <<<"$m")" | jq -c .
    else
      echo "$m"
    fi
  done
}

# add_approval MR-json: adds fully_approved (bool) from the approvals endpoint for open
# MRs, because detailed_merge_status hides not_approved behind other statuses. Left null
# (unknown) when the call fails, so classify treats the MR as pending, not skipped.
add_approval() {
  local m="$1" iid a
  if ! jq -e '.state == "opened"' <<<"$m" >/dev/null; then echo "$m"; return; fi
  iid=$(jq -r .iid <<<"$m")
  a=$(api "merge_requests/$iid/approvals" 2>/dev/null | jq -c '.approved') || a=null
  jq -c --argjson a "${a:-null}" '. + {fully_approved: $a}' <<<"$m"
}

# Save the parent branch tip once per stacked MR. After the parent merges and
# its branch is deleted, this is the <old parent tip> for `rebase --onto`.
save_parent_tip() {
  local f="$seen_dir/${enc}.$1.parent"
  [ -s "$f" ] && return
  api "repository/branches/${2//\//%2F}" | jq -r .commit.id > "$f" 2>/dev/null || rm -f "$f"
}

# classify MR-json -> prints "iid|STATE|reason|sha|target|source"
classify() {
  jq -r --arg d "$default_branch" --arg me "$author" '
    . as $m | "\($m.iid)|" + (
    ($m.sha // "") as $sha |
    if $m.state == "merged" then "MERGED||\($sha)|\($m.target_branch)|\($m.source_branch)"
    elif $m.state == "closed" then "CLOSED||\($sha)|\($m.target_branch)|\($m.source_branch)"
    elif $m.author.username != $me then "SKIP|NOT_MINE|\($sha)|\($m.target_branch)|\($m.source_branch)"
    elif ($m.draft == true or $m.work_in_progress == true) then "SKIP|DRAFT|\($sha)|\($m.target_branch)|\($m.source_branch)"
    elif $m.fully_approved == false then "SKIP|UNAPPROVED|\($sha)|\($m.target_branch)|\($m.source_branch)"
    elif $m.blocking_discussions_resolved == false then "SKIP|THREADS|\($sha)|\($m.target_branch)|\($m.source_branch)"
    elif $m.fully_approved == null then "PENDING||\($sha)|\($m.target_branch)|\($m.source_branch)"
    elif $m.target_branch != $d then "STACKED||\($sha)|\($m.target_branch)|\($m.source_branch)"
    elif $m.has_conflicts == true then "BLOCKED|CONFLICT|\($sha)|\($m.target_branch)|\($m.source_branch)"
    elif $m.head_pipeline.status == "failed" then "BLOCKED|FAILED|\($sha)|\($m.target_branch)|\($m.source_branch)"
    elif $m.merge_when_pipeline_succeeds == true then "QUEUED||\($sha)|\($m.target_branch)|\($m.source_branch)"
    elif ($m.detailed_merge_status | IN("checking", "unchecked", "preparing")) then "PENDING||\($sha)|\($m.target_branch)|\($m.source_branch)"
    else "READY|READY|\($sha)|\($m.target_branch)|\($m.source_branch)" end)'
}

while true; do
  events="" open=0 table=""
  mrs=$(fetch_all) || { sleep "$interval"; continue; }
  while IFS='|' read -r iid state reason sha target source; do
    [ -n "$iid" ] || continue
    if [ "$state" = STACKED ]; then stacked[$iid]=1; save_parent_tip "$iid" "$target"; fi
    table+="$iid $state${reason:+/$reason} ${sha:0:9} -> $target"$'\n'
    case "$state" in
      MERGED) continue ;;
      CLOSED) key="$iid CLOSED" ;;
      SKIP) continue ;;  # not eligible: not counted as open, never wakes the model
      BLOCKED|READY)
        open=$((open+1))
        key="$iid $reason $sha" ;;
      *) open=$((open+1)); continue ;;
    esac
    [ $once -eq 1 ] && continue  # status mode must not consume events
    if ! grep -qxF "$key" "$seen"; then
      echo "$key" >> "$seen"
      line="${reason:-CLOSED} $iid ${sha:0:40}"
      [ "$reason" = READY ] && line+=" stacked=${stacked[$iid]:-0}"
      case "$reason" in READY|CONFLICT) line+=" src=$source" ;; esac
      pf="$seen_dir/${enc}.$iid.parent"
      [ -s "$pf" ] && line+=" parent=$(cat "$pf")"
      events+="$line"$'\n'
    fi
  done < <(classify <<<"$mrs")
  if [ $once -eq 1 ]; then printf '%s' "$table"; exit 0; fi
  if [ -n "$events" ]; then printf '%s' "$events"; exit 0; fi
  if [ "$open" -eq 0 ]; then echo DONE; exit 0; fi
  sleep "$interval"
done
