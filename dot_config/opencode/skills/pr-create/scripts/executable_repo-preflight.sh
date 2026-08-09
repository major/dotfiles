#!/usr/bin/env bash
# repo-preflight.sh [baseRemote] [baseBranch]
#
# Collects PR/MR preflight facts: branch, dirty files, remotes, base,
# identity, forge auth, existing PR, and blockers. Run once before starting
# a PR/MR (pr-create skill Preflight phase).
set -uo pipefail

base_remote_arg="${1:-}"
base_branch_arg="${2:-}"
blockers=()

root="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "Not inside a git repository."; exit 1; }
cd "$root" || exit 1

branch="$(git branch --show-current)"
[ -z "$branch" ] && blockers+=("Detached HEAD - check out a feature branch first.")

dirty="$(git status --short)"
dirty_count=0
[ -n "$dirty" ] && dirty_count="$(printf '%s\n' "$dirty" | grep -c .)"

user_name="$(git config user.name)"
user_email="$(git config user.email)"
[ -z "$user_email" ] && blockers+=("git user.email not configured.")

declare -A remotes
while read -r name url _; do
  [ -n "$name" ] && remotes["$name"]="$url"
done < <(git remote -v | grep '(fetch)')
# Sort for deterministic fallback ordering (bash associative arrays have no
# guaranteed iteration order).
remote_names=($(printf '%s\n' "${!remotes[@]}" | sort))

owner_repo_of() {
  # git@github.com:owner/repo.git or https://github.com/owner/repo(.git) -> owner/repo
  printf '%s' "$1" | sed -E 's#^(git@|https://|ssh://git@)?[^:/]+[:/]##; s#\.git$##'
}

# Ask the forge which remote is the true non-fork upstream, so we don't rely
# on remote *names* (e.g. a fork remote that isn't literally called "origin").
gh_login=""
glab_login=""
fork_probed_base=""
if [ -z "$base_remote_arg" ] && command -v gh >/dev/null 2>&1 && printf '%s\n' "${remotes[@]}" | grep -q github.com; then
  gh_login="$(gh api user --jq .login 2>/dev/null)"
  for name in "${remote_names[@]}"; do
    case "${remotes[$name]}" in
      *github.com*)
        or="$(owner_repo_of "${remotes[$name]}")"
        is_fork="$(gh api "repos/$or" --jq '.fork' 2>/dev/null)"
        if [ "$is_fork" = "false" ]; then
          fork_probed_base="$name"
          break
        fi
        ;;
    esac
  done
fi
# GitLab equivalent: `glab api` has no --jq, so pipe through jq. A GitLab
# remote isn't necessarily gitlab.com (e.g. gitlab.cee.redhat.com), so match
# on "gitlab" rather than a fixed hostname.
if [ -z "$base_remote_arg" ] && [ -z "$fork_probed_base" ] && command -v glab >/dev/null 2>&1 && command -v jq >/dev/null 2>&1 && printf '%s\n' "${remotes[@]}" | grep -qi gitlab; then
  glab_login="$(glab api user 2>/dev/null | jq -r '.username // empty')"
  for name in "${remote_names[@]}"; do
    case "${remotes[$name]}" in
      *gitlab*)
        or="$(owner_repo_of "${remotes[$name]}")"
        enc="$(printf '%s' "$or" | sed 's#/#%2F#g')"
        is_fork="$(glab api "projects/$enc" 2>/dev/null | jq 'has("forked_from_project")')"
        if [ "$is_fork" = "false" ]; then
          fork_probed_base="$name"
          break
        fi
        ;;
    esac
  done
fi

if [ -n "$base_remote_arg" ] && [ -n "${remotes[$base_remote_arg]:-}" ]; then
  base_remote="$base_remote_arg"
elif [ -n "$fork_probed_base" ]; then
  base_remote="$fork_probed_base"
elif [ -n "${remotes[upstream]:-}" ]; then
  base_remote="upstream"
else
  base_remote="${remote_names[0]:-}"
fi
if [ -z "$base_remote" ]; then
  echo "No git remotes configured."
  exit 1
