# Python Tooling Reference

Depth reference for `SKILL.md` section 12.
The Astral toolchain (uv, Ruff, ty) is the momentum default as of 2026; note that OpenAI [announced its acquisition of Astral on March 19, 2026](https://openai.com/index/openai-to-acquire-astral/), pending regulatory approval — the tools remain MIT/Apache-2.0 open source and both companies have committed to continued open-source support. Treat this as a fact to monitor, not a reason to avoid the tools.

**Always match the repo's existing convention over these defaults.** Only apply the defaults below when starting a new project or when the repo has no established tooling.

## Default commands

```sh
# Environment + dependencies (uv) — https://docs.astral.sh/uv/
uv init                          # new project with pyproject.toml
uv add <package>                 # add a direct dependency
uv add --dev <package>            # add a dev-only dependency
uv sync                          # install from uv.lock
uv lock                          # (re)generate the lockfile
uv export --format pylock.toml   # PEP 751 portable lockfile export
uv run pytest                    # run a command inside the project env

# Lint + format (Ruff) — https://docs.astral.sh/ruff/
uvx ruff check .                 # lint
uvx ruff check --fix .           # lint with autofix
uvx ruff format .                # format (Black-compatible)

# Types (ty, beta) or mypy/pyright as the CI gate
uvx ty check                     # fast, editor-first, beta — https://docs.astral.sh/ty/
uv run mypy <pkg>/                # mature, best plugin ecosystem (Django/SQLAlchemy/Pydantic)
uv run pyright                    # highest typing-spec conformance (~95-98%)

# Tests
uv run pytest
uv run pytest --hypothesis-show-statistics   # property-based test stats

# Supply chain
uv run pip-audit                 # scan installed deps against PyPA Advisory DB/OSV
```

## Ruff rule categories worth knowing

Ruff re-implements Flake8, isort, pyupgrade, pydocstyle, flake8-bugbear, flake8-bandit, and others as native rules — [the rules catalog](https://docs.astral.sh/ruff/rules/) documents the rationale for each. Enable categories deliberately in `[tool.ruff.lint] select = [...]` rather than turning on everything:

| Prefix | Covers | Why enable it |
| --- | --- | --- |
| `E`, `F` | pycodestyle errors, pyflakes | Baseline correctness/style (on by default) |
| `B` | flake8-bugbear | Common bug patterns (mutable defaults, loop variable capture) |
| `UP` | pyupgrade | Modern syntax (f-strings, `X \| None` over `Optional[X]`) |
| `S` | flake8-bandit | Security patterns: `eval`, `shell=True`, weak hashes, hardcoded passwords (see `references/security.md`) |
| `PERF` | perflint | Common performance antipatterns (list concat in loops, unnecessary list comprehension) |
| `DTZ` | flake8-datetimez | Naive (non-timezone-aware) datetime usage — matters for anything logging/scheduling across timezones |
| `RUF` | Ruff-specific | Ruff's own additions, no Flake8 equivalent |

Ruff enables `F`, `E`, `B`, `UP`, `RUF` by default; add `S`, `PERF`, `DTZ` explicitly for the security/performance/correctness coverage this skill assumes.

## Type checker decision matrix

No single winner in 2026 — pick per need, and it's common to run two:

| Checker | Strength | Use for |
| --- | --- | --- |
| **mypy** | Most mature plugin ecosystem (Django, SQLAlchemy, Pydantic) | CI gate on codebases using those frameworks |
| **Pyright** | Highest typing-spec conformance (~95-98% on the [official conformance suite](https://github.com/python/typing)) | CI gate for library/API work where spec-correctness matters most; powers Pylance |
| **ty** (Astral, beta) | 10-60x faster than mypy/Pyright without caching, far faster still on incremental edits | Editor-integrated fast feedback; not yet a sole CI gate (beta, ~50-55% conformance as of early/mid 2026) |
| **Pyrefly** (Meta, Rust) | Fast, stable 1.0 as of May 2026 | Alternative to ty if the repo prefers Meta's tooling |

**2026 pattern:** fast checker (ty or Pyright) in the editor for immediate feedback + mypy or Pyright as the authoritative CI gate. Promote ty to a CI gate once it reaches stable 1.0 with competitive conformance — don't do so speculatively ahead of that.

## Packaging standards (the real authority, independent of tool choice)

- **PEP 517/518** — build backend interface (`[build-system]` in `pyproject.toml`).
- **PEP 621** — project metadata in `pyproject.toml` (`[project]` table) — this replaced `setup.py` metadata.
- **PEP 735** — dependency groups (`[dependency-groups]`), the standard replacement for tool-specific "dev extras" conventions.
- **PEP 751** — `pylock.toml`, the standard lockfile format. `uv` and PDM support export today; Poetry lagged as of 2026. Prefer a tool's native lockfile (`uv.lock`) day-to-day and export to `pylock.toml` when cross-tool portability matters.

Any PEP-621-compliant tool (uv, Poetry, PDM, Hatch) is defensible — the standard is the authority, not the tool. Don't churn an existing Poetry/PDM project onto uv without a concrete reason; do default to uv for new projects.

## Sources

- uv, Ruff, ty docs — <https://docs.astral.sh/uv/>, <https://docs.astral.sh/ruff/>, <https://docs.astral.sh/ty/> (all Markdown in-repo, MIT/Apache-2.0).
- Python Packaging User Guide — <https://packaging.python.org> (PyPA, includes the `pyproject.toml` and `pylock.toml` specs).
- mypy — <https://mypy.readthedocs.io>; Pyright — <https://microsoft.github.io/pyright>.
- pytest — <https://docs.pytest.org>; Hypothesis — <https://hypothesis.readthedocs.io>.
- pre-commit (wiring these into git hooks) — <https://pre-commit.com>.
- Packaging alternatives: Hatch <https://hatch.pypa.io>, PDM <https://pdm-project.org>, Poetry <https://python-poetry.org>.
