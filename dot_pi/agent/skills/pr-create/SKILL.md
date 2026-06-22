---
name: pr-create
description: >
  Prepare and open a pull request (GitHub) or merge request (GitLab) the safe
  way. Use when the user asks to "make a PR", "open a PR/MR", "raise a pull
  request", or "ship this branch". Runs the project's tests, coverage,
  formatting and linting first; commits with Conventional Commits messages;
  optionally runs a local CodeRabbit review; then creates the PR/MR populated
  from the repository's own PR/MR template.
metadata:
  gates: tests, coverage, format, lint, commit, review, create
---

# pr-create

A pre-flight-then-create workflow. **Never skip a gate to "save time".** If a
gate cannot run (tool absent, no coverage tooling, etc.), say so explicitly and
continue — do not pretend it passed.

## Golden rules

- **Discover, don't assume.** Every project names its commands differently. Read
  the repo's `Makefile`, `AGENTS.md`/`CONTRIBUTING.md`, `package.json` scripts,
  or `Cargo.toml` to find the real test/coverage/lint commands. Prefer a
  `Makefile` target or documented command over a raw tool invocation.
- **Honor toolchain pins.** If `rust-toolchain.toml`, `.nvmrc`, `.tool-versions`,
  etc. pin a version, use it. If a pinned toolchain is broken in this
  environment, report it and fall back to a working one, but flag that CI uses
  the pin.
- **One logical change per PR.** If the working tree mixes unrelated changes,
  stop and ask.
- **Match the repo's existing conventions** for commit subjects, branch names,
  and PR body style. Inspect `git log` and merged PRs first.

## Step 0 — Detect environment

Run the detector and read its report:

```bash
bash scripts/detect.sh
```

It prints `FORGE`, `DEFAULT_BRANCH`, `CURRENT_BRANCH`, `ON_DEFAULT_BRANCH`,
tool availability (`HAS_GH`/`HAS_GLAB`/`HAS_CODERABBIT`), `CODERABBIT_CONFIG`,
the PR/MR template paths, and project command hints (`MAKE_TARGETS`,
`NPM_SCRIPTS`, `PROJECT_FILES`).

Then:

- If `ON_DEFAULT_BRANCH=yes`, **create a feature branch first** (see naming
  below). Never push commits straight to the default branch.
- If `ERROR=not-a-git-repo`, stop.

Branch naming: follow the repo's existing pattern from `git branch -a`. A safe
default is `<type>/<short-slug>` (e.g. `refactor/typed-variant`,
`feat/oauth-login`).

## Steps 1–3 — Gates: tests, coverage, format/lint

`scripts/gates.sh` resolves the project's real commands (Makefile target →
ecosystem default → `unknown`). See the plan, then run each gate:

```bash
bash scripts/gates.sh plan
bash scripts/gates.sh run test
bash scripts/gates.sh run fmt        # then:
bash scripts/gates.sh run lint
```

### Umbrella gate

Some projects define a single composite target (e.g. `make check`) that runs
lint, tests, doc-coverage, and security checks in one shot. The plan output
includes an `umbrella` line when one is detected (`Makefile` `.DEFAULT_GOAL` or a
`check` target). When the umbrella resolves to something other than `unknown`:

1. **Read `AGENTS.md`** (or `CONTRIBUTING.md`) to understand what the umbrella
   includes — it may cover gates beyond the standard four (doc-coverage,
   supply-chain audits, MSRV checks, etc.).
2. **Prefer the umbrella** over running individual gates when it composes all of
   them. Run it once instead of running `test`, `lint`, `fmt`, and `coverage`
   separately.
3. If the umbrella does **not** cover a standard gate (e.g. it skips coverage),
   run the missing gate individually after the umbrella.

```bash
bash scripts/gates.sh run umbrella   # preferred when available
```

### Codecov/patch coverage gate

When the repo has `codecov.yml` or Codecov CI,
run the local Codecov-style patch check before PR creation:

```bash
bash scripts/coverage.sh "$DEFAULT_BRANCH"
```

This runs the resolved coverage generator (usually `make coverage`), parses
`codecov.yml`, and fails if project/patch coverage is below target **or if any
changed coverable line is missing coverage**. That stricter local rule prevents
surprise Codecov comments even when the numeric patch target would technically
pass. If the generator cannot run locally, report that explicitly; otherwise a
failing patch coverage gate blocks the PR.

### Judgment that stays with you

- **All tests must pass.** A flaky/env-dependent test must be named explicitly,
  never blanket-skipped.
- **Coverage:** enforce both test coverage (`codecov.yml` project/patch targets)
  and any separate doc/public-API coverage gate (e.g. fez also requires 100%
  public **doc** coverage via `make docs-coverage`). If a gate resolves to
  `unknown` (no tooling), say so and continue — do not invent one.
- **Extra quality gates:** projects may define gates beyond test/lint/fmt/coverage
  (doc-coverage, supply-chain audits, MSRV verification, etc.). Read `AGENTS.md`
  or `CONTRIBUTING.md` to discover them. An umbrella target often composes these
  automatically; when it doesn't, run them individually.
- **Format before lint** so the commit is clean. Apply formatter fixes, then
  lint at the repo's strictness.
- **Toolchain pins:** if a resolved command fails only because a pinned
  toolchain is broken in this environment, retry with a working one and flag
  that CI uses the pin.

