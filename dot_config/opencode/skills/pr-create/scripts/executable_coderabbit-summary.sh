#!/usr/bin/env bash
# coderabbit-summary.sh <baseRef> [configPath] [timeoutSeconds=90]
#
# Runs local CodeRabbit review once and prints a compact findings summary
# grouped by severity. Full raw NDJSON output is saved to a log file for
# re-inspection instead of being dumped into context.
set -uo pipefail

base_ref="${1:?usage: coderabbit-summary.sh <baseRef> [configPath] [timeoutSeconds]}"
config_path="${2:-}"
timeout_s="${3:-90}"

if [ -z "$config_path" ]; then
  for candidate in .coderabbit.yaml .coderabbit.yml coderabbit.yaml coderabbit.yml; do
    [ -f "$candidate" ] && config_path="$candidate" && break
  done
fi
if [ -z "$config_path" ]; then
  echo "Skipped: no CodeRabbit config file found."
  exit 0
fi

bin="$(command -v coderabbit || true)"
[ -z "$bin" ] && [ -x "$HOME/bin/coderabbit" ] && bin="$HOME/bin/coderabbit"
if [ -z "$bin" ]; then
  echo "Skipped: coderabbit binary not found in PATH or ~/bin/coderabbit."
  exit 0
fi

log="$(mktemp --tmpdir=/tmp/opencode coderabbit.XXXXXX.log)"
timeout "${timeout_s}s" "$bin" review --agent --base "$base_ref" -c "$config_path" > "$log" 2>&1
code=$?

if grep -qiE 'quota.*reset.*[0-9]+.*min' "$log"; then
  mins="$(grep -oiE 'quota.*reset.*[0-9]+.*min' "$log" | grep -oE '[0-9]+' | head -1)"
  echo "Skipped: CodeRabbit quota exhausted, resets in ~${mins} min."
  exit 0
fi

if ! command -v jq >/dev/null 2>&1; then
  count="$(grep -c '"severity"' "$log" || true)"
  echo "CodeRabbit run finished (exit $code). ~${count} line(s) with a severity field. log: $log"
  echo "(install jq for grouped-by-severity output)"
  exit "$code"
fi

# Findings schema varies by coderabbit CLI version: newer releases emit
# {"type":"finding","severity":...,"fileName":...,"codegenInstructions":...}
# at the top level; older releases nested it under {"body":{"severity":...}}.
# Match both so this doesn't silently under-report again.
finding_filter='(.type == "finding") or (.body.severity != null)'
project_fields='{
  severity: (.severity // .body.severity),
  file: (.fileName // .file // "?"),
  message: ((.codegenInstructions // .body.summary // .body.body // "")[0:200])
}'

count="$(jq -sc "[.[] | select($finding_filter)] | length" "$log" 2>/dev/null || echo 0)"
if [ "$code" -eq 124 ]; then
  if [ "${count:-0}" -gt 0 ]; then
    echo "CodeRabbit: timed out after ${timeout_s}s with ${count:-0} finding(s). Review these findings; do not rerun. log: $log"
  else
    echo "Skipped: CodeRabbit timed out after ${timeout_s}s before producing findings. log: $log"
    exit 0
  fi
else
  echo "CodeRabbit: ${count:-0} finding(s). log: $log"
fi
if [ "${count:-0}" -gt 0 ]; then
  jq -sr "
    [.[] | select($finding_filter) | $project_fields]
    | group_by(.severity) | sort_by(.[0].severity)
    | .[] | \"\(.[0].severity) (\(length)):\n\" + (map(\"  \(.file): \(.message)\") | join(\"\n\"))
  " "$log"
fi
if [ "$code" -eq 124 ]; then
  exit 0
fi
exit "$code"
