---
name: chezmoi-dotfiles
description: Handle chezmoi-managed dotfiles — diagnose config drift, edit source vs deployed files, apply changes safely, and commit. Use when the user mentions chezmoi, dotfiles, config drift, or needs to edit/apply/commit files in the chezmoi source dir.
---

# chezmoi-dotfiles

Efficient handling of chezmoi-managed dotfiles: diagnosing config drift, editing source vs deployed files, applying changes safely, and committing.

## Contract

- Inputs: a deployed config file to fix, or a chezmoi source file to edit.
- Outputs: source file updated, committed, pushed; deployed file matches via `chezmoi apply` (scoped) or a manual mirrored edit.
- Blocks on: unrelated local drift in the same file, ambiguous which checkout is canonical, or an interactive TTY prompt in a non-interactive shell.

## Repo topology (check first)

chezmoi's source of truth is `chezmoi source-path` (typically `~/.local/share/chezmoi`), not necessarily the repo you'd `cd` into (e.g. `~/git/major/dotfiles`).
These can be two separate clones of the same remote that silently diverge.

```bash
chezmoi source-path                 # canonical source dir
chezmoi git -- remote -v            # Git command in the canonical source dir
```

- Prefer editing inside `chezmoi source-path`.
- If a second clone exists at `~/git/<user>/dotfiles` (or similar), keep them in sync:
  - Edited the second clone? Fetch+ff into source-path first or `chezmoi apply` won't see your change: `chezmoi git -- fetch && chezmoi git -- merge --ff-only origin/main`
  - Pushed from source-path? Fast-forward the other clone: `git -C ~/git/<user>/dotfiles merge --ff-only origin/main`

## Drift, diff, and apply

The most common reason to load this skill: "what's drifted?" or "what did I forget?"

### One-shot drift snapshot

```bash
chezmoi status                                       # what drifted on disk
chezmoi git -- status --short                        # any uncommitted source edits
chezmoi diff ~/path/to/file                          # per-file detail (scoped)
```

`chezmoi status` prints one line per drifted file.
The two-letter codes are NOT git-style — see the table below.

