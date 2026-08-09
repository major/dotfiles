---
name: python-development
description: Use whenever writing, editing, reviewing, or generating Python code. Covers .py files, pyproject.toml, requirements.txt, tests, scripts, and notebooks. Applies to API/tool design, typing discipline, defensive parsing, docstring contracts, error handling, async, packaging, and Python code review.
---

# Python Development

## Overview

A working checklist distilled from real refactors, not a style-guide reprint. Apply it when designing or reviewing Python APIs, internal helpers, and their tests — and any time you write or change Python in this repo.

These rules are additive to the repo's `AGENTS.md` standing principles: simplest implementation that meets the requirement, no speculative abstraction, functional style over imperative loops, no comments unless they name a non-obvious constraint, prefer `const`-style immutability.

## When to Use

- Writing, editing, generating, or reviewing any Python (`.py`), including tests, scripts, command-line tools, and notebooks
- Touching `pyproject.toml` / `requirements.txt` / `setup.cfg` packaging and dependency declarations
- Designing or reviewing a function/tool signature called by another program or an LLM
- Choosing between `dict[str, Any]`, a `dataclass`, or a `pydantic` model for a piece of data
- Parsing JSON/API responses from an external system you don't control
- Reviewing docstrings that double as API contracts (type hints, `Annotated[...]` descriptions, OpenAPI/MCP schemas)
- Writing tests for code that enriches, prunes, or mutates dict/list payloads

## 1. API Surface Design

**Collapse leaky implementation details into the tool that's actually used.** If callers only ever need endpoint A's result to make sense of endpoint B, don't expose A and B as two separate calls — fold A into B internally. Ask: "does the caller need to know this exists separately, or just the combined result?"

**Delete dead public wrappers once their logic moves elsewhere.** A public function nobody calls invites "am I still supposed to use this?" Fold the one-liner into its new caller instead of leaving an orphaned wrapper around "just in case."

**Treat documented output contracts as load-bearing.** If a docstring says "returns the raw payload unmodified," additive enrichment (new keys) is usually fine, but removing/renaming/redacting existing fields is a breaking change — call it out explicitly in review, don't silently violate it.

