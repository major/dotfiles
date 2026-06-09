---
description: Create a PR with smart summary, template detection, and optional CodeRabbit review
---

Create a pull request (GitHub) or merge request (GitLab) with context from commits and code changes.

## Execution Policy

Invoking `/pr-create` is permission to complete the PR/MR flow without asking for routine confirmations.

- If currently on `main` or `master` with relevant uncommitted changes, create a feature branch with a short descriptive name before committing.
- If uncommitted changes are part of the requested PR, commit them with `git commit -s -S` before pushing.
- Push the PR/MR branch without asking.
- Create the PR/MR without asking.
- If `.coderabbit.yaml` exists, run one local CodeRabbit review automatically before opening the PR/MR unless the invocation explicitly says to skip it.
- Ask only when there is a real choice that cannot be inferred safely, such as unrelated uncommitted changes, likely secrets, or multiple equally plausible target branches.

## Parallel Execution Strategy

This command uses three phases. Phase 2 runs three independent workstreams in parallel to minimize wall-clock time (CodeRabbit is the bottleneck, so everything else should overlap with it).

```text
Phase 1 (sequential): Detect forge, pre-flight, commit if needed
Phase 2 (parallel):   Push branch || CodeRabbit review || Gather context + templates
Phase 3 (sequential): Generate description, create PR, backlink, post-create
```

---

## Phase 1: Setup (Sequential)

### Step 1: Detect Forge

Determine whether this is a GitHub or GitLab repo:

```bash
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
if echo "$REMOTE_URL" | grep -qi gitlab; then
  FORGE="gitlab"
else
  FORGE="github"
fi
echo "Forge: $FORGE"
```

For **GitLab** repos:
- Use `glab` (not `gh`) for all MR operations.
- Push branches to the fork remote (`$GIT_FORK_REMOTE`), create MRs against `origin` (upstream).
- Use `--repo` to target the upstream project: `glab mr create --source-branch BRANCH --target-branch master --repo UPSTREAM_GROUP/REPO`.
- If push/fetch fails, retry once before giving up (internal GitLab SSH/HTTPS can be flaky).

### Step 2: Pre-flight Check

```bash
BRANCH=$(git branch --show-current)
echo "Branch: $BRANCH"

if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
  if [ -n "$(git status --short)" ]; then
    # Create a short descriptive branch name from the observed change. Replace
    # this placeholder with a concrete name using fix/, feat/, docs/, or chore/.
    BRANCH="fix/<short-description>"
    git switch -c "$BRANCH"
  else
    echo "Cannot create PR from main/master without changes to branch from"
    exit 1
  fi
fi

# Determine base branch
BASE=$(git rev-parse --abbrev-ref HEAD@{upstream} 2>/dev/null | sed 's|origin/||' || echo "main")
if ! git rev-parse --verify "origin/$BASE" >/dev/null 2>&1; then
  BASE="main"
fi
echo "Base: $BASE"

git log "$BASE".."$BRANCH" --oneline
git status --short
```

If uncommitted changes exist and belong to this PR/MR, commit them before pushing. All commits must include Signed-off-by and GPG signature (`git commit -s -S`). Never include AI-tool-related items in commit messages (upstream reviewers will reject them). Ask only if the working tree contains unrelated changes, likely secrets, or multiple independent change sets that should not be committed together.

---

## Phase 2: Parallel Workstreams

**Launch all three workstreams simultaneously.** None depend on each other. Use parallel tool calls (multiple bash calls in a single message, or background tasks) to run them concurrently. Wait for all three to complete before moving to Phase 3.

### Workstream A: Push Branch

```bash
if [ "$FORGE" = "gitlab" ]; then
  git push -u "${GIT_FORK_REMOTE:-origin}" "$BRANCH"
else
  git push -u origin "$BRANCH"
fi
```

Invoking `/pr-create` is the push permission. Push without asking.

### Workstream B: CodeRabbit Review

**Only available when `.coderabbit.yaml` exists in the repo root.** If the config file is not present, skip this workstream entirely.

When available, run CodeRabbit automatically unless the invocation explicitly says to skip it:

```bash
~/bin/coderabbit review --agent --base "$BASE" -c .coderabbit.yaml
```

- Use a timeout of at least 10 minutes. Reviews on larger PRs can take a while.
- Output is JSON lines. The final line has `"type":"complete"` with a `findings` count.
- Zero findings means clean.
- Fix actionable findings before creating the PR. Note nitpicks in the final output instead of stopping for a decision.
- Do NOT run CodeRabbit more than once per PR. One run, period.
- If the invocation says "just open it", "skip CodeRabbit", "skip review", or equivalent, skip this workstream entirely.

### Workstream C: Gather Context and Templates

Run all of these together (they are all local operations):

**Gather PR context:**

```bash
git diff "$BASE"..HEAD --stat
git log "$BASE"..HEAD --format="%s%n%b"
```

**Identify changed files and analyze:**

```bash
git diff "$BASE"..HEAD --name-only
```

Read key changed files to understand the PR. Determine:
- What is the main feature/fix?
- What areas of code are affected?
- Any breaking changes?
- Any new dependencies?

**Check for PR/MR templates:**

Search for template files in these default paths (in priority order):

**GitHub PR templates:**

1. `.github/PULL_REQUEST_TEMPLATE.md` - single template (most common)
2. `.github/pull_request_template.md` - lowercase variant
3. `PULL_REQUEST_TEMPLATE.md` - repo root
4. `pull_request_template.md` - repo root, lowercase
5. `docs/pull_request_template.md` - docs directory
6. `.github/PULL_REQUEST_TEMPLATE/` - directory with multiple named templates. Use `Default.md` if present, otherwise use the first template sorted by filename unless the invocation names a template.

