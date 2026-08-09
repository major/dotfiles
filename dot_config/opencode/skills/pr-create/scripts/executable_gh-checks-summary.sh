#!/usr/bin/env bash
# gh-checks-summary.sh <pr> [timeoutSeconds=300] [intervalSeconds=10]
#
# Polls GitHub PR checks and prints one compact final table, without the
# noisy full-screen repeats of `gh pr checks --watch` (which is a TUI
# command not meant for scripting and can't be combined with --json).
# Relies on gh's own exit codes: 0 = all passed, 1 = one or more failed,
# 8 = still pending.
set -uo pipefail

pr="${1:?usage: gh-checks-summary.sh <pr> [timeoutSeconds] [intervalSeconds]}"
timeout_s="${2:-300}"
interval_s="${3:-10}"
[ "$interval_s" -lt 5 ] && interval_s=5

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI not found."
  exit 1
fi

deadline=$(( $(date +%s) + timeout_s ))
output=""
code=8
while [ "$(date +%s)" -lt "$deadline" ]; do
  output="$(gh pr checks "$pr" 2>&1)"
  code=$?
  # gh briefly errors with "no checks reported" right after PR creation,
  # before the API has registered any checks - treat that as still-pending.
  if [ "$code" -eq 8 ]; then
    sleep "$interval_s"
    continue
  fi
  if [ "$code" -eq 1 ] && printf '%s' "$output" | grep -qi 'no checks reported'; then
    sleep "$interval_s"
    continue
  fi
  break
done

echo "$output"
echo ""
case "$code" in
  0) echo "All checks passed." ;;
  1) echo "One or more checks failed." ;;
  8) echo "Timed out after ${timeout_s}s with checks still pending." ;;
  *) echo "gh exited with code $code." ;;
esac
exit "$code"
