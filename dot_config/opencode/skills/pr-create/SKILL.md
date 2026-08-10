---
name: pr-create
description: Prepare and open a GitHub PR or GitLab MR end to end. Use when the user asks to create a PR/MR, open a pull/merge request, or "ship this change". Runs tests/lint/coverage, a manual over-engineering/scope pass, splits commits, writes a human-sounding description from project templates, and opens the PR/MR.
---

# PR / MR Create

Ordered pipeline. Each phase has a gate: do not advance until the current gate
passes. Stop and ask the user only when a gate genuinely blocks (failing tests
you can't fix, ambiguous template, no remote).

**Scope**: the `scripts/*.sh` helpers below (`repo-preflight.sh`,
`gh-checks-summary.sh`, `glab-checks-summary.sh`) exist to serve this skill.
Run them only while this skill is actively executing (or on an explicit user
request to open/inspect a PR/MR). For ordinary test/lint/build runs, diff
inspection, or CI checks outside of an active PR-creation flow, use `bash`
directly instead. All paths below are relative to this skill's directory.

## Preflight (cheap, always)

- Run `bash scripts/repo-preflight.sh [baseRemote] [baseBranch]` to collect all
  preflight facts in one call: branch, dirty files, remotes, base, identity,
  forge CLI auth status, existing PR, and a blockers list — without dumping
  raw command output.
- Resolve every listed blocker before proceeding: detached HEAD, wrong identity,
  unauthenticated CLI, existing PR, stale local base branch, dirty files on the
  base branch, or dirty files mixed with existing branch commits. Dirty files on
  a fresh feature branch are allowed to proceed to Phase 4, where they must be
  committed or intentionally removed before opening the PR/MR.
- If `repo-preflight.sh` reports `staleLocalBase` (local `main`/base branch is
  behind `<remote>/<base>`), fetch and fast-forward the local base branch
  before branching or rebasing. A stale local base is how already-merged
  upstream commits — including review-driven follow-ups made after a prior
  PR touching the same files was merged — get silently re-included or
  dropped later. Don't rebase onto a stale local base "just to save a fetch."
- Check repo rules for PR title / ticket requirements:
  - `.github/pr-title-checker-config.json`
  - PR/MR templates
  - `AGENTS.md`
- If a ticket key is required and the branch/commit/title lacks one, stop and ask
  whether to create/use a ticket before committing or opening the PR.
- Detect Jira issue keys (e.g. ``RSPEED-1234``) from the branch name and commit
  messages for Phase 8 linking.
- Verify identity matches the repo location (`~/git/major` personal,
  `~/git/redhat` work). Wrong identity → stop and ask.
- Default base branch is `main`. Confirm via remote HEAD; if the repo uses a
  different default, use the remote default only after verifying it.
- When push remote ≠ base remote (fork workflow), `repo-preflight.sh` prints
  `forkOwner` — use it for Phase 8's `--head <fork-owner>:<branch>`.
- `repo-preflight.sh` also prints `baseOwnerRepo` (and `pushOwnerRepo` when it
  differs). Use `baseOwnerRepo` verbatim for `gh pr create --repo` if the
  target repo is ever ambiguous — don't guess it from directory/remote names.
- Fork detection doesn't rely on remote *names* (a fork remote need not be
  called `origin` or `upstream`): for GitHub repos, `repo-preflight.sh` probes
  each remote via `gh api repos/<owner>/<repo> --jq .fork` to find the real
  non-fork upstream, and matches the authenticated `gh` user's login against
  remote owners to pick the push remote. For GitLab repos (matched by
  `gitlab` appearing anywhere in the remote URL, not just `gitlab.com` —
  covers self-hosted instances) it does the GitLab-native equivalent: `glab
  api projects/<owner>%2F<repo>` piped through `jq 'has("forked_from_project")'`
  to find the upstream, and matches `glab api user | jq -r .username` against
  remote owners to pick the push remote (`glab api` has no `--jq`, hence the
  `jq` pipe). Pass `baseRemote` explicitly only to override this (e.g.
  multiple non-fork remotes, or a forge neither tool covers).
- Never push to or open a PR against the wrong base.
- `repo-preflight.sh` also flags a **branch scope mismatch**: if the current
  branch's upstream tracking is `[gone]` (git's marker for "already merged,
  remote branch deleted") or the branch already has commits ahead of the
  merge-base while the working tree is dirty, it's listed as a blocker. This
  catches dirty changes accidentally sitting on top of an unrelated, already
  landed branch. Resolve by branching fresh off `<base-remote>/<base-branch>`
  and moving the dirty files there (`git stash push -u -- <paths>`, `git
  checkout -b <new-branch> <base-remote>/<base-branch>`, `git stash pop`)
  before continuing.