| Code  | First column (actual vs last-written) | Second column (actual vs target — what `apply` will do) |
|-------|---------------------------------------|----------------------------------------------------------|
| ` M`  | Actual file modified on disk          | No change                                                |
| `MM`  | Actual file modified on disk          | Apply will modify the file                               |
| ` D`  | Actual file deleted on disk           | No change (source also no longer wants it)               |
| `DA`  | Actual file deleted on disk           | Apply will create the file (source has it, disk doesn't) |
| `M `  | No change                             | Apply will modify (deployed is older than source)        |
| `A `  | No change                             | Apply will create (source has it, disk never had it)     |
| `D `  | No change                             | Apply will delete (source dropped it, disk still has it) |

**First column = deployed-file drift. Second column = what `chezmoi apply` will change.**
`chezmoi status` does NOT report uncommitted *source* changes — for that, run `chezmoi git -- status --short`.

### Scope diff/apply — avoid TTY hang and noise

`chezmoi diff` / `chezmoi apply` with **no path argument** walks the whole source tree.
This (a) drowns you in unrelated churn (lockfiles, etc.) and (b) hangs in a non-interactive shell when a target file has local drift (`could not open a new TTY: open /dev/tty`).
Always scope to specific paths:

```bash
chezmoi diff  ~/.config/foo/bar.conf     # scoped, non-interactive
chezmoi apply -v ~/.config/foo/bar.conf  # scoped apply
```

Never reach for `--force` to silence the TTY prompt without first reading the diff — it will happily overwrite intentional local drift.
If the diff shows a *pre-existing* local customization unrelated to your change, decide per file: leave it alone, mirror your fix into the deployed file by hand, or ask the user whether the customization should be upstreamed into source.

### Template files (`*.tmpl`)

`chezmoi diff` on a templated file shows the **rendered** source against the deployed file (variables substituted).
To inspect the raw template syntax, read the source file directly: `cat "$(chezmoi source-path ~/path/to/file)"`.
Drift can come from EITHER a template edit OR a template-variable change — `chezmoi diff` won't tell you which.

## Path mapping cheatsheet

```bash
chezmoi source-path <deployed-path>   # deployed -> source file
chezmoi target-path <source-path>     # source -> deployed file (must be a path under chezmoi source-path, not the other git clone)
chezmoi managed | grep <name>         # confirm a path is tracked at all
```

`chezmoi source-path` requires the deployed path with a leading `~/` (e.g. `~/.config/foo/bar`).
A bare relative path like `.config/foo/bar` returns "not managed" even when the file IS managed — chezmoi doesn't auto-expand against `$HOME`.

## Externals (`.chezmoiexternal.toml`)

Tool binaries downloaded by chezmoi are entries in `.chezmoiexternal.toml` in the source dir, keyed by target path (`["bin/<tool>"]`), with `type`, `url`, `path`, `executable`, and `refreshPeriod = "168h"`.
Each entry carries a `# renovate: datasource=... depName=...` comment that Renovate uses to bump the version in the URL.

Key gotchas:

- **Scope externals with `chezmoi apply --include externals`** — a path argument like `chezmoi apply bin/<tool>` fails with `not managed` because externals are not scoped targets.
- A scoped `chezmoi diff ~/bin/<tool>` works and returns nothing when the deployed binary matches the current external URL.
- The binary lands in the deployed target dir (e.g. `~/bin`); the `.codebase-memory/`-style cache or data dirs the tool creates at runtime are NOT managed and live where the tool decides.

## Ignoring churny generated files

Files that change on every tool run (lockfiles: `lazy-lock.json`, `package-lock.json`, `bun.lock`, `node_modules`) should not be chezmoi-managed — they generate constant unrelated diff noise on every real change.
Pattern:

```bash
# in chezmoi source dir
echo '.config/nvim/lazy-lock.json' >> .chezmoiignore
git rm --cached dot_config/nvim/lazy-lock.json
rm dot_config/nvim/lazy-lock.json   # source copy only; deployed file stays on disk untouched
```

## Diagnosing "config X isn't working" issues

Batch the investigation in one shell call rather than iterating:

```bash
grep -rln "<feature>" ~/dotfiles-or-source --include="*.conf" --include="*.tmpl"
grep -n "exec-once\|<feature>" <relevant config files>
which <expected-binaries>          # confirm daemons/tools referenced actually exist
pgrep -a <expected-daemon>
journalctl --user -b --no-pager | grep -i <feature>
```

Common root causes seen in practice: an `exec-once`/autostart entry references a binary that a package rename or fork replaced (e.g. `swww` → `awww`) and the binary silently no longer exists; a GUI helper (waypaper, etc.) doesn't support the new binary as a backend option at all, so check `<tool> --help` for supported backend enum values before assuming a simple rename fixes it; or the deployed file has hand-edited drift from the `.tmpl` source (a previous manual fix that was never round-tripped through chezmoi), which a scoped `chezmoi diff` on that path reveals immediately.

## Commit workflow

Same as the general `commit` skill, plus the chezmoi sync.
Detect a second clone first so the post-push fast-forward isn't a surprise:

```bash
ls -d ~/git/*/dotfiles           # detect second clones upfront
chezmoi git -- add <paths>
chezmoi git -- commit -S -s -m "type(scope): summary"
chezmoi git -- push origin main
# then fast-forward the other clone, if any (see Repo topology)
chezmoi apply -v <scoped deployed path>   # verify deployed state matches
```

`chezmoi git` runs Git in the canonical source directory, so prefer it over `git -C "$(chezmoi source-path)"`.

## Verification

- `chezmoi diff <scoped path>` shows no output after apply (clean).
- `grep` the deployed file for the expected line/value.
- For daemons/services: confirm the process is actually running (`pgrep -a <daemon>`) and functioning (tool-specific restore/status command), not just that the config text changed.
