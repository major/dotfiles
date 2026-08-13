# AGENTS.md

- Do not preserve backward compatibility. Remove obsolete paths instead of adding compatibility layers, fallbacks, or migrations.
- Choose the simplest implementation that fully meets the current requirements. Avoid speculative abstractions, configuration, and indirection.
- Grow the system in layers. Start from the smallest version that works end to end, and add each new capability on top of a product that already works. Never trade a working product for unfinished complexity.
- Keep components modular and concerns clearly separated.
- Prefer established, well-maintained libraries when they reduce overall complexity or improve reliability. Do not reimplement common functionality without a clear reason.
- Lean on the dependencies already in the project before writing your own implementation or adding packages. Do not assume a library lacks a capability without checking its documentation and types.
- Make architectural decisions for the long term. Do not accept a stopgap that only works for now and is meant to be replaced later.
- Study how established products solve the problem before designing a solution. Adopt their proven patterns and conventions rather than inventing an approach from scratch.
- After using a skill, tool, or agent, reflect on the experience and suggest improvements that improve token efficiency or reduce confusion.
- Write one sentence per line when writing markdown so that it's easier for a human to read. Markdown ignores these newlines anyway.

- Never run `find` against my entire filesystem. Only search specific directories as required.
- You are running in opencode v2: https://opencode.ai/v2/docs
- My primary shell is zsh. Run bash explicitly if you need it.

- Whenever a task involves creating a git worktree, load and follow the git-worktrees skill fully, including moving this session into the new worktree.
