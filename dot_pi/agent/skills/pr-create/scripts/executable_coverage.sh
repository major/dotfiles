#!/usr/bin/env bash
# Run local coverage and enforce Codecov-style project/patch thresholds.
# Requires a coverage generator that writes lcov.info (e.g. `make coverage`,
# `cargo llvm-cov --lcov --output-path lcov.info`).
#
# Usage:
#   coverage.sh [base]
# Example:
#   coverage.sh origin/main
set -u

base="${1:-origin/main}"
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

cmd="$({ bash "$script_dir/gates.sh" cmd coverage 2>/dev/null || true; })"
if [ -z "$cmd" ] || [ "$cmd" = "unknown" ]; then
  echo "coverage: no local coverage command resolved; agent must choose" >&2
  exit 3
fi

echo "+ $cmd" >&2
if ! eval "$cmd"; then
  echo "coverage: generator failed" >&2
  exit 1
fi

python3 "$script_dir/patch_coverage.py" --base "$base" --fail-on-missing-patch
