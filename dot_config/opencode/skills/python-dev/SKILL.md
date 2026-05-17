---
name: python-dev
description: |
  Use when writing, reviewing, or setting up Python code, projects, or tests.
  Also use proactively when creating new Python files, configuring Python tooling
  (uv, ruff, pyright, pytest), or reviewing Python PRs, even if the user doesn't
  explicitly mention Python conventions. Does not cover general testing philosophy
  (see root AGENTS.md).
  Triggers: ".py files", "Python", "FastAPI", "pytest", "ruff", "pyright", "uv",
  "async/await in Python", "dataclasses", "PEP 257"
---

# Python Development

- **Style**: Senior dev mindset: modern patterns, edge-case handling, emergency-readable code
- **Stack**: uv/ruff/pyright/pytest for all Python projects
- **Complexity**: Use `radon cc` to check cyclomatic complexity. Anything rated C or above is unacceptable, refactor until it's A or B.
- **Async**: Use async/await by default, especially for FastAPI/web services
- **Error handling**: Defensive approach (try/except with fallbacks and graceful degradation). Error messages should be clear enough for LLMs to understand and act on. Never swallow exception details: every `except` block that logs must include `exc_info=True` (for `warning`) or use `logger.exception()` (which adds it automatically).
- **Functions**: Single-purpose, functional, type-hinted, testable
- **Documentation**: PEP 257 docstrings for all functions, no exceptions: tests, private/helper functions, closures.
- **Comments**: Err on the side of adding comments. Explain "why" for non-obvious decisions, module-level design choices, and anything a future reader might question. A brief comment now saves a git-blame investigation later. Only remove comments that literally restate the code (e.g., `# increment counter` above `counter += 1`).
- **Patterns**: Prefer dataclasses over Pydantic when possible. Use list/dict comprehensions and context managers.
- **Python version**: Python 3.14 is the current production stable release. Use 3.14 by default on all new projects.
- **Environment**: Modules in `.venv` at project root
- **Libraries**: Prefer existing over custom implementation. Use library-native features (e.g., asyncssh's `timeout` param) over wrappers (e.g., `asyncio.wait_for`).
- **Config classes**: Centralize derived config logic (defaults, path resolution) in config classes, not consuming code
- **Timestamps**: Always use timezone-aware datetimes. Use `datetime.now(tz=datetime.timezone.utc)` or `datetime.now(tz=ZoneInfo("..."))`, never naive `datetime.now()` or `datetime.utcnow()`.
- **Testing**: pytest parameterization/fixtures to avoid duplication. Use fixtures (not helper functions) for reusable test components. Parameterized tests: use explicit assertions (`pytest.raises()`+`nullcontext()`) not boolean toggle flags. Add specs to mocks (`AsyncMock(SomeClass)`) to verify correct attributes.
