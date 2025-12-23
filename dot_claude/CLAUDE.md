# Claude Code Instructions

## 🎨 Communication
- **Emojis**: Use heavily (2x what seems normal!) for clarity/humor. No numbered list emojis (terminal issues). UTF-8 encode in files via Write tool.
- **Notifications**: `notify-send` (persistent) when awaiting approval
- **Mentoring**: Explain concepts using analogies and real-world comparisons

## 🐍 Python Development
- **Style**: Senior dev mindset—modern patterns, edge-case handling, emergency-readable code
- **Async**: Use async/await by default, especially for FastAPI/web services
- **Error handling**: Defensive approach—try/except with fallbacks and graceful degradation. Error messages should be clear enough for LLMs to understand and act on.
- **Functions**: Single-purpose, functional, type-hinted, testable
- **Documentation**: PEP 257 docstrings for functions/classes. Inline comments for tricky logic only—remove low-value comments that restate the obvious.
- **Patterns**: Prefer dataclasses over Pydantic when possible. Use list/dict comprehensions and context managers.
- **Environment**: Modules in `.venv` at project root
- **Libraries**: Prefer existing over custom implementation. Use library-native features (e.g., asyncssh's `timeout` param) over wrappers (e.g., `asyncio.wait_for`).
- **Config classes**: Centralize derived config logic (defaults, path resolution) in config classes, not consuming code

## 🧪 Testing
- pytest parameterization/fixtures to avoid duplication
- Use fixtures (not helper functions) for reusable test components
- Parameterized tests: use explicit assertions (`pytest.raises()`+`nullcontext()`) not boolean toggle flags
- Add specs to mocks (`AsyncMock(SomeClass)`) to verify correct attributes
- Focus on critical paths (don't chase 100% coverage)
- TDD when possible

## 🛠️ Dev Tools
- **Python stack**: uv/ruff/pyright/pytest for all Python projects
- **Automation**: Makefiles for task automation. Omit flags that are already defaults. Use context-appropriate outputs (HTML coverage local, XML for CI).
- **Containers**: podman + Containerfile (not docker/Dockerfile)

## 🔀 Git Workflow
- Branch for upstream PRs
- Don't ever write to a remote repo, such as using a git push, without my permission 
- Always use Conventional Commits style commit messages
- Do not include any Claude-related items in commit messages as these will be rejected by upstream developers
- Always use my signed-off-by messages in commit messages along with GPG signatures (-s and -S)
- When addressing feedback on a pull request, use fixup commits so that I can autosquash them at the end
- When addressing feedback on a pull request, always rechech that all feedback was addressed in the changes when you finish. Also, suggest responses to the developer giving feedback in the PR.

## 🎫 Jira (Atlassian MCP)
- **Reviewing**: Use `jira_search` with JQL for bulk queries, `jira_get_issue` for details. Include `expand: 'changelog'` for history.
- **Creating**: Use `jira_create_issue`. Default to **Task** issue type unless specified otherwise. Always ask for project key if not provided—never assume.
- **Updating**: `jira_transition_issue` for status changes (get IDs via `jira_get_transitions` first), `jira_add_comment` for notes.
- **Context**: Summarize tickets concisely—key, summary, status, assignee. Link related tickets when relevant.
- **Backfill a Jira ticket**: Create a ticket for an existing PR. Steps:
  1. Get PR details (title, body, URL) via `gh pr view`
  2. Create ticket with human-readable title (scrum-friendly, not commit-style)
  3. Description must have two sections: "What is being done?" and "Why is it being done?"
  4. Set fields: assignee, story points, sprint (find sprint ID from existing ticket in that sprint)
  5. Transition to "In Progress"
  6. Update PR title with Jira ticket number prefix (e.g., "RSPEED-1234: original title")
  7. ⚠️ MANUAL: Add GitHub PR link via More > Link > Web Link (MCP tool doesn't create proper Issue Links)

## 💡 Meta
- Proactively recommend improvements (maintainability, efficiency, security, reliability)
- Write token-efficient CLAUDE.md files
