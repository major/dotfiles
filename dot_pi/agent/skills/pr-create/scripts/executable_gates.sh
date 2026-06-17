#!/usr/bin/env bash
# Resolve (and optionally run) the project's quality gates without the agent
# having to memorize every ecosystem's command. Resolution is conservative:
# prefer a matching Makefile target, then a known ecosystem default, else
# print "unknown" so the agent decides.
#
# Usage:
#   gates.sh plan                 # print resolved command for every gate
#   gates.sh cmd   <gate>         # print just that gate's command (no run)
#   gates.sh run   <gate>         # exec that gate, exit with its status
# Gates: test | coverage | lint | fmt
set -u

mk_targets=""
[ -f Makefile ] && mk_targets="$(grep -oE '^[a-zA-Z0-9_-]+:' Makefile | sed 's/:.*//')"
has_target() { printf '%s\n' "$mk_targets" | grep -qx "$1"; }
npm_has() {
  [ -f package.json ] && command -v node >/dev/null 2>&1 || return 1
  node -e 'const s=(require("./package.json").scripts)||{};process.exit(s["'"$1"'"]?0:1)' 2>/dev/null
}

# Echo the resolved command line for a gate, or "unknown".
resolve() {
  gate="$1"
  case "$gate" in
    test)
      if   has_target test;  then echo "make test"
      elif has_target check; then echo "make check"
      elif npm_has test;     then echo "npm test"
      elif [ -f Cargo.toml ]; then echo "cargo test"
      elif [ -f go.mod ];     then echo "go test ./..."
      elif [ -f pyproject.toml ] || [ -f pytest.ini ]; then echo "pytest"
      else echo "unknown"; fi ;;
    coverage)
      if   has_target coverage;     then echo "make coverage"
      elif has_target docs-coverage; then echo "make docs-coverage"
      elif has_target cov;          then echo "make cov"
      elif npm_has coverage;        then echo "npm run coverage"
      elif [ -f Cargo.toml ] && command -v cargo-llvm-cov >/dev/null 2>&1; then echo "cargo llvm-cov"
      elif [ -f go.mod ];           then echo "go test -cover ./..."
      elif [ -f pyproject.toml ];   then echo "pytest --cov"
      else echo "unknown"; fi ;;
    lint)
      if   has_target lint;   then echo "make lint"
      elif npm_has lint;      then echo "npm run lint"
      elif [ -f Cargo.toml ]; then echo "cargo clippy --all-targets -- -D warnings"
      elif [ -f go.mod ] && command -v golangci-lint >/dev/null 2>&1; then echo "golangci-lint run"
      elif command -v ruff >/dev/null 2>&1; then echo "ruff check"
      else echo "unknown"; fi ;;
    fmt)
      if   has_target fmt;    then echo "make fmt"
      elif has_target format; then echo "make format"
      elif npm_has format;    then echo "npm run format"
      elif [ -f Cargo.toml ]; then echo "cargo fmt --check"
      elif [ -f go.mod ];     then echo "gofmt -l ."
      elif command -v ruff >/dev/null 2>&1; then echo "ruff format --check"
      else echo "unknown"; fi ;;
    *) echo "unknown" ;;
  esac
}

mode="${1:-plan}"
case "$mode" in
  plan)
    for g in test coverage lint fmt; do printf '%s=%s\n' "$g" "$(resolve "$g")"; done ;;
  cmd)
    resolve "${2:?gate required}" ;;
  run)
    cmd="$(resolve "${2:?gate required}")"
    [ "$cmd" = "unknown" ] && { echo "gate '$2' unresolved; agent must choose" >&2; exit 3; }
    echo "+ $cmd" >&2
    eval "$cmd" ;;
  *)
    echo "usage: gates.sh plan|cmd <gate>|run <gate>" >&2; exit 2 ;;
esac
