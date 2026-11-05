#!/usr/bin/env bash
# mr-stack-watch.test.sh: offline tests for mr-stack-watch.sh.
#
# A fake `glab` on PATH serves JSON fixtures, so no network is used and each
# run takes well under a second. HOME points at a temp dir, so the watcher's
# saved state never touches the real ~/.cache.
#
# Usage: mr-stack-watch.test.sh [path/to/mr-stack-watch.sh]
set -euo pipefail

watch=${1:-"$(dirname "$0")/mr-stack-watch.sh"}
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
fail=0

# fake_glab: writes a `glab` stub that answers `glab api <path>` from $tmp/fx.
# A missing approvals fixture makes that call fail, like a GitLab error.
fake_glab() {
  mkdir -p "$tmp/bin" "$tmp/fx"
  cat > "$tmp/bin/glab" <<'EOF'
#!/usr/bin/env bash
[ "$1" = api ] || exit 2
p=$2 fx=$FAKE_FX
case "$p" in
  user) echo '{"username":"me"}' ;;
  projects/g%2Fp) echo '{"default_branch":"main"}' ;;
  "projects/g%2Fp/merge_requests?"*) cat "$fx/list.json" ;;
  projects/g%2Fp/merge_requests/*/approvals)
    n=${p#*merge_requests/}; n=${n%/approvals}
    [ -f "$fx/approvals.$n.json" ] || exit 1
    cat "$fx/approvals.$n.json" ;;
  projects/g%2Fp/merge_requests/*) cat "$fx/mr.${p##*/}.json" ;;
  *) exit 1 ;;
esac
EOF
  chmod +x "$tmp/bin/glab"
}

# mr IID STATUS TARGET SOURCE: prints one MR list entry that is mine, open, not
# a draft, has no open threads, and is not set to auto-merge.
mr() {
  jq -nc --argjson iid "$1" --arg s "$2" --arg t "$3" --arg src "$4" '{
    iid: $iid, state: "opened", author: {username: "me"}, draft: false,
    blocking_discussions_resolved: true, merge_when_pipeline_succeeds: false,
    has_conflicts: false, detailed_merge_status: $s, target_branch: $t,
    source_branch: $src, sha: ("\($iid)" * 10)}'
}

# run_watch ARGS...: runs the watcher against the fake glab and prints stdout.
run_watch() {
  HOME="$tmp/home" PATH="$tmp/bin:$PATH" FAKE_FX="$tmp/fx" \
    bash "$watch" --project g/p --author me "$@"
}

# expect NAME WANT GOT: records a failure when GOT does not contain WANT.
expect() {
  if grep -qF -- "$2" <<<"$3"; then echo "ok   $1"; else
    echo "FAIL $1: want '$2'"; printf '%s\n' "$3" | sed 's/^/     got: /'; fail=1
  fi
}

# Arrange: one fixture set that covers every classification below.
fake_glab
{
  mr 1 ci_must_pass main a     # approved, no pipeline yet (a retargeted stack child)
  mr 2 ci_must_pass main b     # approved, head pipeline failed
  mr 3 mergeable main c        # not approved
  mr 4 mergeable main d        # approvals call fails, so approval is unknown
  mr 5 mergeable main e        # approved and mergeable
  mr 6 mergeable e f           # stacked on !5
} | jq -s . > "$tmp/fx/list.json"
for n in 1 2 5 6; do echo '{"iid": '$n', "approved": true}' > "$tmp/fx/approvals.$n.json"; done
echo '{"iid": 3, "approved": false}' > "$tmp/fx/approvals.3.json"
mr 1 ci_must_pass main a | jq -c '. + {head_pipeline: null}' > "$tmp/fx/mr.1.json"
mr 2 ci_must_pass main b | jq -c '. + {head_pipeline: {status: "failed"}}' > "$tmp/fx/mr.2.json"

# Act
snapshot=$(run_watch --once 1 2 3 4 5 6)
events=$(run_watch --interval 0 1 2 3 4 5 6)

# Assert: snapshot classification, including src for building stacks.
expect "approved MR with no pipeline is READY" "1 READY/READY 111111111 a -> main" "$snapshot"
expect "approved MR with failed pipeline is FAILED" "2 BLOCKED/FAILED 222222222 b -> main" "$snapshot"
expect "unapproved MR is skipped" "3 SKIP/UNAPPROVED 333333333 c -> main" "$snapshot"
expect "unknown approval stays PENDING" "4 PENDING 444444444 d -> main" "$snapshot"
expect "approved mergeable MR is READY" "5 READY/READY 555555555 e -> main" "$snapshot"
expect "stacked child shows its source branch" "6 STACKED 666666666 f -> e" "$snapshot"
# Assert: the watcher wakes the model with a FAILED event, not silence.
expect "failed pipeline wakes the watcher" "FAILED 2 2222222222" "$events"

exit $fail
