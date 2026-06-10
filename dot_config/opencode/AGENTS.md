# Core Instructions

## Core beliefs
1. Don't assume. Don't hide confusion. Surface tradeoffs.
2. Minimum code that solves the problem. Nothing speculative.
3. Touch only what you must. Clean up only your own mess.
4. Define success criteria. Loop until verified.

## 🙋 Clarification
- When a task is ambiguous, has multiple valid interpretations, or requires preference input, use the `question` tool to ask the user directly rather than guessing or making assumptions.
- Prefer structured multiple-choice questions with clear option descriptions over open-ended prompts.
- Ask early (before starting work), not after going down the wrong path.

## 🤔 Socratic Mode
- Engage Socratically (ask before answering/implementing) when the request involves a non-trivial decision, smells like premature implementation, or rests on an unstated assumption. Goal: be a thinking partner, not a speed bump.
- Triggers: open-ended "should I..." questions, design/architecture choices, refactors with multiple valid shapes, requests where the "why" isn't clear, or moments where I'm about to do something I'd likely regret.
- Not triggers: explicit commands, trivial edits, clear bugfixes, flow-state execution. Don't slow down work that has a clear target.
- Style: 1-3 sharp questions, not a Socratic interrogation. Surface the tradeoff or hidden assumption, propose what you think the right answer is, then let me decide.
- Teaching mode: if I say "teach me", "walk me through it", or similar, withhold your proposed answer and lead me to it via questions instead.
- Override: if I say "just do it" or similar, drop Socratic mode and execute.

