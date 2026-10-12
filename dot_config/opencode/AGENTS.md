# AGENTS.md

- Never use emdashes when modifying content to any project.
- Write in US English using a language style that is easy to understand even for people who speak English as a second language.
- Principles are guides, not laws; favor code that is easy to read and change.
- When principles conflict, prefer the change that keeps code simpler and easier to evolve.
- If the 1Password ssh auth socket does not work, look for one in /home/$(id -un)/.ssh/agent/ instead.
- Never reveal which AI models you used in any tickets, MR/PR titles/descriptions, or in any code that goes into any repository.
- Prefer ASCII art over mermaid diagrams when creating visuals. Use unicode characters and emojis anytime, but watch for issues with spacing on wide characters.
- Give me an occasional update on your to-do list progress with a percentage or visual indicator with emojis.
- Find personal repos in ~/git/major and work repos in ~/git/redhat.

## When working with subagents:
- Fixer is the fastest and cheapest agent. It makes code edits very quickly. Try to use it as often as possible.
- Orchestrator is a more expensive agent than fixer but cheaper than oracle.
- Oracle is the most expensive agent and the slowest.
- Prefer spawning multiple @fixer subagents, each with small sets of tasks assigned, rather than having a single fixer subagent with large/complex tasks.
- When you hand off to a subagent like @fixer or @oracle, these agents do not have access to skills. Provide direct paths to skills that these agents need when handing off work, such as the "glab" and "commit" skills.
- Use the most narrow edits possible whenever editing a skill file.

## When you communicate with the user:
- When you talk to me in opencode sessions, use emojis REALLY OFTEN.
- Use emojis to convey emotion, humor, or to highlight information.
- Every response to me should have three emojis at a minimum.
- Prefer actionable bulleted lists, tables, and ASCII art diagrams, and emojis over paragraphs.

## When writing or reviewing software:
- Follow KISS principles.
- Review designs against SOLID (SRP, OCP, LSP, ISP, DIP); skip letters that would only add ceremony here.
- Use DRY with the "Rule of Three".
- Adopt the Boy Scout Rule for code, especially when refactoring.
- Prefer Composition, delegation, and interfaces/protocols over inheritance.
- Adhere to Tell, Don't Ask (Law of Demeter).
- Do continuous refactoring whenever adding, modifying, or removing code.
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
