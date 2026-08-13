---
name: git-worktrees
description: "Manage Git worktrees with the wt tool (primary) or raw git worktree (fallback). Use when working in a Git repository, starting parallel or isolated work, creating/listing/switching/removing worktrees, or checking for stale worktrees to clean up. Also use for wt commands (wt create, co, cd, ls, rm, pr, mr, status, cleanup)."
---

# Git Worktrees

Use worktrees often to keep repository tasks isolated and to avoid switching branches in a checkout that may contain other work.

## Primary interface: wt

wt is a fast Go wrapper around `git worktree` that gives each branch its own directory.
Prefer it over raw `git worktree` for creating, listing, switching, and removing worktrees.
Fall back to raw `git worktree` only when wt is unavailable or unsuitable (e.g. non-wt-managed repos, one-off scripting).

### Our layout

We use the `global` strategy with `root = "~/git/worktrees"`, configured in `~/.config/wt/config.toml` (chezmoi-managed).
Every repo gets a subdirectory, so worktrees land at:

```text
~/git/worktrees/<repo>/<branch>
```

### Commands

| Command | Purpose |
| --- | --- |
| `wt create <branch> [base]` | Create a new branch in a worktree (defaults to main/master as base) |
| `wt co <branch>` | Checkout an existing branch in a new worktree |
| `wt co` | Interactive: fuzzy-search from available branches |
| `wt cd <branch>` | Switch to an existing worktree (alias `wt sw`); never creates one |
| `wt ls` | List all worktrees |
| `wt rm <branch>` | Remove a worktree |
| `wt pr [number\|url]` | Checkout a GitHub PR (requires `gh` CLI) |
| `wt mr [number\|url]` | Checkout a GitLab MR (requires `glab` CLI) |
| `wt status` | Color-coded overview of all worktrees |
| `wt status --ci` | Include CI/CD pipeline status per branch |
| `wt info` | Show active strategy, pattern, variables |
| `wt config show` | Show effective config with sources |
| `wt cleanup --stale` | Detect stale worktrees (deleted remotes, inactive commits) |
| `wt prune` | Clean up stale worktree admin files |
| `wt migrate` | Migrate worktrees to match configured paths |

Always pass explicit arguments in non-interactive/agent contexts (`wt co <branch>`, not bare `wt co`).

### Creation workflow

When a task involves creating a worktree, create it and then move this session into the new worktree in the same shell invocation.

Before creating, check the base branch for uncommitted changes (`git status --short`).
A worktree is based on the branch's HEAD, not its working tree, so uncommitted changes stay behind in the base checkout.
If the base is dirty, commit or stash first — otherwise the new worktree starts from a stale commit and drifts from the base as those changes land later.

```bash
wt_path="$(wt create feat/my-feature --format json | jq -r '.data.path')"
opencode2 api post /api/session/<session-id>/move --data "{\"directory\":\"$wt_path\"}"
```

The JSON output carries the exact path in `.data.path`; read it manually if `jq` is unavailable.
Do not name the shell variable `path` — in zsh it is the array tied to `$PATH`, and assigning it clobbers `$PATH` so the next command is no longer found.
Use the current session ID from your environment context for `<session-id>`.
`wt --format json` disables shell auto-navigation, which is what we want here.

For an existing branch or PR/MR, the same pattern works with `wt co`, `wt pr`, and `wt mr`.

### Configuration

- Config file: `~/.config/wt/config.toml` (or `WT_CONFIG` / `--config`)
- Per-repo override: `.wt.toml` in the repo root
- Key settings: `root`, `strategy`, `pattern`, `separator`
- Env overrides: `WORKTREE_ROOT`, `WORKTREE_STRATEGY`, `WORKTREE_PATTERN`, `WORKTREE_SEPARATOR`

Layout strategies (we standardize on `global`):

| Strategy | Layout |
| --- | --- |
| `global` | `{.worktreeRoot}/{.repo.Name}/{.branch}` |
| `sibling-repo` | `{.repo.Main}/../{.repo.Name}-{.branch}` |
| `parent-branches` | `{.repo.Main}/../{.branch}` |
| `parent-worktrees` | `{.repo.Main}/../{.repo.Name}.worktrees/{.branch}` |
| `inside-dotdir` | `{.repo.Main}/.worktrees/{.branch}` |

### Hooks

wt supports pre/post hooks for `create`, `checkout`, `remove`, `pr`, and `mr` in `~/.config/wt/config.toml` or a per-repo `.wt.toml`.
Hook environment variables: `WT_PATH`, `WT_BRANCH`, `WT_MAIN`, `WT_REPO_NAME`, `WT_REPO_HOST`, `WT_REPO_OWNER`.
Disable all hooks with `WT_HOOKS_DISABLED=1`.

```toml
[hooks]
# Copy .env from the main worktree to new worktrees
post_create = ["test -f $WT_MAIN/.env && cp $WT_MAIN/.env $WT_PATH/.env || true"]
post_checkout = ["test -f $WT_MAIN/.env && cp $WT_MAIN/.env $WT_PATH/.env || true"]

# Auto-install dependencies
post_checkout = ["cd $WT_PATH && uv sync"]

# Clean up before removing a worktree
pre_remove = ["cd $WT_PATH && npm run clean"]
```

### JSON output

Most commands support `--format json` for machine-readable output, useful when scripting across repositories:

```bash
wt --format json list
wt --format json info
wt --format json config show
```

## Raw git worktree (fallback)

```bash
git worktree add -b <branch-name> <path> <base-ref>
git worktree list
git worktree remove <path>
git worktree prune
```

## Cleanup review

Whenever working in a Git repository, inspect `wt ls` (or `git worktree list`) for cleanup candidates before finishing.
Consider a worktree safe to remove only when its working tree is clean, its branch is merged or otherwise confirmed no longer needed, and it is not the current worktree or being used by another active task.
Use `wt rm <branch>` (or `git worktree remove <path>`) for confirmed candidates, followed by `wt prune` when appropriate.
`wt cleanup --stale` detects worktrees whose remote branch was deleted or whose commits are inactive; review its output before removing.
Never remove a worktree with uncommitted changes, untracked files, an unmerged branch, or uncertain ownership.
Report safe candidates and offer to remove them; do not remove them without the user's confirmation.

If the current session is inside the worktree being removed, move it back to the main worktree first (`opencode2 api post /api/session/<session-id>/move --data '{"directory":"<main-path>"}'`), otherwise later commands run in a deleted directory.

`wt rm` removes the worktree but leaves its branch; once a branch is merged, delete it with `git branch -d <branch>`.
