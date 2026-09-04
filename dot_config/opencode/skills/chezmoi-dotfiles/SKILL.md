---
name: chezmoi-dotfiles
description: Handle chezmoi-managed dotfiles — diagnose config drift, edit source vs deployed files, apply changes safely, and commit. Use when the user mentions chezmoi, dotfiles, config drift, or needs to edit/apply/commit files in the chezmoi source dir.
---

# chezmoi-dotfiles

Efficient handling of chezmoi-managed dotfiles: diagnosing config drift, editing source vs deployed files, applying changes safely, and committing.

## Contract

- Inputs: a deployed config file in active use, or a chezmoi source file to edit.
- Outputs: the live configuration is captured in source, committed, and pushed.
- Default: treat the deployed configuration in active use as canonical and presume its drift has not yet been committed to chezmoi.
- Blocks on: a request to restore the stored source, a generated file, a template whose source syntax must be preserved, or an interactive TTY prompt in a non-interactive shell.

## Repo topology (check first)

`chezmoi source-path` (typically `~/.local/share/chezmoi`) is the repository to update and commit.
It is not presumed to be the current configuration when it differs from a deployed file in active use.

```bash
chezmoi source-path                 # canonical source dir
chezmoi git -- remote -v            # Git command in the canonical source dir
```

- Prefer editing inside `chezmoi source-path`.

## Drift, diff, and apply

The most common reason to load this skill: "what's drifted?" or "what did I forget?"

### One-shot drift snapshot

```bash
chezmoi status                                       # what drifted on disk
chezmoi git -- status --short                        # any uncommitted source edits
chezmoi diff --reverse ~/path/to/file                # deployed changes to capture (scoped)
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

`chezmoi diff` is an apply preview, not a conventional source-to-deployed diff.
Its `-` lines are the current deployed file content that apply would remove, and its `+` lines are the rendered chezmoi target content that apply would add.
Use `chezmoi diff --reverse` when reviewing deployed configuration to capture.
In the reverse diff, `-` lines are the stored chezmoi target and `+` lines are the live deployed content.

### Canonicality policy

When a deployed file in active use differs from its chezmoi target, preserve the deployed version by default.
Read a scoped reverse diff and retain its `+` lines as the deployed canonical configuration.
Then capture the deployed file with `chezmoi add ~/path/to/file`.
Do not run `chezmoi apply` on that file unless the user explicitly wants to restore the stored source.

Source-only edits are a separate pending decision.
They do not override the deployed configuration without an explicit request.

For a template, preserve the deployed rendered result but inspect the raw source and relevant template variables before replacing the template with `chezmoi add`.

### Scope diff, capture, and deliberate apply — avoid TTY hang and noise

`chezmoi diff` / `chezmoi apply` with **no path argument** walks the whole source tree.
This (a) drowns you in unrelated churn (lockfiles, etc.) and (b) hangs in a non-interactive shell when a target file has local drift (`could not open a new TTY: open /dev/tty`).
Always scope to specific paths:

```bash
chezmoi diff --reverse ~/.config/foo/bar.conf # deployed changes to capture
chezmoi add ~/.config/foo/bar.conf        # capture the deployed canonical config
chezmoi apply -v ~/.config/foo/bar.conf  # only to deliberately restore source
```

Never reach for `--force` to silence the TTY prompt without first reading the diff — it will happily overwrite the deployed canonical configuration.
Treat a scoped diff as a capture candidate unless the user identifies the deployed change as obsolete or generated.

### Template files (`*.tmpl`)

`chezmoi diff --reverse` on a templated file shows the change from the **rendered** target to the deployed file (variables substituted).
To inspect the raw template syntax, read the source file directly: `cat "$(chezmoi source-path ~/path/to/file)"`.
Drift can come from EITHER a template edit OR a template-variable change — `chezmoi diff` won't tell you which.

## Path mapping cheatsheet

```bash
chezmoi source-path <deployed-path>   # deployed -> source file
chezmoi target-path <source-path>     # source -> deployed file (must be a path under chezmoi source-path)
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

Capture deployed changes before committing.

```bash
chezmoi add ~/path/to/deployed-file
chezmoi git -- add <source paths>
chezmoi git -- commit -S -s -m "type(scope): summary"
chezmoi git -- push origin main
```

`chezmoi git` runs Git in the canonical source directory, so prefer it over `git -C "$(chezmoi source-path)"`.

## Verification

- `chezmoi diff <scoped path>` shows no output after capture (clean).
- `grep` the deployed file for the expected line/value.
- For daemons/services: confirm the process is actually running (`pgrep -a <daemon>`) and functioning (tool-specific restore/status command), not just that the config text changed.
