---
name: python-315
description: Use when writing, reviewing, upgrading, or debugging Python code that targets Python 3.15+, or when migrating a codebase from 3.14 or earlier. Covers new syntax (lazy imports, unpacking in comprehensions), new builtins (frozendict, sentinel), typing additions, behavior changes (UTF-8 default, GC revert), and the Tachyon sampling profiler.
---

# Python 3.15

## Step 1: Determine the target version

Before using any 3.15-only feature, check `requires-python` in pyproject.toml, CI matrices, Dockerfiles, and `.python-version`.

- If the minimum is 3.15 or later, use 3.15 idioms freely.
- If the project supports older versions, use only the backward-compatible forms noted below, or gate the code on `sys.version_info >= (3, 15)`.
- New syntax cannot be version-gated at runtime, because it is a SyntaxError at parse time on older interpreters.

## New syntax (3.15+ only)

### Lazy imports (PEP 810)

```python
lazy import numpy as np
lazy from decimal import Decimal
```

- `lazy` is a soft keyword. Loading is deferred until the name is first used.
- It is only allowed at module scope. Using it inside a function, class body, or try/except/finally is a SyntaxError.
- Star imports and `__future__` imports cannot be lazy.
- ImportErrors surface at first use, not at the import line. The traceback shows both locations.
- Backward-compatible alternative for multi-version code: `__lazy_modules__ = ["numpy", "decimal"]` at the top of the module makes ordinary imports of those modules lazy on 3.15, and is ignored on older versions.
- Global switch: `-X lazy_imports=all` or `PYTHON_LAZY_IMPORTS=all`. Fine-grained control: `sys.set_lazy_imports_filter()`.
- Do NOT make an import lazy if it has side effects that must run at startup, such as registering plugins or codecs, or monkeypatching.

### Unpacking in comprehensions (PEP 798)

```python
flat = [*chunk for chunk in chunks]         # replaces chain.from_iterable
merged = {**cfg for cfg in layers}          # later keys win
uniq = {*s for s in sets}
gen = (*row for row in rows)
```

Prefer this over nested comprehensions or `itertools.chain` when targeting 3.15+.

### Unary plus in match literals

`case +1:` is now valid, mirroring `case -1:`.

## New builtins

- `frozendict`: an immutable, hashable (if its contents are hashable) mapping. Equality ignores order. It is NOT a dict subclass, so `isinstance(x, dict)` returns False. When reviewing code that should accept any mapping, use `collections.abc.Mapping`.
  - To build a deeply immutable result from JSON: `json.loads(s, object_pairs_hook=frozendict, array_hook=tuple)`.
- `sentinel`: use it instead of `_MISSING = object()`. Sentinels survive copying, work in `T | MISSING` annotations, and can be pickled when importable. Check the exact constructor signature in the docs before writing it.

## Typing

- `typing.TypeForm[T]` annotates parameters that receive type expressions, for example `def parse[T](typ: TypeForm[T], raw: str) -> T`.
- `TypedDict` accepts `closed=True` (no extra keys allowed) and `extra_items=<type>` (extra keys allowed, with values of that type).
- `slice` is generic: `slice[int, int, int]`.
- `TypeVarTuple` accepts `bound`, `covariant`, `contravariant`, and `infer_variance`.

## Behavior changes: check these during migration

1. **UTF-8 is the default encoding.** `open()` without `encoding=` now uses UTF-8 regardless of locale. For code that must work across versions, always pass `encoding=` explicitly. `encoding="locale"` restores the old behavior for a single call, and `PYTHONUTF8=0` restores it globally.
2. **GC reverted to generational.** 3.14.0 through 3.14.4 shipped an incremental GC that caused memory pressure. 3.14.5+ and 3.15 are back to the 3.13 behavior. If you are investigating memory regressions on early 3.14 builds, recommend upgrading.
3. **Frame pointers are on by default.** Native extensions (C, C++, Rust) should also build with `-fno-omit-frame-pointer`, because a single component without frame pointers breaks unwinding for the whole process.
4. **The `profile` module is deprecated** and will be removed in 3.17. Use `profiling.tracing` (the new home of cProfile) or `profiling.sampling`.
5. **`re.match` is soft-deprecated** in favor of `re.prefixmatch`. It still works, so there is no need to churn existing code, but prefer `prefixmatch` in new code.
6. **`__cached__` is no longer set.** Use `__spec__.cached` instead.
7. **`importlib.metadata`** now raises `MetadataNotFound` instead of returning empty metadata.
8. **Removals.** Check the "Removed" section of What's New for anything the codebase imports from ast, glob, pathlib, platform, sre_*, typing, and similar modules.

## Useful stdlib additions

- `asyncio.TaskGroup.cancel()` terminates a group early. Use it instead of raising and suppressing a custom exception.
- `bytearray.take_bytes(n=None)` extracts bytes without copying. Use it in buffer and protocol-parsing code instead of `bytes(buf); buf.clear()`.
- `threading.synchronized_iterator()` and `threading.concurrent_tee()` provide thread-safe iteration, which matters for free-threaded builds.
- `math.integer` is a new module for integer math functions. `math` also gains `fmax`, `fmin`, `signbit`, `isnormal`, and `issubnormal`.
- `os.statx()` is available on Linux 4.11+ with glibc 2.28+.
- `subprocess.Popen.wait(timeout=...)` now uses pidfd on Linux 5.3+ instead of busy-polling.
- `contextmanager`, when used as a decorator on a generator or coroutine function, now keeps the context open for the full iteration or await.

## Profiling with Tachyon

Recommend this for performance work, especially in production:

```bash
python -m profiling.sampling attach <PID> --live           # top-style TUI
python -m profiling.sampling attach <PID> -a --flamegraph   # all threads, HTML flame graph
python -m profiling.sampling run --mode cpu script.py       # CPU time only, excludes I/O
python -m profiling.sampling dump <PID> --async-aware       # snapshot of a hung process
```

Available modes are `wall` (the default), `cpu`, `gil`, and `exception`. Available output formats are `--pstats`, `--collapsed`, `--flamegraph`, `--gecko`, and `--heatmap`.

## Code review checklist for 3.15 targets

- Slow top-level imports in CLIs or short-lived processes: suggest `lazy`.
- `chain.from_iterable` or double-for comprehensions: suggest `*` unpacking.
- `object()` sentinels: suggest `sentinel`.
- `MappingProxyType` or hand-rolled frozen dicts: suggest `frozendict`.
- `isinstance(x, dict)` on inputs: check whether a `frozendict` could arrive.
- `open()` without `encoding=`: flag it if the code relies on locale behavior.

Reference: https://docs.python.org/3.15/whatsnew/3.15.html
