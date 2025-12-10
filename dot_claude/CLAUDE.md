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

## 💡 Meta
- Proactively recommend improvements (maintainability, efficiency, security, reliability)
- Write token-efficient CLAUDE.md files