**Decide omit-vs-null deliberately.** A missing key and an explicit `null` mean different things:
- Omit the key when absence means "not applicable" (an optional metric that doesn't exist for this record).
- Include the key as `null` when absence is meaningful ("this account has no nickname set"). Silently omitting can read as a bug.

**Draw a hard line between wire format and internal representation.** External field names (`accountHash`, `camelCase`) belong in the dict/JSON you return; internal variables, dataclass fields, and function args stay `snake_case`. Don't let one leak into the other.

**When adding a parameter only meaningful alongside another, validate both directions.** It's natural to validate "given primary is set, is companion valid?" — but the inverse (companion set, primary absent) is just as important to reject. A companion that silently no-ops when its precondition isn't met misleads the caller. Test the "companion set, primary absent" case specifically.

**Row completeness, not just row non-emptiness.** When combining independently-computed series into one row, require all promised columns present, not just any. Two moving averages of different type but same window can produce values at different offsets; `dropna(how="all")` yields rows with only one field populated. Use `dropna(how="any")` or an explicit per-row check, and give the combined series intentionally mismatched warmup lengths in a test — a same-shape fixture won't expose the bug.

## 2. Data Shape: dict vs dataclass vs pydantic

Pick the lightest tool that removes the actual pain point:

- **`dict[str, Any]` / `TypedDict`**: fine for data immediately serialized back out as JSON and never inspected field-by-field in multiple places.
- **`@dataclass(frozen=True, slots=True)`**: use once you're doing repeated `.get("key")` lookups on the same shape in more than one place — typed attribute access catches typos `pyright` would otherwise miss, and it's free (stdlib, no new dependency). `frozen=True` for values that shouldn't change after construction; `slots=True` for memory and to catch accidental new attributes.
- **`pydantic`**: only when you need validation/coercion at a real trust boundary (deserializing untrusted input, enforcing a schema across a network call) — not just to hold two fields together internally.

**Before adding pydantic (or any new dependency), check whether it's already a *direct* dependency** (`pyproject.toml`/`requirements.txt`), not merely transitively pulled in by another package. Matching the codebase's existing convention beats introducing a second modeling paradigm for one helper. Grep for `@dataclass` / `import pydantic` in `src/` before deciding.

**Prefer comprehensions over imperative append-loops when the body is filter+transform.** A `{k: v for ... if ...}` names intent up front; a `for` loop with `.append`/`[k] = v` forces the reader to trace state. Reserve explicit loops for genuinely stateful logic.

```python
# Prefer
id_map = {
    entry["recordId"]: entry["value"]
    for entry in payload
    if isinstance(entry, dict) and isinstance(entry.get("value"), str)
}

# Over
id_map = {}
for entry in payload:
    if isinstance(entry, dict) and isinstance(entry.get("value"), str):
        id_map[entry["recordId"]] = entry["value"]
```

## 3. Defensive Parsing of External Data

When parsing JSON from an API you don't control, guard every level before indexing — a malformed or shape-shifted upstream response should degrade gracefully, not crash the caller:

```python
records = payload.get("records") if isinstance(payload, dict) else None
id_map = {
    rec["recordId"]: rec.get("label")
    for rec in (records if isinstance(records, list) else [])
    if isinstance(rec, dict) and isinstance(rec.get("recordId"), str)
}
```

This isn't paranoia — it's "one bad record gets skipped" vs. "the whole call throws." Write at least one malformed/empty-payload test per parsing helper, not just the happy path.

**Beware in-place mutation of dicts you didn't originate**, especially shared test fixtures. A `{**base, ...}` shallow copy shares nested dict identity — mutating one result can leak into a later test reusing the same nested object. Either don't mutate in place, or don't rely on object identity across test cases that go through a mutating code path.

## 4. Docstrings as Contract

For any function whose docstring/type-annotations feed a schema a caller relies on (MCP tool descriptions, OpenAPI, `Annotated[...]` parameter docs), treat the docstring as part of the API, not a comment:

- **Rewrite, don't append**, when behavior changes. A leftover "does not return X, call Y" line is actively misleading once the function *does* — appending a correction below creates a contradiction for the reader (human or LLM).
- Keep parameter descriptions pointing at the *current* way to obtain a value. Update references the moment a referenced function is renamed or removed.
- Full type annotations on every signature; keep `pyright`/`mypy` at zero errors with no `type: ignore` — treat that as a hard gate.
- **When a new parameter changes the meaning of an existing one, update the existing parameter's description too.** A field documented as a "trigger price" that becomes a "fill price" under a new `type` enum needs every place it's documented — its `Annotated` string, the docstring, the README/tool-reference — changed in the same edit.

## 5. Error Handling

**Raise specific exceptions, catch specific exceptions.** Define a small exception hierarchy rooted at a module-level base (`class AppError(Exception)` with `AppInputError`, `AppAPIError`, etc.). Users should catch `AppError` to mean "expected and handled"; never catch bare `except:` or `except Exception: ` to swallow the unexpected — that hides bugs and breaks `Ctrl-C`.

** Never let a secondary lookup miss destroy an already-known-good value.** If the caller supplied the identifier the lookup is trying to enrich, fall back to that input on a miss instead of overwriting with `None`:

```python
# Bad: enrichment miss clobbers caller-supplied data
out["recordId"] = identity.record_id if identity else None

# Good: fall back to what we already know
out["recordId"] = identity.record_id if identity else fallback_id
```

## 6. Best-Effort Enrichment vs. Primary Data

When a function combines a **primary** call (what the caller asked for) with **secondary enrichment** (nice-to-have metadata), don't let the secondary path take down the primary:

```python
async def _get_label_map(ctx) -> dict[str, str]:
    """Best-effort: labels are metadata, not the primary data."""
    try:
        records = await ctx.client.get_records()
    except APIError:
        return {}  # degrade to no-enrichment, don't abort the caller
    ...
```

Ask during design/review: "if this sub-call fails, should the whole call fail too?" If enrichment is additive/optional, the answer is almost always no — catch the *specific* expected exception type and return an empty/default result.

## 7. Typing Discipline

- **`from __future__ import annotations`** at the top of modules so annotations are strings by default and forward refs cost nothing.
- **Avoid `Any`.** Prefer `object` for "unknown anything" and narrow with `isinstance`; use a `Protocol` for structural typing over an import, an ABC only when you need a real inheritance contract.
- **`Optional[X]` means `X | None`**, not "this argument is optional." An optional argument uses a default (`x: X | None = None`); a required argument that may legitimately be `None` is `Optional[X]` with no default.
- **Don't lie with `# type: ignore`.** If the type system fights you, fix the shapes before suppressing; if you must suppress, pin the code and add a reason per the repo's `AGENTS.md`.

## 8. Modern Python Habits

- **`pathlib.Path` over `os.path` string concat.** `Path(base) / "sub" / f"{name}.json"` reads better than `os.path.join(base, "sub", f"{name}.json")` and yields an object, not a string.
- **`with` for every resource** (files, sockets, locks, subprocess handles). If a class owns a resource, make it a context manager (`__enter__`/`__exit__` or `@contextlib.contextmanager`).
- **Logging, not print.** Use the `logging` module (or `structlog`/`loguru` if the project already does) for anything that runs in production; `print` is for scratch scripts only.
- **Generators over materialized lists when the consumer iterates once.** Saves memory on large collections and signals streaming intent. But don't return a generator when the caller needs to subscript or iterate twice — materialize.
- **`subprocess.run(..., shell=False)` always.** Never `shell=True` with interpolated input. Pass `args` as a list and never interpolate caller-provided strings into a command.
- **No `eval`/`exec`, no `pickle` for untrusted input.** Use `ast.literal_eval` for literal structures, or a real parser (`json`, `pydantic`) per section 3.

## 9. Async Correctness

- **Never call blocking I/O inside an async function** without `run_in_executor` — a blocking `requests.get` inside `async def` stalls the whole event loop. Use an async client (`httpx.AsyncClient`, `aiohttp`) or offload.
- **`asyncio.run` is the entry point of choice** for scripts; don't nest it. Don't call `loop.run_until_complete` yourself unless you're inside a framework that forbids `asyncio.run`.
- **Handle cancellation transparently.** If you catch `CancelledError` to clean up, re-raise it; don't swallow it. Long-running tasks should propagate cancellation.
- **Don't mix sync and async worlds casually** — no bare `await` outside `async def`, no fire-and-forget coroutines (create a task and await/track it).

## 10. Packaging & Dependencies

- **`pyproject.toml` is the modern norm.** Prefer it over `setup.py`/`setup.cfg`. Use a build backend already adopted by the repo (hatchling, setuptools, flit); match neighbors.
- **Pin versions for reproducibility and loosen them only deliberately.** Exact pins for apps; compatible ranges (`~=x.y`) for libraries. Don't pin a transitive dependency your own `pyproject.toml` doesn't directly use.
- **External tools the project already uses go in tool-specific config** (ruff: `[tool.ruff]`, mypy: `[tool.mypy]`); don't invent a parallel lint config. Check `AGENTS.md` and the repo for the canonical lint command and run it after changes.

## 11. Cyclomatic Complexity Gate

Every function and method must rate **grade A or B** under `radon`/`xenon` cyclomatic complexity. No C+ (C, D, E, F) allowed — a function that complex has too many independent paths to test or reason about.

**Run it as a hard gate** alongside `pyright`/`mypy` and the repo lint command:

```sh
xenon --max-absolute B --max-modules A --max-average A <pkg>/
```

- `--max-absolute B` rejects any single function exceeding grade B (complexity > 10 by the default McCabe scale: A 1–5, B 6–10, C 11–15, …).
- `--max-modules A` and `--max-average A` keep the aggregate from drifting.

**If a function rates C+, refactor rather than suppress:**

- Extract helper functions that each handle one concern; let the main function read as the happy path (matches the repo `AGENTS.md` "Complex Logic" guidance).
- Replace long `if`/`elif`/`elif` chains with a dispatch table (`dict` of handlers) or `match`/`case`, each branch its own function.
- Convert nested conditionals to early returns (guard clauses).
- Split a function that fuses validation, transformation, and I/O into separate stages; composing them at the call site lowers each one's complexity.
- Re-evaluate after refactor — the gate must pass before the change lands.

Generated/templated code excluded from the normal edit loop can be marked via `# pragma: no cc` (radon respects `# noqa: C901`-style suppressions only when the caller explicitly opts in); prefer real refactors and reserve suppression for code the reviewer genuinely can't shape.

## 12. Test Isolation Patterns

- **Monkeypatch your own internal helpers**, not just the outermost client, when a function composes fetch → enrich → prune. Patching an inner helper lets a test assert one concern without fabricating a realistic payload for the others.
- **Always add the no-match / malformed / empty case** alongside the happy path — these are exactly what defensive `isinstance` guards exist for, and the first to silently regress.
- **One test class per behavior** reads better than one giant parametrized test when cases have materially different setups. Follow the existing project pattern (`TestGetAccounts`, etc.).
- **`assert isinstance(result, dict)` before subscripting a union-typed return** — helpers returning `JSONType`-style unions fail `pyright` on `result["key"]` without a narrowing assert. Required for `pyright` in basic mode; match this in every new test that subscripts such a return.
- **When a bug is fixed, update the test that encoded the old behavior — don't add a second one alongside.** A test named `test_no_match_yields_null` whose fix means it *shouldn't* yield null anymore needs its assertion and often its name changed; leaving it unchanged gives a green suite that asserts the bug still "works as intended."

## Quick Checklist

Run through after writing or before approving a Python change:

- [ ] Dead public wrapper / unused parameter deleted instead of left orphaned?
- [ ] Output contract ("raw"/"unmodified") still honored, or change called out in review?
- [ ] Omit-vs-`null` choice deliberate? Wire/supplier names kept separate from internal `snake_case`?
- [ ] `dict`/dataclass/pydantic — lightest tool, matches existing codebase convention, no new dep unless needed?
- [ ] Every level of external JSON guarded with `isinstance` before indexing?
- [ ] In-place mutation safe (freshly owned) or a footgun for reused fixtures?
- [ ] Docstrings rewritten (not appended) to match new behavior; all places a multi-meaning param appears updated in one edit?
- [ ] Exceptions: specific types raised, specific types caught, no bare `except`?
- [ ] Enrichment failure doesn't abort a primary call that could succeed; misses fall back to caller-supplied input instead of `None`?
- [ ] Row completeness: merged series require *all* promised fields present, not just *any*?
- [ ] Companion params rejected when primary absent, not silently no-op'd?
- [ ] `pathlib`, `with`, `logging` instead of `os.path`, manual cleanup, `print`?
- [ ] `from __future__ import annotations`, no unnecessary `Any`, no unjustified `type: ignore`?
- [ ] No blocking I/O in async; no `eval`/`exec`/`pickle` for untrusted input; `subprocess` uses `shell=False`?
- [ ] Packaging in `pyproject.toml`; pins deliberate; reuse existing tool config (ruff/mypy)?
- [ ] `pyright`/`mypy` clean; repo lint command run?
- [ ] Cyclomatic complexity: `xenon --max-absolute B` passes for every function/method (no C+); over-complex functions refactored to guard clauses, dispatch tables, or extracted helpers — not suppressed?
- [ ] Tests cover no-match/malformed/empty, not just happy path; union-return subscripts narrowed with `isinstance`; old buggy tests updated rather than shadowed?