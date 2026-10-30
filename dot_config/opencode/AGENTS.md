# AGENTS.md

- Never use emdashes when modifying content to any project.
- Write in US English using a language style that is easy to understand even for people who speak English as a second language.
- Principles are guides, not laws; favor code that is easy to read and change.
- When principles conflict, prefer the change that keeps code simpler and easier to evolve.
- If the 1Password ssh auth socket does not work, look for one in /home/$(id -un)/.ssh/agent/ instead.
- Never reveal which AI models you used in any tickets, MR/PR titles/descriptions, or in any code that goes into any repository.
- Prefer unicode boxes/trees and unicode art over ASCII/mermaid diagrams when creating visuals. Load the `unicode-art` skill before drawing any diagram, and use a Markdown table for rows and columns of data.
- Find personal repos in ~/git/major and work repos in ~/git/redhat.
- Use emojis really often in conversations with the user, code/comments, MR/PR titles/descriptions.
- Use emojis frequently to convey emotion, humor, or to highlight information.
- Prefer actionable bulleted lists, tables, and unicode box/tree art diagrams, and emojis over paragraphs.
- Prefer the gitlab MCP server over the glab command, if the MCP server is available.
- Use gender neutral language and never assume someone's gender based on their name alone.
- Merge requests and pull requests must start with a test/characterization commit first and then as many fix/refactor commits can follow after.

## When editing skills:
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
- Report checks actually run and their results. Read-only reviews are not executed tests.
- Clearly identify which review findings apply to the code change inside the diff in the MR/PR versus code outside the diff.
- Pull/merge requests must have unicode art showing the before/after logic flow.
- Require me to say "APPROVE" in all caps before posting any comments to any MR/PR.

## When writing or reviewing software tests:
- Use Test-Driven Development (TDD) and follow the Testing Pyramid from Mike Cohn..
- Use Arrange-Act-Assert (AAA) when modifying, writing, or refactoring tests.
- Always characterize functions prior to refactoring.
- Prefer sociable testing over solitary testing.
- Utilize fixtures and parameterization whenever possible.
- Aggressively remove unneeded/redundant tests after adding/modifying tests or production code.
- Add the minimum set of tests possible to provide coverage for what we are adding/modifying and nothing more.
- Any tests we create must return instantaneously and avoid CPU thrashing, especially for developer laptops with Crowdstrike Falcon sensors.

## When working with git worktrees and branches:
- Never make a worktree with a detached HEAD.
- Never convert a repository into a bare repo when cleaning up worktrees/branches!
- Remove any lines added by a pre-commit hook in commits, including "rh-pre-commit".
- Clean up the local branch/worktree immediately after creating a MR/PR, pushing to a MR/PR, or when you've finished all of the tasks defined in the session.
- Clean up your temporary files in ~/.cache/opencode-tmp frequently to avoid leaving lots of files around for later.
