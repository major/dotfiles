---
name: pr-create
description: Prepare and open a GitHub PR or GitLab MR. Use when asked to create a PR/MR, open a pull/merge request, or ship a change.
---

# PR/MR Create

Follow these gates in order. Do not open a PR/MR until Phases 1 to 7 pass, unless a draft is required for a remote-only check.
Use project commands and templates; stop only for a genuine blocker that needs the user's decision.
The helper scripts in this skill's `scripts/` directory are for active PR/MR creation, not routine development or checks.

## Preflight

- Run `bash scripts/repo-preflight.sh [baseRemote] [baseBranch]` and retain `pushRemote`, `baseRemote`, `baseBranch`, `forkOwner`, and `baseOwnerRepo` from its output.
- Resolve all blockers: detached HEAD, wrong identity, missing CLI authentication, dirty changes on the base branch, or dirty changes mixed with existing branch commits.
- If it reports `staleLocalBase`, fetch and fast-forward the local base branch before branching or rebasing.
- If it reports a branch scope mismatch, create a fresh branch from `<baseRemote>/<baseBranch>` and move the intended dirty files there safely.
- Dirty files on a fresh feature branch may proceed to Phase 4, where they must be committed or intentionally removed.
- Check `AGENTS.md`, title rules, and PR/MR templates for ticket requirements. Ask the user if a required ticket is missing.
- Verify the configured identity is appropriate for the repository and confirm the default branch from remote HEAD; default to `main` only when verified.
- Note an existing PR/MR for update rather than creating a duplicate. Never push to or target the wrong repository.

## Phase 1: Project checks

- Discover and run the project's CI/check command from its task files and CI configuration. Do not invent commands.
- Save full output in the approved scratch directory and inspect only the exit code and tail:

  ```bash
  log="$(mktemp --tmpdir=/home/major/.cache/opencode-tmp/opencode pr-gate.XXXXXX.log)"
  <project-check-command> >"$log" 2>&1; code=$?
  printf 'exit: %s\n' "$code"; tail -n 60 "$log"
  ```

- Fix failures and rerun the gate. If an aggregate gate fails before remaining checkers run, run those checkers independently on changed files.
- Gate: all applicable project checks pass.

## Phase 2: Coverage

- Find and run existing project coverage tooling, saving output to the approved scratch directory and inspecting its summary and changed-file results.
- Add the minimum meaningful tests for changed behavior. Do not add coverage infrastructure or chase unrelated coverage.
- Gate: changed logic is covered by existing tooling, or note briefly why no local coverage gate exists.

## Phase 3: Project conventions

- Use the applicable repository PR/MR template when present.
- Without a template, inspect recent merged examples and commit history for title, tone, and body conventions:
  - GitHub: `gh pr list --state merged --limit 5 --json title,body`
  - GitLab: `glab mr list --merged --per-page 5 --output json`
  - Both: `git log --oneline -20`

## Phase 4: Branch and commits

- Review `git diff --stat <baseRemote>/<baseBranch>...HEAD` and `git diff --name-only` first; inspect focused paths, not a large full diff.
- Load and follow the `commit` skill. Commits must be cryptographically signed and signed off.
- For a new stacked branch, use `git-spice branch create --no-commit <branch>`, then commit with the commit skill.
- Inspect stack state with `git-spice log short`; after changing a branch under others, run `git-spice upstack restack`.
- After rebasing, verify no intended changes were dropped. If commits were skipped or moved, compare affected paths against upstream changes since the old merge base and preserve relevant updates.
- Gate: intended changes are committed and history is clear of temporary or unrelated commits.

## Phase 5: Scope review

- Review `git diff <baseRemote>/<baseBranch>...HEAD` for unnecessary scope, over-engineering, and speculative abstractions.
- Remove issues found and rerun Phase 1 checks if code changed.
- Gate: no unaddressed scope findings.

## Phase 7: Description

- Write a concise, human title and body that follow the project template and conventions.
- Keep each paragraph on one line; use newlines only for Markdown structure.
- Save the body to a temporary file under `/home/major/.cache/opencode-tmp/opencode`, for example `tmp="$(mktemp --tmpdir=/home/major/.cache/opencode-tmp/opencode pr-create.XXXXXX.md)"`.
- For a stack, prepare a title and template-compliant body for each branch, and inspect existing PRs/MRs before updating them. Do not use `--fill` instead.
- Remove the temporary file manually after the PR/MR is created or updated.

## Phase 8: Push and open

For a stack, inspect the order, target, remotes, and metadata, then run the dry run before submission:

```bash
git-spice stack submit --dry-run
git-spice stack submit
```

On GitLab, after submission, mark each child MR as blocked by its parent MR using the "Stacked merge requests" section of the `glab` skill.

Do not use `--no-verify` or `--no-publish`. Fork submissions may push branches without opening every PR/MR; report which branches were opened and which were only pushed.

For a single branch, push to the preflight `pushRemote` first:

```bash
git push -u <pushRemote> "$(git branch --show-current)"
```

- GitHub: use `gh pr create --base <baseBranch> --title "<title>" --body-file "$tmp"`. Set `--head <forkOwner>:<branch>` for a fork, or the branch name for a same-repository push; use `--repo <baseOwnerRepo>` when the target is ambiguous.
- GitLab: use `glab mr create --target-branch <baseBranch> --source-branch "$(git branch --show-current)" --title "<title>" --description-file "$tmp" --repo <baseOwnerRepo>` for a fork targeting upstream. Do not add `--remove-source-branch` unless the user or project explicitly requires it.
- Update/report an existing PR/MR instead of creating a duplicate. Report the URL returned by the forge.
- Remove the temporary description file. Do not wait for or poll remote CI after opening.

## Phase 9: Report

Report the PR/MR URL, local gate results and log paths, and any skipped checks with reasons.
For a stack, list each branch and whether its PR/MR was opened or only pushed.
