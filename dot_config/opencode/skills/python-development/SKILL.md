---
name: python-development
description: Use whenever writing, editing, reviewing, or generating Python code. Covers .py files, pyproject.toml, requirements.txt, tests, scripts, and notebooks. Applies to API/tool design, typing discipline, defensive parsing, docstring contracts, error handling, async, security, performance, modern tooling (uv/Ruff/ty), packaging, and Python code review.
---

# Python Development

## Overview

A working checklist distilled from real refactors, not a style-guide reprint. Apply it when designing or reviewing Python APIs, internal helpers, and their tests — and any time you write or change Python in this repo.

These rules are additive to the repo's `AGENTS.md` standing principles: simplest implementation that meets the requirement, no speculative abstraction, functional style over imperative loops, no comments unless they name a non-obvious constraint, prefer `const`-style immutability.

Sections 1-10 are hard-won review patterns.
Sections 11-15 cover security, performance, tooling, and review gates, with `references/` files behind the first three for depth — read the reference file when you need canonical detail beyond the summary here, don't rely on memorized specifics that go stale.

## When to Use

- Writing, editing, generating, or reviewing any Python (`.py`), including tests, scripts, command-line tools, and notebooks
- Touching `pyproject.toml` / `requirements.txt` / `setup.cfg` packaging and dependency declarations
- Designing or reviewing a function/tool signature called by another program or an LLM
- Choosing between `dict[str, Any]`, a `dataclass`, or a `pydantic` model for a piece of data
- Parsing JSON/API responses from an external system you don't control
- Reviewing docstrings that double as API contracts (type hints, `Annotated[...]` descriptions, OpenAPI/MCP schemas)
- Writing tests for code that enriches, prunes, or mutates dict/list payloads
- Reviewing code that touches secrets, subprocess/SQL/deserialization, or dependency/lockfile changes
- Choosing or configuring a linter, type checker, test runner, or packaging tool

## Canonical References

Fetch these on demand for authoritative, current detail.
Don't answer a specific packaging, typing, or security question from memory alone when the canonical source is one fetch away — these move fast (Python 3.14, PEP 751, the Astral toolchain) and stale advice reads as confidently wrong.