## Phase 1 — Tests, lint, checks

- Discover the project's own commands; do not invent them:
  - `Makefile`/`Justfile`/`Taskfile.yml` → `make`/`just`/`task` targets
    (`test`, `lint`, `check`, `ci`).
  - Node: `package.json` `scripts`; use the runner from the lockfile
    (`npm`/`pnpm`/`yarn`/`bun`).
  - Python: `pyproject.toml`/`tox.ini`/`noxfile.py` → `pytest`, `ruff`,
    `mypy`, `tox`, `nox` (respect `uv`/`hatch`/`poetry`). When CI uses
    `uv sync --locked --all-extras --dev`, run that before pytest/ruff in fresh
    worktrees so pytest plugins from extras/dev are installed.
  - Go: `go test ./...`, `go vet ./...`, `golangci-lint run`.
  - Rust: `cargo test`, `cargo clippy`, `cargo fmt --check`.
  - `.pre-commit-config.yaml` → `pre-commit run --all-files`.
  - CI is the source of truth: mirror `.github/workflows/*.yml` /
    `.gitlab-ci.yml`.
- **Never stream full test/lint/check output into context.** Redirect to a log
  and read only the tail:

  ```bash
  log="$(mktemp --tmpdir=/tmp/opencode pr-gate.XXXXXX.log)"
  make check > "$log" 2>&1; code=$?
  echo "exit: $code"; tail -n 60 "$log"
  ```

  Adjust the command to the project's actual gate (`make check`, `npm run
  ci`, `cargo test && cargo clippy -- -D warnings && cargo fmt --check`,
  etc.). Keep `$log` around for re-inspection (`grep`/`sed` on it) instead of
  re-running the command.
- Validation order:
  - **Baseline** (new worktrees): `make test` or the project's fastest baseline.
  - **During implementation**: focused tests only.
  - **Before commit**: one full gate run via the pattern above.
  - **After review fixes**: focused tests for the fix plus one full gate run.
- Run the smallest set covering the change. Fix every failure at root cause,
  not symptom. Re-run until green.
- If an aggregate check command (e.g. `make verify`) fails on a pre-existing
  issue unrelated to the current change, do not treat the run as "good enough."
  The failure may have aborted before later checkers ran. Run each checker
  independently on changed files to confirm none are broken:
  e.g. `uv run pyright <changed-files>`, `uv run pylint <changed-files>`,
  `uv run ruff check <changed-files>`. The gate is that every individual
  checker passes on the changed files, not that the aggregate command's
  pre-existing failure is explainable.
- Gate: all checks pass.
- If checks require a remote PR/MR, open as draft only after Phases 1–7 are as
  complete as possible locally.

## Phase 2 — Coverage

- Find patch/project coverage tooling: `.coveragerc`,
  `pyproject.toml [tool.coverage]`, `codecov.yml`/`.codecov.yml` (patch +
  project targets), jest `coverageThreshold`, `cargo-llvm-cov`, `go -cover`.
- Run the project's coverage command (same log-and-tail pattern as Phase 1),
  then grep for the overall line and for changed files by name:

  ```bash
  log="$(mktemp --tmpdir=/tmp/opencode pr-coverage.XXXXXX.log)"
  <coverage-command> > "$log" 2>&1
  grep -E -i 'TOTAL|coverage summary' "$log"
  grep -F -f <(git diff --name-only <base>...HEAD | xargs -n1 basename) "$log"
  ```
- Add the minimum meaningful tests for lines *your* change touched. Don't chase
  unrelated coverage, and don't add new coverage infrastructure just for the PR.
- Gate: existing coverage tooling covers changed logic, or a one-line note says
  why no local coverage gate exists.

## Phase 3 — Learn project style

- Templates (a template overrides defaults; first match wins):
  - GitHub: `.github/pull_request_template.md`,
    `.github/PULL_REQUEST_TEMPLATE.md`, `.github/PULL_REQUEST_TEMPLATE/*.md`,
    `docs/pull_request_template.md`, repo-root `pull_request_template.md`.
  - GitLab: `.gitlab/merge_request_templates/*.md` (use `Default.md`).
- **No template file ≠ no convention.** Projects often maintain a *de-facto*
  MR/PR body shape — `## Summary` / `## Test plan` / `## Checklist` and the
  like — without a checked-in template. When no template file is found, still
  inspect 2-3 recent merged MR/PR **bodies** (not just titles) before
  drafting, and mirror any repeated structural headers. This is how the
  convention gets propagated; skipping this step is how agents end up with
  prose-shaped descriptions in projects that expect structured ones.
  - GitHub: `gh pr list --state merged --limit 5 --json title,body` returns
    both fields in one call. For more or older examples, fetch a specific
    PR with `gh pr view <num> --json body`.
  - GitLab: `glab mr list` has no `--state` flag and no `--json body`
    projection as of this writing. Use `glab mr list --all --per-page 5`
    (or `--closed`) to discover recent iids, then `glab mr view <iid>` on
    each to read its body. Skip bot-driven MRs the same way you would for
    GitHub.
- History — match tone, scope prefixes, casing, section headers:
  - `git log --oneline -20`
  - For PR/MR titles: `gh pr list --state merged --limit 10 --json title`
    (GitHub) and `glab mr list --all --per-page 10` (GitLab, since
    `glab mr list` defaults to open MRs and has no `--state` flag).
  - For PR/MR bodies, see the "No template file ≠ no convention" block above
    (titles alone miss structural conventions like `## Summary` headers).
- Default to Conventional Commits unless the project clearly does otherwise.

## Phase 4 — Split into commits

- Group the diff into small, reviewer-friendly logical commits (refactor vs
  feature vs test vs docs separated).
- Use `git diff --stat <base>...HEAD` first to inspect the diff structure,
  then `git diff --unified=3 <base>...HEAD -- <path>` for focused hunks on
  files needing closer inspection. Don't dump the whole diff into context.
- Load and follow the `commit` skill; do not
  restate or override its policy here.
- **If rebasing onto `<base-remote>/<base>` moved or dropped any local
  commits** (conflicts, `git rebase --skip`, or a commit that turned out to
  already be merged upstream): before continuing, check whether the file(s)
  your change touches were modified by other commits merged upstream since
  your branch was created — `git log --oneline <old-merge-base>..<base-remote>/<base>
  -- <path>` — and diff the pre- and post-rebase version of those files
  (`git diff <old-commit> <new-equivalent-commit> -- <path>`). Fold in any
  review-driven changes (e.g. stricter error handling added during a prior
  PR's review) that your rebase would otherwise silently discard, rather than
  reintroducing the pre-review behavior.
- Gate: history reads as a clean story; no "wip"/"fix typo" noise.

## Phase 5 — Scope review

- Do a manual pass over the committed diff (`git diff <base-remote>/<base>...HEAD`)
  for over-engineering, speculative abstractions, and unnecessary scope.
- Cut what it flags. Re-run Phase 1 checks if you changed code.
- Gate: no unaddressed over-engineering findings.

## Phase 6 — CodeRabbit

- Load the `coderabbit` skill and follow it. It decides whether to run, runs
  exactly once, and tells you what to do with the findings.
- Gate: per the `coderabbit` skill — review completed, skipped by its rules, or
  actionable findings resolved.

## Phase 7 — Write description

- Title: brief, human, Conventional-Commit-style unless template/history says
  otherwise. No AI tells, no filler.
- Body: fill the project template if present; else a short "what + why",
  optional bullets, test notes. Sound like a tired human, not a press release.
- **No hard wrapping**: write each paragraph as a single long line. Do not
  insert line breaks inside paragraphs — let GitHub's markdown renderer handle
  text wrapping. Only use newlines to separate paragraphs, list items, code
  blocks, headings, and other markdown structural elements.
- Write to a temp file under the approved scratch directory:
  `tmp="$(mktemp --tmpdir=/tmp/opencode pr-create.XXXXXX.md)"`. Clean it up
  with `rm -f "$tmp"` after the MR/PR is created. Don't use a shell trap — in
  agent environments each command runs in a separate shell, so the trap fires
  before the file is consumed.
- **Pre-flight check for accidental hard wraps**: before building the PR/MR,
  scan `$tmp` for lines inside a paragraph/bullet that were manually wrapped
  (a common mistake when drafting prose the same way as code comments, i.e.
  wrapping at ~80 chars). A quick heuristic:
  `awk '/^($|#|-|\*|[0-9]+\.|```)/{next} length($0)>0 && length($0)<70{print NR": "$0}' "$tmp"`
  — any hit is a candidate line that should be a continuation of the previous
  line, not a new one. If found, rewrite the body so each paragraph/bullet is
  a single unbroken line (however long) and re-run the check.
- Build the PR/MR from that file.

## Phase 8 — Open it

```bash
git push -u <push-remote> "$(git branch --show-current)"

# GitHub (add --draft / --reviewer / --label as the project expects)
# When push remote differs from base remote (fork workflow), --head must include
# the fork owner: --head <fork-owner>:<branch>. Use forkOwner from repo-preflight.sh.
gh pr create --base <base> --head "<fork-owner>:<branch>" \
  --title "<title>" --body-file "$tmp"
# If push remote == base remote (no fork), --head is just the branch name:
gh pr create --base <base> --head "$(git branch --show-current)" \
  --title "<title>" --body-file "$tmp"

# GitLab: glab mr create has no --description-file flag (checked as of this
# writing) - don't try it first and eat an "Unknown flag" round trip. Use
# --description with command substitution directly.
# Fork workflow: push to your fork remote, then pass --repo <base-owner/repo>
# so the MR targets upstream instead of your fork.
glab mr create \
  --target-branch <base> --source-branch "$(git branch --show-current)" \
  --title "<title>" --description "$(cat "$tmp")" --remove-source-branch \
  --repo <base-owner/repo>
```

If an existing PR/MR was found (from `repo-preflight.sh`), update/report it
instead of creating a duplicate. Print the URL `gh`/`glab` returns.

### CI check (immediately after opening)

**GitHub:**

- Run `bash scripts/gh-checks-summary.sh <pr> [timeoutSeconds]` to poll CI
  once and print a compact final table. It relies on `gh pr checks`'s own
  exit codes (0 passed, 1 failed, 8 pending) and polls quietly in a loop.
  **Never use `gh pr checks --watch`** — it's a full-screen TUI command, not
  scriptable output, and `gh` refuses to combine it with `--json`.
- **Match the bash tool's own `timeout` parameter to `timeoutSeconds`**: the
  script's internal poll loop only controls how long *it* waits, not how long
  the calling tool call is allowed to run. If the bash tool call's own timeout
  (default 120000ms) is shorter than `timeoutSeconds`, the call gets killed
  mid-poll before the script can print its summary. Pass
  `timeout: (timeoutSeconds + 15) * 1000` (buffer for `gh` overhead) on the
  bash tool call whenever `timeoutSeconds` exceeds ~100s. If a call times out
  anyway, just re-run `gh pr checks <pr>` directly (cheap, one-shot, no loop)
  instead of re-invoking the script.
- If timeout elapses with pending checks, report pending check names and URLs
  from the script's final table.

**GitLab:**

- `glab ci status` is branch-scoped and 404s for MRs opened from a fork (the
  pipeline runs against the fork project, not the base). Run `bash
  scripts/glab-checks-summary.sh <mrIid> <projectPath> [timeoutSeconds]`
  instead — it hits the MR-pipelines API
  (`glab api projects/<path>/merge_requests/<iid>/pipelines`) directly, which
  returns the pipeline regardless of which project it ran in. `<projectPath>`
  is the *source* project (e.g. `pushOwnerRepo` from `repo-preflight.sh`, or
  `baseOwnerRepo` if there's no fork).
- Same bash-tool `timeout` matching rule as the GitHub script applies.
- Exit codes mirror the GitHub script: 0 passed, 1 failed, 8 pending/timeout.

## Phase 9 — Report + self-reflection

Keep the final report tight:

- PR URL
- Local gates summary with pass/fail and log paths
- Remote checks summary (from `gh-checks-summary.sh` or `glab-checks-summary.sh`)
- CodeRabbit status (per the `coderabbit` skill)
- Any skipped gates and reason
- Anything learned (flaky tests, template quirks, style rules)
- A short bulleted list of concrete improvements to **this skill** based on
  what was friction this run. (Per AGENTS.md: suggest, don't auto-edit.)

## Hard rules

- **Scope the PR-workflow scripts**: `scripts/repo-preflight.sh`,
  `scripts/gh-checks-summary.sh`, `scripts/glab-checks-summary.sh` exist to
  serve this skill. Do not reach for them during routine implementation,
  debugging, or status checks outside of an active PR-creation flow — use
  `bash` directly for that.
- Never invent project commands — discover them.
- Default base branch is `main`; use a different remote default only after
  verifying the repo requires it.
- Temp description file must be cleaned up manually after PR/MR creation
  (``rm -f "$tmp"``). Phase 7 explains why shell traps don't work in agent
  environments.
- **Compact output**: For long-running commands, redirect full output to a log
  file (`mktemp --tmpdir=/tmp/opencode`) and read only the tail plus grep
  matches. Do not stream full successful test, coverage, or CI-watch output
  into the conversation.
- **Avoid large diff dumps**: First use `git diff --stat` / `git diff
  --name-only`. Read focused hunks only for files with suspected issues. Do
  not dump whole diffs unless the diff is tiny (under ~50 lines).
- **Script-first for multi-step/parsing logic**: use
  `scripts/repo-preflight.sh`, `scripts/gh-checks-summary.sh`,
  `scripts/glab-checks-summary.sh` — they
  consolidate multi-command sequences or output parsing that's error-prone to
  redo inline each run. For simple gates (tests, lint, coverage, diffs), use
  the documented `bash` patterns above directly.
- Don't open the PR/MR until phases 1–7 gates pass or a draft is explicitly
  needed for remote-only checks.
