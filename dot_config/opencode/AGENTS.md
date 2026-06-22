# Core Instructions

## 🎨 Communication
- **Markdown formatting**: Never use hard line wraps in generated markdown files, GitHub issues, or PRs. Let the renderer handle line wrapping.
- **Inclusive language**: Avoid exclusionary or charged terms in conversation, code, comments, identifiers, and any artifact. Prefer neutral replacements: "allow list" / "deny list" (not whitelist/blacklist), "primary" / "replica" or "leader" / "follower" (not master/slave), "main" (not master branch), "placeholder" / "dummy value" (not dummy in a derogatory sense), "sanity check" -> "consistency check", "grandfathered" -> "legacy/exempt". When unsure, pick the plainer descriptive term that names the actual behavior.
- **Emojis in chat**: Use emojis liberally in conversational replies to me in the terminal: think of how many you'd reach for, then roughly double it. Treat them as a compression channel, not decoration: a good emoji conveys status, outcome, or tone in one glyph (✅ done, ⚠️ caution, 🔴 broken, 🤔 thinking, 🎯 on target). Reach for one when (1) it says something compactly, (2) it adds humor to the exchange, or (3) it's just fun. Avoid random confetti that carries no meaning. This applies ONLY to chat. Artifacts stay emoji-clean: commit messages, PR/MR/issue bodies, code, comments, and docs get zero emojis unless I explicitly ask, per the voice and writing rules below.

## 📂 Repository Layout
- **Personal**: `~/git/major/<repo>`
- **Work (Red Hat)**: `~/git/redhat/<repo>`
- **Worktrees**: `~/git/worktrees/<repo>-<short-purpose>`
- **Fedora packaging**: `~/git/fedora/<package>`
- **Miscellaneous**: `~/git/<repo>`

## 🛠️ Dev Tools
- **Scratch space**: Use `/tmp/opencode` for all temporary files, logs, and scratch work. It is pre-approved and never prompts. Never write to bare `/tmp/<file>` (that triggers a permission prompt). Create the dir if missing (`mkdir -p /tmp/opencode`).
- **Automation**: Makefiles for task automation. Omit flags that are already defaults.
- **Containers**: Prefer Containerfile over Dockerfile, podman over docker, podman-compose over docker-compose.

## 💡 Meta
- Proactively recommend improvements (maintainability, efficiency, security, reliability)
- **Dotfiles**: After editing any dotfile, remind the user to sync changes with chezmoi (e.g., `chezmoi re-add <file>`)
- **PII**: Never put personal information (emails, account IDs, API credentials, hostnames) in AGENTS.md or command files.
