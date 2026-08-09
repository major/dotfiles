#!/usr/bin/env bash
# glab-checks-summary.sh <mrIid> <projectPath> [timeoutSeconds=300] [intervalSeconds=10]
#
# Polls a GitLab MR's pipeline status and prints one compact final line,
# without a full-screen TUI. `glab ci status` is branch-scoped and 404s for
# MRs opened from a fork (the pipeline runs against the fork project), so
# this hits the MR-pipelines API directly instead:
#   glab api projects/<projectPath url-encoded>/merge_requests/<iid>/pipelines
# which returns pipelines newest-first regardless of which project they ran
# in. `glab api` has no --jq; pipe through `jq`.
set -uo pipefail

mr_iid="${1:?usage: glab-checks-summary.sh <mrIid> <projectPath> [timeoutSeconds] [intervalSeconds]}"
project_path="${2:?usage: glab-checks-summary.sh <mrIid> <projectPath> [timeoutSeconds] [intervalSeconds]}"
timeout_s="${3:-300}"
interval_s="${4:-10}"
[ "$interval_s" -lt 5 ] && interval_s=5

if ! command -v glab >/dev/null 2>&1; then
  echo "glab CLI not found."
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "jq not found (required to parse glab api output)."
  exit 1
fi

encoded_path="$(printf '%s' "$project_path" | sed 's#/#%2F#g')"
endpoint="projects/$encoded_path/merge_requests/$mr_iid/pipelines"

deadline=$(( $(date +%s) + timeout_s ))
status=""
web_url=""
pipeline_id=""
while [ "$(date +%s)" -lt "$deadline" ]; do
  raw="$(glab api "$endpoint" 2>&1)"
  if ! printf '%s' "$raw" | jq -e . >/dev/null 2>&1; then
    # transient API error or no pipelines registered yet
    sleep "$interval_s"
    continue
  fi
  status="$(printf '%s' "$raw" | jq -r '.[0].status // empty')"
  web_url="$(printf '%s' "$raw" | jq -r '.[0].web_url // empty')"
  pipeline_id="$(printf '%s' "$raw" | jq -r '.[0].id // empty')"
  case "$status" in
    success|failed|canceled|skipped) break ;;
    *) sleep "$interval_s" ;;
  esac
done

echo "pipeline: ${pipeline_id:-none} status: ${status:-unknown} url: ${web_url:-n/a}"
case "$status" in
  success) echo "All checks passed."; exit 0 ;;
  failed) echo "Pipeline failed."; exit 1 ;;
  canceled) echo "Pipeline canceled."; exit 1 ;;
  skipped) echo "Pipeline skipped."; exit 0 ;;
  "") echo "Timed out after ${timeout_s}s with no pipeline registered yet."; exit 8 ;;
  *) echo "Timed out after ${timeout_s}s with pipeline still $status."; exit 8 ;;
esac
