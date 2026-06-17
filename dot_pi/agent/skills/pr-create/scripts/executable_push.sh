#!/usr/bin/env bash
# Encode the upstream-first / fork-fallback push decision so the agent doesn't
# re-derive it in prose each time.
#
# Default: push the source branch to the MAIN repo (origin). Fork ONLY when
# write access to origin is missing. Forking is a side effect, so it is gated
# behind --allow-fork: without it, a denied push reports the situation and
# exits non-zero instead of silently creating a fork.
#
# Usage:
#   push.sh <branch> [--allow-fork]
# Prints, on success:
#   PR_HEAD=<branch>            (direct)  or  <user>:<branch> (fork)
#   SOURCE_REMOTE=<remote>
set -u

if [ -z "${1:-}" ]; then
  echo "usage: push.sh <branch> [--allow-fork]" >&2
  exit 2
fi
branch="$1"
allow_fork="no"
[ "${2:-}" = "--allow-fork" ] && allow_fork="yes"

forge="unknown"
url="$(git remote get-url origin 2>/dev/null || echo '')"
case "$url" in *github.com*) forge=github ;; *gitlab*) forge=gitlab ;; esac

write="unknown"
if [ "$forge" = "github" ] && command -v gh >/dev/null 2>&1; then
  case "$(gh repo view --json viewerPermission -q .viewerPermission 2>/dev/null)" in
    ADMIN|MAINTAIN|WRITE) write=yes ;;
    READ|TRIAGE)          write=no ;;
  esac
fi

do_fork_github() {
  command -v gh >/dev/null 2>&1 || { echo "gh required for fork fallback" >&2; return 1; }
  gh repo fork --remote --remote-name fork >&2 || return 1
  git push -u fork "$branch" >&2 || return 1
  user="$(gh api user -q .login 2>/dev/null)"
  echo "PR_HEAD=${user}:${branch}"
  echo "SOURCE_REMOTE=fork"
}

# Write access known-missing: go straight to fork (if allowed).
if [ "$write" = "no" ]; then
  if [ "$allow_fork" = "yes" ] && [ "$forge" = "github" ]; then
    do_fork_github; exit $?
  fi
  echo "NO write access to origin; rerun with --allow-fork to use a fork" >&2
  exit 4
fi

# Write access yes/unknown: try the direct upstream push first.
if git push -u origin "$branch" >&2 2>/tmp/pusherr.$$; then
  echo "PR_HEAD=${branch}"
  echo "SOURCE_REMOTE=origin"
  rm -f /tmp/pusherr.$$
  exit 0
fi

err="$(cat /tmp/pusherr.$$ 2>/dev/null)"; rm -f /tmp/pusherr.$$
echo "$err" >&2
# Direct push failed: only a permission error justifies the fork path.
if echo "$err" | grep -qiE '403|denied|not authorized|permission|forbidden'; then
  if [ "$allow_fork" = "yes" ] && [ "$forge" = "github" ]; then
    do_fork_github; exit $?
  fi
  echo "push denied; rerun with --allow-fork to use a fork" >&2
  exit 4
fi
echo "push failed for a non-permission reason; agent must inspect" >&2
exit 5
