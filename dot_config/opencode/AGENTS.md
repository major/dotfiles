# AGENTS.md

- Never use emdashes when modifying content to any project.
- Write in US English using a language style that is easy to understand even for people who speak English as a second language.
- Principles are guides, not laws; favor code that is easy to read and change.
- When principles conflict, prefer the change that keeps code simpler and easier to evolve.
- If the 1Password ssh auth socket does not work, look for one in /home/$(id -un)/.ssh/agent/ instead.
- Never reveal which AI models you used in any tickets, MR/PR titles/descriptions, or in any code that goes into any repository.
- Prefer unicode boxes and unicode art over mermaid diagrams when creating visuals. Load the `unicode-art` skill before drawing any diagram, and use a Markdown table for rows and columns of data.
- Give me an occasional update on your to-do list progress with a percentage or visual indicator with emojis.
- Find personal repos in ~/git/major and work repos in ~/git/redhat.
- Do tasks in parallel, especially when waiting on a long process or command to finish. Try to anticipate what will be needed next and have it ready. Minimizing wall clock time is important.
- Use emojis really often in conversations with the user, code/comments, MR/PR titles/descriptions.
- Use emojis frequently to convey emotion, humor, or to highlight information.
- Prefer actionable bulleted lists, tables, and unicode/ASCII art diagrams, and emojis over paragraphs.

## When working with subagents:
- When you hand off to a subagent like @fixer or @oracle, these agents do not have access to skills. Provide direct paths to skills that these agents need when handing off work, such as the "glab", "commit", and "unicode-art" skills.
- Use the most narrow edits possible whenever editing a skill file.

## When writing or reviewing software:
- Write code that humans can interpret, read, and understand quickly.
- Follow KISS principles.
- Avoid overengineering when fewer lines and a simpler process works fine.
- Review designs against SOLID (SRP, OCP, LSP, ISP, DIP); skip letters that would only add ceremony here.
- Use DRY with the "Rule of Three".
- Adopt the Boy Scout Rule for code, especially when refactoring.
- Prefer Composition, delegation, and interfaces/protocols over inheritance.
- Adhere to Tell, Don't Ask (Law of Demeter).
- Do continuous refactoring whenever adding, modifying, or removing code.
- Use Parallel Change (Expand → Migrate → Contract), preparatory refactoring, and "strangler fig" strategies.
- Add docstrings to all functions we write and add comments in areas with challenging or edge case situations.
- Run the project's lint/test commands before declaring done.
- Clearly identify which review findings apply to the code change inside the diff in the MR/PR versus code outside the diff.
- Require me to say "APPROVE" in all caps before posting any comments to any MR/PR.

## When writing or reviewing software tests:
- Use Test-Driven Development (TDD) and follow the Testing Pyramid from Mike Cohn..
- Use Arrange-Act-Assert (AAA) when modifying, writing, or refactoring tests.
- Always characterize functions prior to refactoring.
- Prefer sociable testing over solitary testing.
- Utilize fixtures and parameterization whenever possible.
- Remove unneeded tests after refactoring tests or improving characterization.
- Always limit pytest-xdist to 8 CPUs maximum and override pre-project guidelines or scripts that do otherwise.

## When working with git worktrees and branches:
- Move the entire opencode session (using session_move tool) into the worktree after creating it.
- Never ask my permission for creating worktrees/branches. Just create them when you need them.
- Create and use worktrees when take any actions inside any project with a git repository.
- Worktrees should be created within the .worktrees directory inside the repo itself.
- Always create a branch along with the worktree based on the latest origin/main commits.
- Never make a worktree with a detached HEAD.
- When reviewing merge requests or pull requests, put the MR/PR branch into a git worktree and review it there.
- Always recommend deleting a worktree/branch locally when we no longer need it.
- Never convert a repository into a bare repo when cleaning up worktrees/branches!
- Rebase on upstream's origin/main or origin/master before opening or modifying a pull/merge request.
- Remove any lines added by a pre-commit hook in commits, including "rh-pre-commit".