fi

# Push remote: prefer whichever remote is owned by the authenticated forge
# user (my fork), falling back to the origin/base convention, then base itself.
push_remote=""
if [ -n "$gh_login" ]; then
  for name in "${remote_names[@]}"; do
    case "${remotes[$name]}" in
      *github.com*)
        or="$(owner_repo_of "${remotes[$name]}")"
        if [ "${or%%/*}" = "$gh_login" ]; then
          push_remote="$name"
          break
        fi
        ;;
    esac
  done
fi
if [ -z "$push_remote" ] && [ -n "$glab_login" ]; then
  for name in "${remote_names[@]}"; do
    case "${remotes[$name]}" in
      *gitlab*)
        or="$(owner_repo_of "${remotes[$name]}")"
        if [ "${or%%/*}" = "$glab_login" ]; then
          push_remote="$name"
          break
        fi
        ;;
    esac
  done
fi
if [ -z "$push_remote" ]; then
  if [ "$base_remote" = "upstream" ] && [ -n "${remotes[origin]:-}" ]; then
    push_remote="origin"
  else
    push_remote="$base_remote"
  fi
fi

git fetch --prune --tags "$base_remote" >/dev/null 2>&1
[ "$push_remote" != "$base_remote" ] && git fetch --prune --tags "$push_remote" >/dev/null 2>&1

base_branch="$base_branch_arg"
if [ -z "$base_branch" ]; then
  base_branch="$(git symbolic-ref "refs/remotes/$base_remote/HEAD" 2>/dev/null | sed "s#refs/remotes/$base_remote/##")"
  if [ -z "$base_branch" ]; then
    for candidate in main master; do
      if git rev-parse --verify "$base_remote/$candidate" >/dev/null 2>&1; then
        base_branch="$candidate"
        break
      fi
    done
  fi
fi
[ -z "$base_branch" ] && blockers+=("Could not detect base branch for remote $base_remote.")

if [ -n "$branch" ] && [ -n "$base_branch" ] && [ "$branch" = "$base_branch" ]; then
  blockers+=("Currently on base branch '$base_branch' - create a feature branch before committing/PR.")
fi

merge_base=""
stale_local_base=""
if [ -n "$base_branch" ] && [ -n "$branch" ]; then
  merge_base="$(git merge-base HEAD "$base_remote/$base_branch" 2>/dev/null)"
  [ -z "$merge_base" ] && blockers+=("No merge base between HEAD and $base_remote/$base_branch.")

  # If a local branch named after base_branch exists, warn when it's behind
  # the remote base. A stale local base is how already-merged upstream
  # commits (including review-driven follow-ups) end up re-included or
  # silently dropped during a later rebase.
  if git rev-parse --verify --quiet "refs/heads/$base_branch" >/dev/null; then
    behind_count="$(git rev-list --count "$base_branch..$base_remote/$base_branch" 2>/dev/null)"
    if [ -n "$behind_count" ] && [ "$behind_count" -gt 0 ]; then
      stale_local_base="local $base_branch is $behind_count commit(s) behind $base_remote/$base_branch"
      blockers+=("$stale_local_base - fetch and fast-forward local $base_branch before branching/rebasing.")
    fi
  fi
fi

# Scope-mismatch guard: dirty files sitting on top of a branch that already
# belongs to a different, possibly-merged change are easy to miss and end up
# silently mixed into the wrong PR/MR. Two cheap signals:
# 1. The branch's upstream tracking ref is gone (git's own "already merged
#    and remote branch deleted" marker).
# 2. There are existing commits ahead of the merge-base while the working
#    tree is also dirty - i.e. this branch already has its own history that
#    the dirty files may not belong to.
if [ -n "$branch" ]; then
  tracking_state="$(git for-each-ref --format='%(upstream:track)' "refs/heads/$branch" 2>/dev/null)"
  if [ "$tracking_state" = "[gone]" ]; then
    blockers+=("Branch '$branch' tracks a deleted remote branch (likely already merged) - verify dirty changes belong on a fresh branch instead of this one.")
  fi