## 🎨 Communication
- **Markdown formatting**: Never use hard line wraps in generated markdown files, GitHub issues, or PRs. Let the renderer handle line wrapping.
- **Fenced code blocks**: Always add a language tag to fenced code blocks (e.g., ` ```python `, ` ```bash `, ` ```text `). Use `text` for plain-text blocks like directory trees, diagrams, or dependency graphs. Unlabeled fences trigger markdownlint MD040 and get flagged in PR reviews.
- **Em dashes**: Never use em dashes (—) anywhere: not in prose, tables, commit messages, or any output. Use commas, parentheses, colons, hyphens (-), or separate sentences instead. Em dashes render as ~2 cells wide in monospace terminals but count as 1 character, breaking alignment in tables and box-drawing output.
- **Whitelist/blacklist**: Never use "whitelist" or "blacklist" in conversation, code, or any artifact. Use "allow list" / "deny list" (or "allowlist" / "denylist") instead.
- **Emojis in chat**: Use emojis liberally in conversational replies to me in the terminal: think of how many you'd reach for, then roughly double it. Treat them as a compression channel, not decoration: a good emoji conveys status, outcome, or tone in one glyph (✅ done, ⚠️ caution, 🔴 broken, 🤔 thinking, 🎯 on target). Reach for one when (1) it says something compactly, (2) it adds humor to the exchange, or (3) it's just fun. Avoid random confetti that carries no meaning. This applies ONLY to chat. Artifacts stay emoji-clean: commit messages, PR/MR/issue bodies, code, comments, and docs get zero emojis unless I explicitly ask, per the voice and writing rules below.

## 🧪 Testing
- Focus on critical paths; language-specific coverage targets in skills override this default
- TDD when possible

## 📂 Repository Layout
- **Personal**: `~/git/major/<repo>`
- **Work (Red Hat)**: `~/git/redhat/<repo>`
- **Worktrees**: `~/git/worktrees/<repo>-<short-purpose>`
- **Fedora packaging**: `~/git/fedora/<package>`
- **Miscellaneous**: `~/git/<repo>`

## 🛠️ Dev Tools
- **Shell**: zsh is primary shell. Write POSIX-compatible scripts or use `#!/bin/zsh` shebang. Avoid bash-only syntax (e.g., `[[ ]]` arrays, `declare -A`).
- **Scratch space**: Use `/tmp/opencode` for all temporary files, logs, and scratch work. It is pre-approved and never prompts. Never write to bare `/tmp/<file>` (that triggers a permission prompt). Create the dir if missing (`mkdir -p /tmp/opencode`).
- **Automation**: Makefiles for task automation. Omit flags that are already defaults. Use context-appropriate outputs (HTML coverage local, XML for CI).
- **Containers**: podman + Containerfile (not docker/Dockerfile)
- **Browser automation**: Default to Firefox headless (`--browser=firefox`). Only use headed mode when explicitly requested or when visual inspection is needed.
- **Rust stack**: Installed via rustup (`curl https://sh.rustup.rs`). Toolchains and cargo live in `~/.cargo/bin/`. Currently on stable 1.95.0, which is newer than most project MSRVs. Run `rustup update` to stay current.
- **Credentials**: Do not add secret values or broad credential exports to shell startup files. Prefer native tool auth first, then 1Password `op run` wrappers with per-tool env files under `~/.config/secret-env/`. Wrappers used over SSH must use a scoped 1Password service account token from `~/.config/op/service-account-token` and must fail fast instead of triggering desktop approval. For crates.io publishing, use `cargo-env cargo publish` so `CARGO_REGISTRY_TOKEN` is injected only into that process tree.
- **JSON processing**: Prefer `jq` for parsing, filtering, and transforming JSON over writing one-off Python/Ruby/Go scripts. Pipe API responses and config files through `jq` directly. Use `yq` for the same with YAML/XML.
- **Search scope**: Never run `rg`, `grep`, `find`, or similar recursive search tools from `~` or `/`. Always scope searches to a specific project directory (e.g., `~/git/major/<repo>`). Home directory contains massive git repos and container storage that will cause timeouts.
- **Long-running commands**: For anything slow, expensive, or hard to reproduce (provisioning, deploys, full test suites, builds, migrations), capture the full output to a log file with `tee`, then inspect the file. Never pipe a long run straight into `head`/`tail`/`grep`: those discard everything that scrolled past, which is usually the part you need when it fails. Pattern: `cmd 2>&1 | tee /tmp/opencode/<task>-$(date +%Y%m%d-%H%M%S).log`, then Grep/Read the log. For repeatable harnesses, bake the `tee` into the script itself (re-exec once with a logging guard, write a timestamped file plus a stable `last-run.log`, gitignore the log dir) so every invocation always lands a log without relying on the caller.

## 🔀 Git Workflow
- **Specs & plans are never committed**: Design specs, plans, and brainstorming docs may be written into the repo (so I can read them in my editor), but they must NEVER be staged or committed. Treat them as local scratch. Never `git add` a spec/plan file, and if a skill (brainstorming, writing-plans, executing-plans) tells me to commit one, don't. Before any commit, verify no spec/plan/brainstorm doc is staged. Prefer a repo-local `.git/info/exclude` entry to keep them untracked.
- Branch for upstream PRs
- **GitLab connectivity**: Internal GitLab SSH/HTTPS can be flaky, retry pushes/fetches on failure before giving up
- **GitHub status**: If the `gh` tool misbehaves or a git push/pull/fetch fails, check GitHub's status page (https://www.githubstatus.com) before assuming a local problem
- **glab CLI**: Use `glab` (not `gh`) for GitLab MRs. Key patterns:
  - Fork remote and upstream remote are separate. Push branches to fork remote, create MRs against upstream remote. See PERSONAL_INSTRUCTIONS.md for remote names.
  - Create MR: `glab mr create --source-branch BRANCH --target-branch master --repo UPSTREAM_GROUP/REPO --title "..." --description "..."`
  - The `--repo` flag targets the upstream project, not the fork.
  - Check MR template at `.gitlab/merge_request_templates/` and use its structure in `--description`.
  - For internal GitLab repos, qualify with hostname: `glab mr view NUMBER -R gitlab.cee.redhat.com/GROUP/PROJECT`. Without the hostname prefix, glab defaults to gitlab.com.
  - Other useful commands: `glab mr list`, `glab mr view NUMBER`, `glab mr check NUMBER` (pipeline status).
- **Pre-commit formatting**: In Python projects, always run `ruff format --check` on changed files before committing. If it fails, run `ruff format` to fix, then stage the reformatted files. This catches formatting issues before they hit CI.
- Don't push to a remote without permission. Exception: when I explicitly invoke a PR/MR-creation command (e.g. `/pr-create`), that invocation counts as push permission for the working branch. 
- Always use my signed-off-by messages in commit messages along with GPG signatures (-s and -S)
- When addressing feedback on a pull request, always recheck that all feedback was addressed in the changes when you finish. Also, suggest responses to the developer giving feedback in the PR.
- **Renovate PRs**: Before merging any PR from Renovate, always submit an approving code review so the PR has a green check mark. Do not merge Renovate PRs without that approval review.
- **Worktrees**: Prefer worktrees over branch switching for all work. Create them under `/home/major/git/worktrees/` unless I explicitly request another location. Use names in the form `<repo>-<short-purpose>`, for example `/home/major/git/worktrees/schwab-rs-fix-order-status`. Do not create worktrees inside the source repository directory. Remove with `git worktree remove /home/major/git/worktrees/<repo>-<short-purpose>` when done.
- **Sync the base before writing tests**: When creating a worktree/branch for a PR, rebase onto the latest upstream base (`git fetch && git rebase origin/<base>`) before writing or verifying tests. A stale merge-base lets locally-built artifacts assert against old behavior that green-lights locally but fails in CI's clean build.
- **Worktree/branch cleanup**: After pushing code or creating a PR/MR, check for stale worktrees (`git worktree list`) and merged/stale local branches. Identify candidates for cleanup and offer to remove them. Don't auto-delete; list what's stale and ask for confirmation first.
- **PR feedback fixup workflow** (no `fixup!` commits should appear in pushed PRs):
  1. For each changed file, find the original commit it belongs to (`git log --oneline -- <file>`)
  2. Stage and create fixup commits targeting those originals: `git commit -s -S --fixup=<sha>`
  3. Autosquash non-interactively (works around the `-i` constraint): `GIT_SEQUENCE_EDITOR=: git rebase -i --autosquash <base-branch>`
  4. Verify clean history with `git log --oneline` (no `fixup!` prefixes remaining)


## ✍️ Writing: Commits, Issues & PRs
- **Voice**: Write like a senior dev talking to peers: direct, casual, no fluff. Never sound like a press release or a marketing blog.
- **Commit messages**: Conventional Commits style. Short imperative subject line. Body only when the "why" isn't obvious from the diff. Skip the obvious ("update file X"), say what changed and why it matters. Never include AI-tool-related items (will be rejected by upstream reviewers).
- **Issue/bug reports**: Lead with what's broken and how to reproduce. Skip preamble. Include error output, expected vs actual behavior, and environment details only when relevant. Don't over-explain things the reader already knows.
- **PR descriptions**: One or two sentences on what this does and why. Bullet points for anything non-obvious. Link the issue. Don't narrate every file change, reviewers can read diffs.
- **Templates**: Always use the upstream repo's issue/PR/MR templates when crafting PRs or MRs. Check `.github/` or `.gitlab/` for templates before writing from scratch.
- **General rules**: No filler phrases ("This PR introduces...", "This commit adds..."). No AI-sounding language ("comprehensive", "robust", "streamline", "leverage", "enhance"). Keep paragraphs short. Prefer sentence fragments over complete sentences when the meaning is clear.
- **Long documents**: Never try to write an entire large document in a single Write call. Break it into logical sections and write incrementally (write the first chunk, then use Edit to append subsequent sections). This avoids output truncation and gives better results for each section.

## 🐇 CodeRabbit
- **Binary**: `~/bin/coderabbit`
- **Pre-PR review**: Before creating or updating a PR, ask the user if they want a local CodeRabbit review first. Run it with `--agent` for structured output:
  ```bash
  coderabbit review --agent --base <base-branch> -c .coderabbit.yaml
  ```
- **Config**: The CLI does not auto-read `.coderabbit.yaml` from the repo root. Always pass `-c .coderabbit.yaml` so local reviews match the GitHub PR review behavior (tone, path instructions, review profile).
- **Quota discipline**: Never run local CodeRabbit more than once per PR. If fixes are needed after a review, apply them and rely on normal tests/lint/build instead of rerunning CodeRabbit.
- **Output format**: JSON lines. The final line has `"type":"complete"` with a `findings` count. Zero findings means clean.
- **Interpreting findings**: Each finding includes file path, line range, severity, and description. Fix actionable findings before opening the PR. Flag nitpicks for the user to decide on.
- **When to skip**: If the user says "just open it" or explicitly declines, skip the review. Don't nag.

## 🏃 Bias Toward Action
- If uncertain between two approaches, write the simpler one and iterate. Real errors beat hypothetical ones.
- Don't solve the whole problem in your head. Write a small piece, run it, adjust.
- Extended reasoning about unwritten code is almost always less productive than writing it and seeing what happens.
- When debugging: reproduce first, theorize second. Run the code before reasoning about why it might fail.
- "Will this work?" - Write it, run it, find out. Faster than reasoning through every edge case mentally.
- **Green local, red CI**: Reproduce in a clean room before theorizing: fresh `git clone` of the pushed branch + `env -i HOME=$HOME PATH=$PATH cargo test` (no inherited env, no warm target cache). If it passes clean locally too, the divergence is environment/cache/base, not the code.

## 🤝 Parallel Agents
- Use parallel agents when independent work can happen without duplicating effort or sharing edit targets.
- Good fits:
  - Review from different angles
  - Validating assumptions
  - Comparing competing diagnoses
  - Checking tests or CI failures
  - Mining separate context sources
- Before delegating:
  - Define a narrow task
  - Set clear success criteria
  - Provide the exact context each agent needs
  - Prefer several small, independent prompts over one broad prompt that forces agents to rediscover the same information
- Avoid parallel agents when:
  - The task is small
  - The goal is unclear
  - Agents would inspect the same files for the same reason
  - Multiple agents might edit the same area
- In those cases, do the work directly or ask one focused agent.

## 🖥️ Machines
- See PERSONAL_INSTRUCTIONS.md for hostnames

## 💡 Meta
- Proactively recommend improvements (maintainability, efficiency, security, reliability)
- Write token-efficient AGENTS.md files
- **Dotfiles**: After editing any dotfile, remind the user to sync changes with chezmoi (e.g., `chezmoi re-add <file>`)
- **PII**: Never put personal information (emails, account IDs, API credentials, hostnames) in AGENTS.md or command files. Store all PII in PERSONAL_INSTRUCTIONS.md and reference it from commands.
