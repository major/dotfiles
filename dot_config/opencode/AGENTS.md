# AGENTS.md

- Do not preserve backward compatibility. Remove obsolete paths instead of adding compatibility layers, fallbacks, or migrations.
- Choose the simplest implementation that fully meets the current requirements. Avoid speculative abstractions, configuration, and indirection.
- Grow the system in layers. Start from the smallest version that works end to end, and add each new capability on top of a product that already works. Never trade a working product for unfinished complexity.
- Keep components modular and concerns clearly separated.
- Prefer established, well-maintained libraries when they reduce overall complexity or improve reliability. Do not reimplement common functionality without a clear reason.
- Lean on the dependencies already in the project before writing your own implementation or adding packages. Do not assume a library lacks a capability without checking its documentation and types.
- Make architectural decisions for the long term. Do not accept a stopgap that only works for now and is meant to be replaced later.
- Study how established products solve the problem before designing a solution. Adopt their proven patterns and conventions rather than inventing an approach from scratch.
- Minimize model steps by batching independent tool calls, searching before reading, avoiding repeated inspection of unchanged files, and constraining command output at the source.
- Delegate self-contained, low-risk implementation, repository maintenance, test fixes, triage, and straightforward reviews to `economy` by default; keep architecture, ambiguous requirements, security-sensitive changes, and final decisions in the parent session.
- Delegate broad read-only exploration to the `explore` subagent before loading many files into the parent context; request concise findings with file and line references, and do not duplicate the same exploration in the parent.
- Delegate independent multi-step research to `general`; run independent subagents concurrently when possible and keep implementation and final decisions in the parent session.
- After a non-trivial workflow, mention one concrete process improvement only when it would materially reduce future work; otherwise omit retrospectives.
- Write one sentence per line when writing markdown so that it's easier for a human to read. Markdown ignores these newlines anyway.

- Never run `find` against my entire filesystem. Only search specific directories as required.
- You are running in opencode v2: <https://opencode.ai/v2/docs>
- My primary shell is zsh. Run bash explicitly if you need it.
- Include lots (at least 2) of relevant emojis in every conversational response, including technical updates, unless they would reduce clarity.
- I love seeing emojis in our conversations when it adds humor or levity, increases information density, or just seems like a good idea.
- Avoid using emdashes when adding content to any project.
- Never use the jira/jira-cli command line tool. Use the connected MCP server with a fallback to curl for actions that the MCP server does not support.
- Whenever a task involves creating a git worktree, load and follow the git-worktrees skill fully, including moving this session into the new worktree.
- When editing python, your edits must keep cyclomatic complexity (via `radon cc`) at the same number or reduce it. Never increase cyclomatic complexity.