fi
if [ -n "$merge_base" ] && [ "$dirty_count" -gt 0 ]; then
  ahead_count="$(git rev-list --count "$merge_base..HEAD" 2>/dev/null || echo 0)"
  if [ "$ahead_count" -gt 0 ]; then
    blockers+=("$ahead_count existing commit(s) already ahead of $base_remote/$base_branch on '$branch' - confirm they belong to the same change as the $dirty_count dirty file(s) before committing (wrong-branch mixups are easy to miss).")
  elif [ -n "$branch" ] && [ -n "$base_branch" ] && [ "$branch" != "$base_branch" ]; then
    dirty_status="$dirty_count dirty file(s) on fresh feature branch; OK to continue to commit-splitting gate."
  else
    blockers+=("$dirty_count dirty file(s) - commit or stash before PR.")
  fi
elif [ "$dirty_count" -gt 0 ]; then
  blockers+=("$dirty_count dirty file(s) - commit or stash before PR.")
fi

forge_url="${remotes[$base_remote]:-}"
forge="unknown"
case "$forge_url" in
  *github.com*) forge="github" ;;
  *gitlab*) forge="gitlab" ;;
esac

forge_auth=""
if [ "$forge" = "github" ] && command -v gh >/dev/null 2>&1; then
  if gh auth status >/dev/null 2>&1; then forge_auth="gh: authenticated"; else forge_auth="gh: NOT authenticated"; blockers+=("github CLI not authenticated."); fi
elif [ "$forge" = "gitlab" ] && command -v glab >/dev/null 2>&1; then
  if glab auth status >/dev/null 2>&1; then forge_auth="glab: authenticated"; else forge_auth="glab: NOT authenticated"; blockers+=("gitlab CLI not authenticated."); fi
fi

existing_pr=""
if [ "$forge" = "github" ] && [ -n "$branch" ] && command -v gh >/dev/null 2>&1; then
  existing_pr="$(gh pr view --json url,state,title -q '"\(.url) (\(.state)) - \(.title)"' 2>/dev/null)"
elif [ "$forge" = "gitlab" ] && [ -n "$branch" ] && command -v glab >/dev/null 2>&1; then
  existing_pr="$(glab mr list --source-branch "$branch" -F json 2>/dev/null | grep -o '"web_url":"[^"]*"' | head -1 | cut -d: -f2- | tr -d '"')"
fi
[ -n "$existing_pr" ] && blockers+=("Existing $forge PR/MR found: $existing_pr")

fork_owner=""
if [ "$push_remote" != "$base_remote" ]; then
  fork_owner="$(printf '%s' "${remotes[$push_remote]}" | sed -E 's#.*[:/]([^/]+)/[^/]+(\.git)?$#\1#')"
fi

base_owner_repo="$(owner_repo_of "${remotes[$base_remote]}")"
push_owner_repo="$(owner_repo_of "${remotes[$push_remote]}")"

echo "repoRoot: $root"
echo "branch: $branch"
echo "dirtyCount: $dirty_count"
[ -n "${dirty_status:-}" ] && echo "dirtyStatus: $dirty_status"
echo "baseRemote: $base_remote"
echo "pushRemote: $push_remote"
echo "baseOwnerRepo: $base_owner_repo"
[ "$push_remote" != "$base_remote" ] && echo "pushOwnerRepo: $push_owner_repo"
[ -n "$fork_owner" ] && echo "forkOwner: $fork_owner"
echo "baseBranch: $base_branch"
echo "mergeBase: $merge_base"
[ -n "$stale_local_base" ] && echo "staleLocalBase: $stale_local_base"
echo "identity: $user_name <$user_email>"
echo "forge: $forge"
[ -n "$forge_auth" ] && echo "forgeAuth: $forge_auth"
[ -n "$existing_pr" ] && echo "existingPr: $existing_pr"
echo ""
if [ "${#blockers[@]}" -eq 0 ]; then
  echo "blockers: none"
else
  echo "blockers:"
  printf '  - %s\n' "${blockers[@]}"
fi
