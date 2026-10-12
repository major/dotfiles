---
name: python-house-rules
description: House rules for writing, reviewing, testing, or migrating Python code, including version-specific syntax and behavior for Python 3.11 through 3.15, Pythonic idioms, PEP 8, type hints, and pytest testing patterns. Use whenever Python code or tests are written or reviewed, when choosing syntax that depends on the target Python version, when writing pytest fixtures, mocks, parametrization, or coverage checks, or when upgrading a codebase to a newer Python release.
---

# Python House Rules

## Step 1: Determine the target Python version

Check these sources before writing version-dependent code:

1. `pyproject.toml`: `[project] requires-python`, `[tool.ruff] target-version`, `[tool.mypy] python_version`
2. `.python-version`, `setup.cfg`, `tox.ini`
3. CI matrices and container base images

The **minimum** supported version decides which syntax is allowed. New grammar is a
SyntaxError on older interpreters and cannot be guarded with `sys.version_info`.
If the target is unknown, ask, or default to 3.11-compatible code.

## Step 2: Read the matching version references

Read only the references you need. Each file describes what changed relative to the
previous release, so read every file from the oldest relevant version up to the
minimum target version.

| Reference | Read when |
| --- | --- |
| `references/python-311.md` | Target is 3.11+, or checking 3.10 compatibility. Covers `except*`/`ExceptionGroup`, variadic generics, `Self`, `TaskGroup`, `tomllib`, `StrEnum`. |
| `references/python-312.md` | Target is 3.12+, or adding generics and type aliases. Covers PEP 695 type params, `type` statements, PEP 701 f-strings. |
| `references/python-313.md` | Target is 3.13+. Covers type parameter defaults, `locals()`/`frame.f_locals` changes, removed stdlib modules. |
| `references/python-314.md` | Target is 3.14+. Covers t-strings, `string.templatelib`, `annotationlib`, unparenthesized `except`. |
| `references/python-315.md` | Target is 3.15+. Covers lazy imports, unpacking in comprehensions, `frozendict`, `sentinel`, UTF-8 default. |

Examples:

- Project requires `>=3.12`: read `python-311.md` and `python-312.md`. Do not use 3.13+ features.
- Migrating from 3.11 to 3.14: read `python-312.md`, `python-313.md`, and `python-314.md`.
- Reviewing code for 3.10 compatibility: read `python-311.md` and flag anything it lists.

## Step 3: Idioms and style

Read `references/python-patterns.md` when writing or reviewing Python code and
idiomatic structure, PEP 8, type hints, or general best practices are in question.

## Step 4: Testing

Read `references/python-testing.md` before writing or reviewing tests. It covers
pytest, TDD, fixtures, mocking, parametrization, and coverage.