**GitLab MR templates:**

1. `.gitlab/merge_request_templates/Default.md` - auto-applied default
2. `.gitlab/merge_request_templates/*.md` - named templates. Use `Default.md` if present, otherwise use the first template sorted by filename unless the invocation names a template.

```bash
# GitHub - check all standard locations
for f in \
  .github/PULL_REQUEST_TEMPLATE.md \
  .github/pull_request_template.md \
  PULL_REQUEST_TEMPLATE.md \
  pull_request_template.md \
  docs/pull_request_template.md; do
  [ -f "$f" ] && echo "Found: $f"
done
# GitHub - multiple template directory
[ -d ".github/PULL_REQUEST_TEMPLATE" ] && ls .github/PULL_REQUEST_TEMPLATE/

# GitLab - template directory
[ -d ".gitlab/merge_request_templates" ] && ls .gitlab/merge_request_templates/
```

If a template is found, read its contents and use its structure for the PR description. If no template exists, use the default format in Step 3.

---

## Phase 3: Finalize (Sequential, after Phase 2 completes)

### Step 3: Generate PR Description

Use the upstream template from Workstream C if one was found. Otherwise:

```markdown
## Summary
[1-3 bullet points on the WHY, not the WHAT]

## Changes
- [Key change 1]
- [Key change 2]
- [Key change 3]

## Testing
- [ ] Build passes
- [ ] Lint passes
- [ ] Tests pass
- [ ] Manual testing done

## Related
- Closes #NNN / Refs: JIRA-NNN
```

Writing rules for the description:
- Write like a senior dev talking to peers. No filler phrases, no AI-sounding language.
- Do not narrate every file change. Reviewers can read diffs.
- Never use hard line wraps in the markdown. Let the renderer handle wrapping.
- Never use em dashes. Use commas, parentheses, colons, hyphens, or separate sentences instead.
- Never include account balances, account numbers, account hashes, token values, or other private financial/account data in the PR/MR title, body, comments, or ticket backlinks.
- Build the body as real multiline Markdown in a temporary file. Do not pass generated Markdown through `--body "$(...)"`, JSON string literals, `printf %q`, or escaped `\n` sequences.
- If a GitHub issue, GitLab issue, or Jira ticket was referenced, created, or discussed during the session, include it in the Related section using the appropriate keyword (`Fixes`/`Closes` for GitHub/GitLab auto-close, `Refs:` for Jira or non-closing references).

### Step 4: Create PR

Write the generated description to a temporary Markdown file first. Use a single-quoted heredoc so shell expansion cannot alter the body:

```bash
BODY_FILE=$(mktemp "${TMPDIR:-/tmp}/pr-body.XXXXXX.md")
cat >"$BODY_FILE" <<'EOF'
<generated description from Step 3>
EOF

if grep -q '\\n' "$BODY_FILE"; then
  echo "PR body contains literal \\n escapes; rewrite it with real newlines before creating the PR/MR"
  exit 1
fi

gh pr create \
  --title "<type>(<scope>): <description>" \
  --body-file "$BODY_FILE"
```

For GitLab, use the same `BODY_FILE` with `glab mr create --description-file "$BODY_FILE"` instead of inline `--description` text.

Use Conventional Commits style for the title. Short imperative subject.

### Step 5: Backlink to Referenced Tickets

If a Jira ticket, GitHub issue, or GitLab issue was referenced, created, or discussed during this session, add the new PR/MR URL as a remote link on that ticket. This is in addition to the `Refs:`/`Closes` line in the PR description: the PR body informs reviewers, the backlink informs whoever is tracking the ticket.

**Jira (REST API v3, Basic auth):**

The `rspeed-jira` skill has cached `$JIRA_BASE`, `$JIRA_AUTH`, and the remote link payload format. If that skill is not loaded and a Jira ticket is in scope, load it first.

```bash
TICKET="RSPEED-XXXX"
PR_URL="https://github.com/org/repo/pull/NNN"
PR_TITLE="repo PR #NNN: <title>"

curl -s -u "$JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -X POST "$JIRA_BASE/api/3/issue/$TICKET/remotelink" \
  -d "{\"object\": {\"url\": \"$PR_URL\", \"title\": \"$PR_TITLE\"}}" | jq '{id, errorMessages}'
```

**GitHub issue:** post a comment with the PR URL using `gh issue comment NNN --body "Linked PR: <url>"`. GitHub auto-links via `Closes #NNN` in the PR body when that wording is used, so a comment is only needed if cross-repo or non-closing.

**GitLab issue:** same idea with `glab issue note NNN --message "Linked MR: <url>"` against the upstream repo.

Skip this step if no ticket/issue was referenced in the session.

### Step 6: Post-create

```bash
gh pr view --json body --jq .body

if gh pr view --json body --jq .body | grep -q '\\n'; then
  echo "Created PR body contains literal \\n escapes; fix it immediately with gh pr edit --body-file"
  exit 1
fi

gh pr view --web
```

For GitLab, perform the same readback with `glab mr view --output json` or `glab mr view` and fix malformed bodies with `glab mr update --description-file "$BODY_FILE"` before reporting success.

Output:
```text
PR Created
URL: <pr-url>
Branch: $BRANCH -> $BASE
Commits: N
Linked: <ticket-key-or-issue-number> (if any)
```
