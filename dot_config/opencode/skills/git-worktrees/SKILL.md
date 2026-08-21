---
name: git-worktrees
description: "Manage Git worktrees with native git worktree commands. Use when working in a Git repository, starting parallel or isolated work, creating, listing, switching, or removing worktrees, or checking for stale worktrees to clean up."
---

# Git Worktrees

Use worktrees often to keep repository tasks isolated and to avoid switching branches in a checkout that may contain other work.

## Layout convention

Standardize on placing worktrees in a dedicated directory outside the main repository, organized by repo and branch:

```text
~/git/worktrees/<repo>/<branch>
```

For example, when working in `~/git/major/dotfiles` on branch `feat/my-feature`, the worktree path is:

```text
~/git/worktrees/dotfiles/feat/my-feature
```

## Common commands

| Command | Purpose |
| --- | --- |
| `git worktree add -b <branch> <path> [base-ref]` | Create a new branch in a new worktree (defaults to `HEAD` as base) |
| `git worktree add <path> <branch>` | Checkout an existing branch in a new worktree |
| `git worktree list` | List all linked worktrees and their checked-out branches |
| `git worktree remove <path>` | Remove a worktree directory and unregister it |
| `git worktree prune` | Clean up stale worktree administrative records |

## Creation workflow

When a task involves creating a worktree, create it and then move this session into the new worktree in the same shell invocation.

Before creating, check the base branch for uncommitted changes (`git status --short`).
A worktree is based on the branch's commit (HEAD), not uncommitted working directory changes.
If the base is dirty, commit or stash first - otherwise the new worktree starts from a stale commit and drifts from the base as those changes land later.

```bash
worktree_dir="$HOME/git/worktrees/<repo>/<branch>"
git worktree add -b <branch> "$worktree_dir" [base-ref]
opencode2 api post /api/session/<session-id>/move --data "{\"directory\":\"$worktree_dir\"}"
```

Do not name the shell variable `path` - in zsh it is the array tied to `$PATH`, and assigning to it clobbers `$PATH` so subsequent commands fail to execute.
Use the current session ID from your environment context for `<session-id>`.

For checking out an existing branch into a new worktree:

```bash
git worktree add "$worktree_dir" <branch>
```

## Cleanup review

Whenever working in a Git repository, inspect `git worktree list` for cleanup candidates before finishing.
Consider a worktree safe to remove only when its working tree is clean, its branch is merged or otherwise confirmed no longer needed, and it is not the current worktree or being used by another active task.
Use `git worktree remove <path>` for confirmed candidates, followed by `git worktree prune` when appropriate.
Never remove a worktree with uncommitted changes, untracked files, an unmerged branch, or uncertain ownership.
Report safe candidates and offer to remove them; do not remove them without the user's confirmation.

If the current session is inside the worktree being removed, move it back to the main worktree first (`opencode2 api post /api/session/<session-id>/move --data '{"directory":"<main-path>"}'`), otherwise later commands run in a deleted directory.

`git worktree remove <path>` removes the worktree directory and unregisters it, but leaves its branch; once a branch is merged, delete it with `git branch -d <branch>`.