## Step 4 — Commit (Conventional Commits)

Stage the intended change and commit with a [Conventional
Commits](https://www.conventionalcommits.org/) message that matches the repo's
existing style (check `git log --oneline -15` for the prevailing types/scopes).

Format:

```
<type>(<optional-scope>): <imperative subject, ~<=72 chars>

<body: what changed and why; wrap ~72 cols>

<optional footer: BREAKING CHANGE:, Refs #123, Co-authored-by:>
```

Common types: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `build`,
`ci`, `chore`. Use `!` after type/scope or a `BREAKING CHANGE:` footer for
breaking changes.

- Subject in the imperative mood, no trailing period.
- Explain **why** in the body, not just what.
- Do not add tool self-promotion footers unless the repo already uses them.

If a `commit` skill exists in this environment, prefer its conventions.

## Step 5 — Local CodeRabbit review (optional)

Delegate CodeRabbit details to the global `coderabbit` skill instead of
duplicating them here. Load and follow
`~/.pi/agent/skills/coderabbit/SKILL.md` when CodeRabbit is available or the user
asks for it.

Summary for this PR/MR workflow:

- If `HAS_CODERABBIT=yes`, ask whether the user wants a local CodeRabbit review
  before opening or updating the PR/MR, unless they already explicitly asked for
  one.
- When running it, fetch first and compare against the remote default branch:
  `git fetch origin "$DEFAULT_BRANCH" && coderabbit review --agent --base "origin/$DEFAULT_BRANCH" --type committed ...`.
  Do **not** use stale local `main`/`master` as the review base.
- If the user says "just open it" or declines, skip the review without nagging.
- Never run local CodeRabbit more than once per PR/MR.
- If findings need fixes, fix actionable issues and rely on normal
  tests/lint/build afterward instead of rerunning CodeRabbit.
- If `HAS_CODERABBIT=no`, skip this step and note it.

## Step 6 — Push the source branch (upstream-first)

**Default: the source branch lives on the main repo (`origin`), not a fork.**
`scripts/push.sh` encodes the decision — direct push when you have write access,
fork only when you don't (and only with `--allow-fork`, since forking is a side
effect):

```bash
bash scripts/push.sh "$CURRENT_BRANCH"               # upstream-first; fails closed if denied
bash scripts/push.sh "$CURRENT_BRANCH" --allow-fork  # permit fork fallback when origin is read-only
```

It prints `PR_HEAD=` (either `<branch>` or `<user>:<branch>`) and
`SOURCE_REMOTE=`. Use `PR_HEAD` as the `--head` in the next step. Never create a
fork when you already have push rights to `origin`.

## Step 7 — Create the PR / MR

Create using the repo's template. **Fill the template; do not bypass it.**

**Write the PR/MR like a human wrote it, and keep it brief.** Do not mention
"the agent", "the skill", local workflow mechanics, token savings, or internal
implementation process unless directly relevant to reviewers. Prefer concise
bullets over long paragraphs. Include only what a reviewer needs: what changed,
why, risk/compatibility, and how it was tested.

### GitHub (`FORGE=github`, `HAS_GH=yes`)

1. Read the template file from `GITHUB_PR_TEMPLATES`. If several exist, pick the
   one matching the change (e.g. `bug.md` vs `feature.md`) or ask.
2. Fill every section honestly; delete checklist items that do not apply rather
   than leaving them unchecked-and-irrelevant. Keep required checklists.
3. Create with title = the commit subject (or a PR-level summary for multi-commit
   branches):

```bash
gh pr create --base "$DEFAULT_BRANCH" --head "$PR_HEAD" \
  --title "<type(scope): summary>" --body-file <filled-template-file>
```

`$PR_HEAD` comes from `push.sh` (`<branch>` or `<user>:<branch>`). `gh pr
create` targets the upstream (parent) repo by default even from a fork, which is
what we want.

If no template exists, write a brief PR/MR summary with bulleted changes:

```markdown
## Summary
- <change 1>
- <change 2>

## Testing
- <commands or checks run>
```

Keep it short and human-written. Add **Risk** or **Follow-up** only when
reviewers genuinely need it. Avoid long background, local-environment caveats,
and exhaustive implementation details; if a gate could not run locally, mention
it in one short Testing bullet.

### GitLab (`FORGE=gitlab`, `HAS_GLAB=yes`)

1. Read the chosen template from `GITLAB_MR_TEMPLATES` and fill it briefly, in a human voice.
2. Create the MR:

```bash
glab mr create --source-branch "$CURRENT_BRANCH" --target-branch "$DEFAULT_BRANCH" \
  --title "<type(scope): summary>" --description "$(cat <filled-template-file>)"
```

Use `--fill` only as a fallback when no template applies (it autofills title and
description from commits).

### No CLI available

If neither `gh` nor `glab` is present, push the branch and print the forge
"create PR/MR" URL (often in the `git push` output) for the user to open
manually, along with the title and filled body to paste.

## Step 8 — Report back

Summarize to the user: gates run and their results, the CodeRabbit verdict, the
commit(s), and the PR/MR URL. Keep this internal run summary separate from the
PR/MR body; the public PR/MR should stay brief and human-written.

## Failure handling

- A failing gate **blocks** PR creation. Report the failure and stop; fix or ask.
- Never `--force` past protected-branch rules or `--no-verify` past hooks unless
  the user explicitly asks.
