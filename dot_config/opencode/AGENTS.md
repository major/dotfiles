# AGENTS.md

- Never use em dashes in content for any project.
- Write US English that is easy to follow for people who speak English as a second language.
- Principles are guides, not laws. When principles conflict, prefer the change that keeps code simpler and easier to evolve.
- Never reveal which AI models you used in tickets, MR/PR titles or descriptions, or code committed to any repository.
- Prefer unicode boxes, trees, and art over ASCII or mermaid diagrams. Load the `unicode-art` skill before drawing any diagram. Use a Markdown table for rows and columns of data. I am a visual learner.
- Find personal repos in ~/git/major and work repos in ~/git/redhat.
- Use emojis in code comments.
- Use gender neutral language. Never assume someone's gender from their name.
- Translate all times and dates to America/Chicago time unless specified otherwise.

## When editing skills:
- Use the narrowest possible edits when changing a skill file.

## When writing or reviewing software:
- Write code that humans can read, interpret, and understand quickly.
- Follow The Zen of Python (Tim Peters) and KISS. Avoid overengineering; fewer lines and a simpler process win when they work fine.
- Review designs against SOLID (SRP, OCP, LSP, ISP, DIP). Skip letters that would only add ceremony here.
- Use DRY with the Rule of Three. Adopt the Boy Scout Rule, especially when refactoring. Do continuous refactoring whenever you add, modify, or remove code.
- Prefer composition, delegation, and interfaces or protocols over inheritance. Adhere to Tell, Don't Ask (Law of Demeter).
- Use Parallel Change (Expand → Migrate → Contract), preparatory refactoring, and strangler fig strategies.
- Add docstrings to all functions we write. Add comments in areas with challenging or edge-case behavior.
- When a change adds or edits a safety gate, override, or bypass, list every place that enforces the same rule and keep them in sync. Check for a bound or cap, the patch's own files, partial or failed runs, `None` vs empty, real layouts from at least 2 projects, and an audit trail. When review finds one gap, check every gate for the same gap before pushing.
- Require me to say "APPROVE" in all caps before posting any comments to any MR/PR.
- Never run `mutmut` directly. Run `~/bin/mutmut-bounded <mutmut args>` instead. It uses the memory-capped `mutmut.slice` systemd user slice and limits `--max-children` (default 4, override with `MUTMUT_MAX_CHILDREN`), because mutmut can exhaust all RAM on this machine quickly.

## When writing or reviewing software tests:
- Use TDD for bug fixes and behavior changes: Red (a focused test confirms the expected behavioral failure), Green (simplest correct implementation), Refactor (keep relevant tests passing).
- Report Red/Green commands and results, or explain skipped steps. Never weaken tests to make them pass.
- Follow Mike Cohn's Testing Pyramid. Prefer sociable over solitary tests. Use Arrange-Act-Assert (AAA) when writing, modifying, or refactoring tests.
- Use fixtures and parameterization whenever possible.
- Before behavior-preserving refactoring, run existing tests that characterize the affected behavior. Add characterization tests only where coverage is missing. Do not manufacture a failing test for a pure refactor.
- Add the minimum tests needed to cover what you add or modify, and nothing more. Aggressively remove unneeded or redundant tests after changing tests or production code.
- Keep tests fast and deterministic. Avoid unnecessary sleeps, expensive workloads, and CPU-heavy concurrency, especially on developer laptops with Crowdstrike Falcon sensors. Use the smallest realistic inputs that verify the behavior.

## When working with git worktrees and branches:
- Never make a worktree with a detached HEAD.
- Clean up the local branch and worktree immediately after creating or pushing to an MR/PR, or when all tasks in the session are done. Never convert a repository into a bare repo while cleaning up.
- Clean up your temporary files in ~/.cache/opencode-tmp often, so they do not pile up.