| Topic | Source |
| --- | --- |
| Language/stdlib reference, release notes | <https://docs.python.org/3/>, <https://docs.python.org/3/whatsnew/3.14.html> |
| PEPs (typing, packaging, free-threading) | <https://peps.python.org> |
| Packaging (`pyproject.toml`, `pylock.toml`) | <https://packaging.python.org> |
| Typing spec | <https://typing.python.org> |
| uv (envs, deps, lockfiles) | <https://docs.astral.sh/uv/> |
| Ruff (linter/formatter + rule catalog) | <https://docs.astral.sh/ruff/>, <https://docs.astral.sh/ruff/rules/> |
| ty (Astral's type checker, beta) | <https://docs.astral.sh/ty/> |
| mypy / Pyright (type checkers) | <https://mypy.readthedocs.io>, <https://microsoft.github.io/pyright> |
| pytest / Hypothesis (testing) | <https://docs.pytest.org>, <https://hypothesis.readthedocs.io> |
| OWASP Cheat Sheet Series | <https://cheatsheetseries.owasp.org> |
| OWASP Top 10:2025 | <https://owasp.org/Top10/2025/> |
| Architecture Patterns with Python (free) | <https://www.cosmicpython.com/> |

Deeper reference files in this skill: `references/security.md`, `references/performance.md`, `references/tooling.md`, and a chapter-by-chapter audit of *Effective Python* 3rd edition in `references/effective-python-audit.md`.

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

**Let verbs be functions.** An operation with no natural home in one object (allocate a line across many batches) is a plain function — `allocate(line, batches)` — not a `FooManager`/`BarBuilder` class.

**Keyword-only arguments are API safety.** Put `*` before config/flag/optional params (`def f(a, b, *, timeout=30)`) so callers can't transpose positional order and the call site self-documents. Reserve positional slots for arguments whose order is genuinely natural. Use `/` (3.8+) to mark parameters as positional-only when their names are implementation details the caller should never rely on (`def normalize(x, y, /, *, eps=1e-9)`).

**Prefer a state class over `generator.throw()` for state-machine flows.** `generator.throw()` looks elegant for "reset timer"-style flows, but the surrounding `try`/`except StopIteration` boilerplate and nested `while` make it unreadable. A small class with `tick()`/`reset()` methods and a `__bool__` that reflects liveness is simpler and easier to test. Reach for `throw` only when the generator's caller genuinely needs to inject events from outside the coroutine.

## 2. Data Shape: dict vs dataclass vs pydantic

Pick the lightest tool that removes the actual pain point:

- **`dict[str, Any]` / `TypedDict`**: fine for data immediately serialized back out as JSON and never inspected field-by-field in multiple places. Use `TypedDict` when the shape must *stay* a dict (JSON wire format, external payload) but you still want per-key types checked.
- **Custom mappings: subclass `collections.UserDict`, not `dict`.** `dict`'s C-optimized methods bypass Python-level overrides — inherited `d.get()`, `d.update()`, and `k in d` silently skip your overridden `__getitem__`/`__missing__`. And `__missing__` fires only on `d[k]`, never `.get()` or `in`, so fallback logic can silently never run. `UserDict` routes everything through your overrides.
- **`@dataclass(frozen=True, slots=True)`**: use once you're doing repeated `.get("key")` lookups on the same shape in more than one place — typed attribute access catches typos `pyright` would otherwise miss, and it's free (stdlib, no new dependency). `frozen=True` for values that shouldn't change after construction; `slots=True` for memory and to catch accidental new attributes.
- **No mutable default values** in dataclass fields or function args: `guests: list = []` (or `def f(x=[])`) shares one object across every instance/call — a bug that appears later as "why does my data persist?" Use `field(default_factory=list)` / `x=None`.
- **Enums for bounded domain values.** Replace magic strings/ints in comparisons (`status == "ACTIVE"`, sides, order types) with `enum.Enum`/`IntEnum` members — typos become `AttributeError`s at definition time instead of silent `False` at runtime.
- **Value objects vs entities.** A value object is defined by its data — two `OrderLine`s with the same fields are the same line — so `@dataclass(frozen=True)` gives correct field-based equality and hashing for free. An entity has long-lived identity (a `Batch` stays the same batch by `reference` as its state changes): implement `__eq__`/`__hash__` on the identity field only, keep both consistent, and make the identity field read-only — mutating a hashed field silently corrupts sets/dicts.
- **`pydantic`**: only when you need validation/coercion at a real trust boundary (deserializing untrusted input, enforcing a schema across a network call) — not just to hold two fields together internally.

**Before adding pydantic (or any new dependency), check whether it's already a *direct* dependency** (`pyproject.toml`/`requirements.txt`), not merely transitively pulled in by another package. Matching the codebase's existing convention beats introducing a second modeling paradigm for one helper. Grep for `@dataclass` / `import pydantic` in `src/` before deciding.

**Use `__missing__` when the default value depends on the key.** `defaultdict`'s factory takes no arguments, so it can't construct a value that needs the key (opening a file by path, building a record from an id). `setdefault` always evaluates the default — expensive or exception-raising defaults are a footgun. Subclass `dict` (or `UserDict` to keep overrides consistent across `.get`/`in`) and define `__missing__(self, key)` to run key-aware default construction once per missing key, then cache the result in `self[key] = value` and return it. (`__missing__` fires only on `d[k]`, never `.get()`/`in` — wrap in `UserDict` if your override must apply everywhere.)

**Reach for `__init_subclass__` and `__set_name__` before reaching for metaclasses (both 3.6+).** Three patterns that look like metaclass work don't need one:
- `__init_subclass__(cls)` runs at subclass definition time. Use it to validate that subclasses set required attributes (`if cls.sides < 3: raise ValueError(...)`) — the error fires at import, not at first instantiation. Always call `super().__init_subclass__()` so cooperative validation works across diamond inheritance.
- `__init_subclass__` is also the cleanest way to register classes: append `cls` to a module-level dict for reverse lookups by name/identifier, instead of hand-rolled `abc.ABCMeta` registries.
- `__set_name__(self, owner, name)` is called on every descriptor instance when its owning class is defined. Use it so a descriptor (`Field`, `Column`, `Setting`) can discover its attribute name without the user passing the string twice.

Reach for a real metaclass only when none of the above suffice.

**Advanced: walk `cls.__dict__` in `__init_subclass__` for declarative ordering.** Class bodies preserve attribute definition order in `cls.__dict__`. A `__init_subclass__` hook can iterate it to discover fields/methods in the order they were declared — useful for declarative frameworks (CSV row mappers keyed on column position, plugin registries, workflow step ordering). Pair with a descriptor or `Ellipsis` placeholder convention so the class body remains the single source of truth.

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

**Normalize Unicode before string matching.** `'café'` ≠ `'cafe\u0301'` (composed vs decomposed accents), and `.lower()` won't match `'Straße'` to `'STRASSE'`. When comparing keys/labels against external payloads, compare `unicodedata.normalize('NFC', s).casefold()` on both sides — never raw `==` on user/API-supplied text.

**Beware in-place mutation of dicts you didn't originate**, especially shared test fixtures. A `{**base, ...}` shallow copy shares nested dict identity — mutating one result can leak into a later test reusing the same nested object. Either don't mutate in place, or don't rely on object identity across test cases that go through a mutating code path. When storing or mutating an argument you don't own, copy first — `list(x)`/`x.copy()` shallow, `copy.deepcopy` when you mutate nested structure.

**`[x] * n` aliases nested items.** `[[]] * n` or `[{}] * n` gives n references to one object — mutating one row mutates them all. `[0] * n` is fine (immutables). Build nested lists with a comprehension: `[[] for _ in range(n)]`.

## 4. Docstrings as Contract

For any function whose docstring/type-annotations feed a schema a caller relies on (MCP tool descriptions, OpenAPI, `Annotated[...]` parameter docs), treat the docstring as part of the API, not a comment:

- **Rewrite, don't append**, when behavior changes. A leftover "does not return X, call Y" line is actively misleading once the function *does* — appending a correction below creates a contradiction for the reader (human or LLM).
- Keep parameter descriptions pointing at the *current* way to obtain a value. Update references the moment a referenced function is renamed or removed.
- Full type annotations on every signature; keep `pyright`/`mypy` at zero errors with no `type: ignore` — treat that as a hard gate.
- **When a new parameter changes the meaning of an existing one, update the existing parameter's description too.** A field documented as a "trigger price" that becomes a "fill price" under a new `type` enum needs every place it's documented — its `Annotated` string, the docstring, the README/tool-reference — changed in the same edit.

## 5. Error Handling

**Raise specific exceptions, catch specific exceptions.** Define a small exception hierarchy rooted at a module-level base (`class AppError(Exception)` with `AppInputError`, `AppAPIError`, etc.). Users should catch `AppError` to mean "expected and handled"; never catch bare `except:` or `except Exception: ` to swallow the unexpected — that hides bugs and breaks `Ctrl-C`. Catch `Exception`, not `BaseException` — `BaseException` is also the parent of `KeyboardInterrupt`, `SystemExit`, and `GeneratorExit` (control flow, not errors), and a bare `except BaseException:` silently swallows `Ctrl-C` and `sys.exit()`.

**Name exceptions in the business's language, not the code's** — `OutOfStock`, not `AllocationError` — and include the offending identifier in the message.

** Never let a secondary lookup miss destroy an already-known-good value.** If the caller supplied the identifier the lookup is trying to enrich, fall back to that input on a miss instead of overwriting with `None`:

```python
# Bad: enrichment miss clobbers caller-supplied data
out["recordId"] = identity.record_id if identity else None

# Good: fall back to what we already know
out["recordId"] = identity.record_id if identity else fallback_id
```

**`except Foo as e` scopes `e` to the `except` block only.** It is not visible in `else` or `finally` — referencing it there raises `NameError`. To use the caught exception in `finally` (logging, cleanup that needs the cause), assign to an outer-scope variable first: `caught: Exception | None = None; try: ...; except Foo as e: caught = e; finally: log.error(caught)`.

**Use `warnings.warn(..., stacklevel=N)` to deprecate without breaking.** For API evolution, raise a `DeprecationWarning` from a helper that points at the *caller's* line, not your own: `warnings.warn("`arg` required soon", DeprecationWarning, stacklevel=3)`. In tests, run with `-W error::DeprecationWarning` (or `PYTHONWARNINGS=error::DeprecationWarning`) so a newly-introduced deprecation fails the build instead of printing a warning. In production, call `logging.captureWarnings(True)` once at startup so the `py.warnings` logger routes through your existing log pipeline. `warnings.warn` is for human-to-human communication about upcoming breakage — exceptions are for machine-handled error paths.

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

**In concurrent servers, capture the traceback explicitly for structured logging.** The default traceback only prints when an exception propagates to the program entry point. In a request handler, an exception that you catch and discard leaves nothing in the logs beyond `repr(e)` — no file, no line, no stack. Use `traceback.extract_tb(e.__traceback__)` to get the frames and log them as structured fields (`[f.name, f.lineno, f.filename]` per frame) so the incident is debuggable after the fact. `traceback.format_exception` gives the same content as the interpreter's default printer if you want plain text.

## 7. Typing Discipline

- **`from __future__ import annotations`** at the top of modules so annotations are strings by default and forward refs cost nothing.
- **Avoid `Any`.** Prefer `object` for "unknown anything" and narrow with `isinstance`; use a `Protocol` for structural typing over an import, an ABC only when you need a real inheritance contract.
- **`Optional[X]` means `X | None`**, not "this argument is optional." An optional argument uses a default (`x: X | None = None`); a required argument that may legitimately be `None` is `Optional[X]` with no default. When `None` is itself a meaningful value, use a module-level sentinel (`_UNSET = object()`) as the default so "not passed" stays distinguishable from explicit `None`.
- **Don't lie with `# type: ignore`.** If the type system fights you, fix the shapes before suppressing; if you must suppress, pin the code and add a reason per the repo's `AGENTS.md`.
- **TypeVars: know bound vs constrained.** `TypeVar('T', bound=X)` accepts any subtype of `X` (used with a `Protocol` for structural generics); constrained `TypeVar('T', A, B)` admits only the listed types and makes inference pick the exact one.
- **Prefer read-only types in parameter positions.** `Sequence[T]`/`Mapping[K, V]` are covariant — they accept subtypes; `list[T]`/`dict[K, V]` are invariant and reject them, which is where the temptation to reach for `cast()` comes from. If you only read, type the parameter as the covariant view.
- **Consider `functools.singledispatch` for many data types × many independent behaviors.** When you have N simple data classes (e.g. AST nodes) and M operations over them (evaluate, pretty-print, type-check, codegen) that share little code, OOP forces you to scatter each operation across N subclasses — touching every class to add a new behavior. `@functools.singledispatch` keeps each operation in one place: define `@singledispatch` then `@func.register(Foo)` for each type. Data classes stay tiny (just attribute holders); operations stay co-located. The catch: adding a new *type* still requires touching every registered operation. Use OOP hierarchies when behaviors share state; use `singledispatch` when behaviors are independent systems over the same data.

## 8. Modern Python Habits

- **`pathlib.Path` over `os.path` string concat.** `Path(base) / "sub" / f"{name}.json"` reads better than `os.path.join(base, "sub", f"{name}.json")` and yields an object, not a string.
- **Decode bytes at the boundary, work in `str`.** Pass explicit `encoding="utf-8"` to `open()` and text-mode I/O instead of relying on the locale default (a classic mojibake source, especially on Windows); never concatenate `bytes` and `str`.
- **F-strings for interpolation, t-strings for untrusted templates.** `f"hello {name}"` beats both `%` and `.format()` for readability and speed. For templates that interpolate user input — shell commands, SQL fragments, file paths, log messages with caller data — use **PEP 750 t-strings** (`t"..."`) which return a structured `Template` you can audit before composing, not a finished string. (See `references/security.md` for the t-string recipe against injection.)
- **`with` for every resource** (files, sockets, locks, subprocess handles). If a class owns a resource, make it a context manager (`__enter__`/`__exit__` or `@contextlib.contextmanager`).
- **Logging, not print.** Use the `logging` module (or `structlog`/`loguru` if the project already does) for anything that runs in production; `print` is for scratch scripts only.
- **`@functools.wraps` on every decorator.** Without it the wrapped function loses `__name__`/`__doc__` — silently breaking tool names and schemas when docstrings feed MCP/OpenAPI.
- **Generators over materialized lists when the consumer iterates once.** Saves memory on large collections and signals streaming intent. But don't return a generator when the caller needs to subscript or iterate twice — materialize.
- **Accumulate under keys with `setdefault`/`defaultdict(list)`.** `d[k] = d.get(k, []) + [v]` rebuilds the list every time (O(n²)); `d.setdefault(k, []).append(v)` or `defaultdict(list)` is linear.
- **Composition over inheritance.** Keep hierarchies shallow; reserve mixins (no state, cooperative `super()`) for cross-cutting behavior — the rare case multiple inheritance is worth it.
- **`subprocess.run(..., shell=False)` always.** Never `shell=True` with interpolated input. Pass `args` as a list and never interpolate caller-provided strings into a command.
- **No `eval`/`exec`, no `pickle` for untrusted input.** Use `ast.literal_eval` for literal structures, or a real parser (`json`, `pydantic`) per section 3.
- **Use `datetime` with explicit `timezone` for any real time work.** The `time` module returns platform-dependent local time and has no concept of time zones; reach for it only when you genuinely mean "seconds since the epoch" (`time.time()`, `time.monotonic()`). For wall-clock timestamps, parse with `datetime.fromisoformat` (3.11+) and always attach a `tzinfo` (`datetime.now(tz=timezone.utc)`) — naive datetimes are a comparison-time landmine.

## 9. Pythonic Style & Idioms

The default style: lean on the language's existing tools and standard idioms rather than reinventing them. Prefer the readable form over the clever one; the obvious-looking code is usually correct.

**Target a current Python in `requires-python`.** Pin the minimum supported version in `pyproject.toml` and use a matching interpreter — features vary across 3.10–3.14 (match/case, parenthesized context managers, exception groups, `tomllib`, `Self`, `StrEnum`, t-strings, free-threading). New code targets the lowest version you must support, not whatever happened to be installed five years ago.

**PEP 8, enforced by Ruff.** `E`/`W` rule sets encode PEP 8; `ruff format` is Black-compatible. Don't maintain a hand-written style guide that disagrees with the tool.

**`enumerate` over `range(len(...))`.** `for i, v in enumerate(xs)` not `for i in range(len(xs)): v = xs[i]`. Pass `start=1` to make the counter one-based.

**`zip` for parallel iteration.** `for k, v in zip(keys, values)` is the standard. For different-length inputs use `itertools.zip_longest(fillvalue=...)`. Pass `strict=True` (3.10+) when lengths *must* match — fail loud rather than silently truncating the longer iterable.

**Multiple-assignment unpacking over indexing.** `key, val = pair` not `pair[0], pair[1]`. For head/middle/tail, `head, *mid, tail = seq` not `head = seq[0]; mid = seq[1:-1]; tail = seq[-1]`.

**Helper function over complex expression.** When a boolean or comprehension is long enough that the reader has to pause and parse, extract to a named function. The name documents the intent; the call site reads as English.

**Assignment expressions (`:=`) for the loop-and-a-half pattern.** Use when you've computed a value inside a `while`/comprehension and want to test-then-reuse it, avoiding a second call or a duplicate expression. Don't reach for `:=` to compress a perfectly readable two-line statement — there are usually two obvious ways to write the line, and that's a readability tax.

**Avoid `else` on `for`/`while` loops.** The `else` clause runs only when the loop completes *without* a `break` — easy to misread as "always run after the loop." Use a flag variable, a helper function, or restructure as `any(...)` / explicit accumulation; the explicit form is easier to reason about than the implicit `else`.

**Default to `itertools` for nontrivial iteration.** Before writing a manual loop with index juggling, check `itertools` first. The standard toolkit:
- `chain(a, b)` / `chain.from_iterable(list_of_iterables)` — flatten multiple iterators without copying
- `islice(it, stop)` / `islice(it, start, stop[, step])` — slice an iterator lazily (no copy)
- `batched(it, n)` (3.12+) — fixed-size non-overlapping groups
- `pairwise(it)` (3.10+) — overlapping `(prev, curr)` pairs
- `accumulate(it, func=...)` — running fold (cumulative sum, modulo arithmetic, etc.)
- `takewhile` / `dropwhile` / `filterfalse` — predicate-bound slicing and complement filtering
- `product` / `permutations` / `combinations` / `combinations_with_replacement` — Cartesian product and combinatorics
- `groupby(it, key=...)` — note: requires input sorted by `key` for grouped output; each new key starts a new group

A named `itertools` call almost always beats a hand-rolled `for` with a counter and an `if`.

## 10. Python Data Model

**Implement protocols, not bespoke accessor APIs.** `__len__` + `__getitem__` buy `len()`, iteration, slicing, `in`, and `random.choice` for free; `__abs__`/`__add__`/`__mul__` make operators and built-ins work. If callers use custom methods where a dunder exists, you're leaking API surface the language already standardizes. For operator overloads, return `NotImplemented` (not `False`, not raise) for unsupported operand types so Python can try the reflected operation — otherwise `x + y` works but `y + x` silently doesn't, and equality becomes asymmetric.

**`__repr__` is for debugging, `__str__` for humans.** Make `__repr__` unambiguous — ideally an expression that reconstructs the object (`Vector(2, 4)`), with `!r` on fields — because it lands in logs, tracebacks, and REPL output.

**Truthiness falls back to `__len__`.** `bool(x)` calls `__bool__` if defined, else `len(x)`, so empty containers are falsy for free; define `__bool__` only when truthiness isn't "non-empty" (a zero `Vector` is falsy).

**Docstring examples are executable specs.** For small pure helpers, `python3 -m doctest` turns docstring examples into tests — docs that can't drift from behavior, at zero test-file overhead.

**For nontrivial container types, inherit from `collections.abc.Sequence` / `Mapping` / `MutableMapping`, not from `list` / `dict` directly.** `__len__` + `__getitem__` alone aren't enough — Python expects `index`/`count`/`__contains__`/`__iter__`/etc. The `collections.abc` ABCs mark each missing method abstract, so the type fails at instantiation rather than at first use, and they supply the unimplemented pieces for free. Subclass `list`/`dict` only when you genuinely want full built-in semantics plus one or two extras.

## 11. Async Correctness

- **Never call blocking I/O inside an async function** without `run_in_executor` — a blocking `requests.get` inside `async def` stalls the whole event loop. Use an async client (`httpx.AsyncClient`, `aiohttp`) or offload.
- **Every await on external I/O needs a timeout** (`asyncio.timeout`/`wait_for`) — an un-timed await hangs the whole task forever on a wedged peer.
- **`asyncio.run` is the entry point of choice** for scripts; don't nest it. Don't call `loop.run_until_complete` yourself unless you're inside a framework that forbids `asyncio.run`.
- **Handle cancellation transparently.** If you catch `CancelledError` to clean up, re-raise it; don't swallow it. Long-running tasks should propagate cancellation.
- **Don't mix sync and async worlds casually** — no bare `await` outside `async def`, no fire-and-forget coroutines (create a task and await/track it).
- **Wrap every blocking system call inside a coroutine in `loop.run_in_executor`.** `async def` makes the *function* a coroutine, but `open()`/`read()`/`write()`/`subprocess.run()` still block the event loop thread while they wait for the kernel. Offload: `await loop.run_in_executor(None, blocking_fn, *args)`. The `await` then yields the event loop normally. Detect offenders with `asyncio.run(coro(), debug=True)` — it logs any coroutine that holds the loop for >100ms with file and line. Common pattern: define a small `async def write_async(data): await loop.run_in_executor(None, output.write, data)` wrapper and call that instead of the blocking function directly.

## 12. Security

Treat every external input as hostile until validated: HTTP bodies, CLI args, file paths, environment variables, config files, and third-party API responses.

- **Never string-interpolate untrusted input into a shell command, SQL query, or file path.** Use parameterized queries (`cursor.execute(query, params)`), `subprocess.run(args_list, shell=False)` with `args` as a list, and validate file paths against an allow-list before joining with `pathlib.Path`.
- **Never call `eval`, `exec`, `pickle.load`/`pickle.loads`, or `yaml.load` without `SafeLoader` on untrusted input.** Use `ast.literal_eval`, `json`, or `yaml.safe_load` instead.
- **`pickle` is for internal serialization only — and use `copyreg` to keep it maintainable.** `pickle.load` on untrusted bytes is arbitrary code execution (the serialized form *is* a program that reconstructs the object). Inside a trust boundary — game state saves, `multiprocessing` IPC, internal caches — `pickle` is fine, but old saved state breaks the moment you add or remove a field. Use the `copyreg` module to register a stable `(reduce_func, constructor)` for your class: `copyreg.pickle(YourClass, your_reducer)`. The reducer returns `(callable, args)` that pickle uses to reconstruct, so you can evolve the class while the constructor signature stays stable. Never `pickle.load` bytes from a network, file upload, or any other untrusted source — that's `json` / `pydantic` territory.
- **Never hardcode secrets, tokens, or credentials in source.** Read them from environment variables or a secrets manager; run `detect-secrets`/`gitleaks` before pushing if the repo doesn't already gate this in CI.
- **Treat `DeprecationWarning` as an error in CI.** Run tests with `python -W error::DeprecationWarning` (or `PYTHONWARNINGS=error::DeprecationWarning`) so a newly-introduced deprecation from a dependency upgrades from a printed warning to a test failure. Catch the regression in your own suite, not in production — by then it's a breaking change for downstream users.
- **Pin dependencies in a hashed lockfile** (`uv.lock`, or PEP 751 `pylock.toml`) rather than an unpinned `requirements.txt`, and run `pip-audit` (or the repo's equivalent) in CI to catch known-vulnerable dependencies before they ship.
- **Log security-relevant events without logging the secret itself.** Auth failures and permission denials are worth logging; the token, password, or full request body that may carry PII is not.

See `references/security.md` for the full OWASP-mapped checklist (injection, auth, crypto, deserialization, supply chain) and canonical source links.

## 13. Performance

- **Profile before optimizing.** `cProfile`/`py-spy` for CPU, `memray`/`tracemalloc` for memory, `Scalene` when you need both plus GPU/native-vs-Python attribution. Guessing the hot path costs more time than a five-minute profile. For "the process keeps growing but I don't know where": `tracemalloc.start(25)` at startup, take `tracemalloc.take_snapshot()` before and after the suspect operation, then `after.compare_to(before, "lineno")[:5]` to see the top 5 allocation sites by `size=` and `count=`. For deeper stack traces, use `compare_to(..., "traceback")` on the top offender; for larger programs, `memray` gives flame graphs and a live REPL once `tracemalloc` isn't enough.
- **Memoize pure functions** with `@functools.cache`/`lru_cache` before reaching for heavier machinery — it's the cheap first win for repeated calls with repeated arguments.
- **Use `decimal.Decimal` for money** and any value where binary-float rounding error is unacceptable; never compare floats with `==`. Repeated increments (`total += 0.1` in a loop) accumulate error even when each looks harmless — recompute from a base value (`n * step`) or use `Fraction`/`Decimal`.
- **Vectorize bulk numeric/tabular work** with NumPy/pandas/Polars instead of a Python-level loop; a `for` loop over a DataFrame is almost always the bug, not the fix.
- **Threads don't parallelize CPU-bound work** — under the GIL they help only I/O-bound tasks; CPU-bound parallelism needs processes (`multiprocessing`/`ProcessPoolExecutor`).
- **Free-threading (PEP 703/779, the `python3.14t` build) is opt-in, not default** — don't assume the GIL is gone. A C extension that hasn't declared thread-safety silently re-enables the GIL for the whole process, and per the CPython release notes, free-threaded single-thread performance still carries roughly a 5-10% penalty. Adopt it only when profiling shows a real multi-core CPU-bound bottleneck that `multiprocessing` doesn't already solve — not speculatively.

- **Use `breakpoint()` for interactive debugging; remove it before committing.** Drop a `breakpoint()` (3.7+) call at the suspicious line — it opens pdb at the call site, no `import pdb; pdb.set_trace()` boilerplate, and honors `PYTHONBREAKPOINT` (set to an empty string in production to disable). Useful pdb commands: `where` (current call stack), `up`/`down` (move between frames), `p <expr>` (print), `interact` (drop into a full REPL with program state). For an already-crashed script: `python -m pdb -c continue <script>` runs under pdb and enters postmortem on uncaught exception; in a REPL, `import pdb; pdb.pm()` enters postmortem at the last traceback. Never commit a `breakpoint()` call — a debugger attached in production is a debugging session you didn't ask for.

See `references/performance.md` for the full profiling workflow, CPython version-by-version performance notes, and library links.

## 14. Tooling & Packaging

- **`pyproject.toml` is the modern norm** (PEP 517/518/621). Prefer it over `setup.py`/`setup.cfg`. Use a build backend already adopted by the repo (hatchling, setuptools, flit); match neighbors.
- **Default toolchain unless the repo already standardizes on something else:** `uv` for envs/dependencies/Python versions, `ruff` for lint+format, `ty` or `mypy`/`pyright` for types, `pytest` (+ `hypothesis` for property-based tests where correctness matters). `uv` and `ruff` are safe defaults for new work; `ty` is beta (stable 1.0 targeted for 2026) — pair it with `mypy` or `pyright` as the CI gate until it reaches parity on the typing conformance suite.
- **Pin versions for reproducibility and loosen them only deliberately.** Exact pins for apps; compatible ranges (`~=x.y`) for libraries. Don't pin a transitive dependency your own `pyproject.toml` doesn't directly use. Generate a hashed lockfile (`uv lock`, or `uv export --format pylock.toml` for PEP 751 portability) rather than an unpinned `requirements.txt`.
- **External tools the project already uses go in tool-specific config** (ruff: `[tool.ruff]`, mypy: `[tool.mypy]`); don't invent a parallel lint config. Check `AGENTS.md` and the repo for the canonical lint command and run it after changes.

- **Break circular imports with `import, configure, run`.** When module A and module B both need each other at top-level, naive `import a` from inside `b` raises `AttributeError: partially initialized module 'a'`. The fix that scales: at module scope define only functions, classes, and constants; defer any cross-module access (`b.configure()` that needs `a.prefs`) to an explicit `configure()` function. The entry point does `import a; import b; a.configure(); b.configure(); b.run()`. All cross-module references resolve after the import graph is fully built. Don't reorder imports to dodge the error — the resulting code is brittle and the cycle will come back.

See `references/tooling.md` for exact commands, the type-checker decision matrix, and canonical doc links (uv, Ruff rules catalog, ty, mypy, Pyright, pytest).

## 15. Cyclomatic Complexity Gate

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

## 16. Test Isolation Patterns

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
- [ ] F-strings used; t-strings used for user-supplied templates (not finished-string interpolation of untrusted input)? `enumerate`/`zip` used over `range(len(...))`/indexed parallel iteration?
- [ ] Objects implement the data model (`__len__`/`__getitem__`/`__repr__`) instead of bespoke accessors; `__repr__` reconstructs the object?
- [ ] Value objects frozen with field equality; entity `__eq__`/`__hash__` consistent on a read-only identity field?
- [ ] `from __future__ import annotations`, no unnecessary `Any`, no unjustified `type: ignore`?
- [ ] No blocking I/O in async; no `eval`/`exec`/`pickle` for untrusted input; `subprocess` uses `shell=False`?
- [ ] No untrusted input reaches `subprocess`/SQL/`eval`/`pickle`/`yaml.load` without parameterization or a safe loader? No hardcoded secrets?
- [ ] Hot path profiled (not guessed) before optimizing; `Decimal` used for money; bulk numeric work vectorized instead of looped; `tracemalloc` snapshot diff used to find memory leaks?
- [ ] State class used instead of `generator.throw()` for state-machine flows; `itertools` used for nontrivial iteration (chain/islice/batched/accumulate/pairwise)?
- [ ] Nontrivial container types inherit from `collections.abc`; `__init_subclass__`/`__set_name__` used instead of metaclasses; `functools.singledispatch` considered for many-types-many-behaviors?
- [ ] `except Foo as e` value preserved into `finally` by reassignment; `Exception` caught (not `BaseException`); `warnings.warn(..., stacklevel=N)` used for deprecations with `-W error` in CI?
- [ ] Coroutines don't block the event loop on system calls (use `run_in_executor`); `asyncio.run(..., debug=True)` run during development to catch stalls?
- [ ] `datetime` with explicit `tzinfo` used for wall-clock work; `pickle` confined to trust boundaries and stabilized with `copyreg`; `breakpoint()` removed before commit?
- [ ] Packaging in `pyproject.toml`; pins deliberate in a hashed lockfile; reuse existing tool config (ruff/mypy/ty)?
- [ ] `pyright`/`mypy`/`ty` clean; repo lint command run; dependencies scanned (`pip-audit` or equivalent)?
- [ ] Cyclomatic complexity: `xenon --max-absolute B` passes for every function/method (no C+); over-complex functions refactored to guard clauses, dispatch tables, or extracted helpers — not suppressed?
- [ ] Tests cover no-match/malformed/empty, not just happy path; union-return subscripts narrowed with `isinstance`; old buggy tests updated rather than shadowed?