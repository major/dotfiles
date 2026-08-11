---
name: git-worktrees
description: Manage Git worktrees for repository tasks. Use when working in a Git repository, especially when starting parallel, isolated, or non-trivial work, and when checking for stale worktrees to clean up.
---

# Git Worktrees

Use Git worktrees often to keep repository tasks isolated and to avoid switching branches in a checkout that may contain other work.

## Worktree location

Create worktrees under:

```text
~/git/worktrees/<repo_name>-<brief_slug_about_worktree_topic>
```

Use the repository's actual name for `<repo_name>` and a short lowercase hyphen-separated slug for the topic.
Inspect existing worktrees with `git worktree list` before creating one, and do not reuse a path belonging to another worktree.

## Workflow

- Prefer a dedicated worktree for non-trivial changes, parallel work, or tasks that may require branch switching.
- Keep the user's existing checkout untouched when a worktree is appropriate.
- Run Git commands from the worktree that owns the target branch.
- Before committing, check `git worktree list` to ensure the target branch is not checked out elsewhere.
- Do not create a worktree merely for a tiny, single-file change when the current checkout is clearly available for it.

Typical creation:

```bash
repo_name=$(basename "$(git rev-parse --show-toplevel)")
git worktree add -b <branch-name> "$HOME/git/worktrees/${repo_name}-<brief-slug>" <base-ref>
```

## Cleanup review

Whenever working in a Git repository, inspect `git worktree list` for cleanup candidates before finishing.
Consider a worktree safe to remove only when its working tree is clean, its branch is merged or otherwise confirmed no longer needed, and it is not the current worktree or being used by another active task.
Use `git worktree remove <path>` for confirmed candidates, followed by `git worktree prune` when appropriate.
Never remove a worktree with uncommitted changes, untracked files, an unmerged branch, or uncertain ownership.
Report safe candidates and offer to remove them; do not remove them without the user's confirmation.
