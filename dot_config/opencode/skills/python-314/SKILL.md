---
name: python-314
description: Guidance for writing, reviewing, and migrating code for Python 3.14. Use when the target interpreter is 3.14+, when code uses t-strings (t"..."), string.templatelib, annotationlib, unparenthesized except clauses, or when upgrading a codebase from 3.13 or earlier.
---

# Python 3.14 Skill

## 0. Confirm the target version first
- Check `requires-python` in pyproject.toml, `.python-version`, CI matrices, and Dockerfiles.
- Only use 3.14-only syntax if the minimum supported version is >= 3.14.
- If the project supports older versions, use compatible syntax and gate
  runtime features with `sys.version_info >= (3, 14)`.

## 1. Template strings (PEP 750)
A `t` prefix creates a `string.templatelib.Template`, NOT a `str`.

```python
from string.templatelib import Template, Interpolation

def render_sql(tmpl: Template) -> tuple[str, list]:
    sql, params = [], []
    for part in tmpl:                      # yields str and Interpolation
        if isinstance(part, Interpolation):
            sql.append("?")
            params.append(part.value)
        else:
            sql.append(part)
    return "".join(sql), params

query, args = render_sql(t"SELECT * FROM fills WHERE sym = {sym} AND qty > {qty}")
```

Rules:
- Use t-strings wherever untrusted values meet a structured output:
  SQL, HTML, shell commands, and structured logging.
- Never pass a Template where a `str` is expected. It must be processed by
  a renderer function first.
- `Interpolation` exposes `.value`, `.expression`, `.conversion`, and
  `.format_spec`. The conversion and format spec are NOT applied
  automatically; the renderer decides.
- `Template` also exposes `.strings`, `.interpolations`, and `.values`.
- Only concatenate t-strings with other t-strings. Do not mix them with
  str or f-string literals.
- Valid prefixes: `t`, `T`, `rt`, `tr` (any case). They cannot be combined
  with `f`, `b`, or `u`.

## 2. Unparenthesized except (PEP 758)
```python
try: ...
except ValueError, KeyError:           # OK in 3.14
    ...
except (ValueError, KeyError) as e:    # parentheses REQUIRED with `as`
    ...
```
- Applies to `except*` as well.
- Prefer the parenthesized form in libraries that still support <3.14.

## 3. No control flow out of `finally` (PEP 765)
`return`, `break`, or `continue` exiting a `finally` block emits a SyntaxWarning
because it silently discards in-flight exceptions.
- Never write this in new code.
- When reviewing or migrating, move the `return` after the try/finally block.

## 4. Deferred annotations (PEP 649 / PEP 749)
Annotations are evaluated lazily, on first access.
- Forward references work unquoted: `def next(self) -> Node: ...`
- Do not add `from __future__ import annotations` in 3.14-only code.
  It still works but is unnecessary, and it changes annotations to strings.
- Introspect via `annotationlib`, not raw `__annotations__`:
```python
  from annotationlib import get_annotations, Format
  get_annotations(func, format=Format.FORWARDREF)  # tolerates undefined names
  get_annotations(func, format=Format.VALUE)       # evaluates; may raise NameError
  get_annotations(func, format=Format.STRING)      # source-like strings
```
- Audit metaprogramming such as custom decorators, dependency-injection
  frameworks, and serializers that read annotations at class-creation time.

## 5. Runtime changes that break upgrades
- **Linux multiprocessing default start method is now `forkserver`, not
  `fork`.** Code relying on inherited globals, open sockets, or
  unpicklable state in children will break. Fix the code, or explicitly
  call `multiprocessing.get_context("fork")` if you truly need fork.
- `asyncio.get_event_loop()` raises RuntimeError when no loop is running
  or set. Use `asyncio.run()` or `asyncio.get_running_loop()`.
- `bool(NotImplemented)` raises TypeError.
- Removed: `ast.Num`, `ast.Str`, `ast.Bytes`, `ast.NameConstant`, and
  `ast.Ellipsis`. Use `ast.Constant`.

## 6. New stdlib features to prefer when targeting 3.14
- `compression.zstd`: native Zstandard support (PEP 784).
- `concurrent.interpreters` and `concurrent.futures.InterpreterPoolExecutor`:
  subinterpreter parallelism (PEP 734).
- `uuid.uuid7()`: time-ordered UUIDs, good for DB keys and event IDs.
- `pathlib.Path.copy()` and `.move()`.
- `heapq.heapify_max` and related functions: first-class max-heaps.
- `map(..., strict=True)`: same semantics as `zip(strict=True)`.
- `functools.Placeholder`: positional placeholders in `partial`.
- Free-threaded builds (`python3.14t`) are officially supported (PEP 779).
  Do not assume the GIL protects shared mutable state in code that may run
  on them.

## 7. Review checklist
- [ ] Untrusted input interpolated into SQL, HTML, or shell? Use a t-string plus a renderer.
- [ ] Any `return`, `break`, or `continue` inside `finally`? Remove it.
- [ ] Any raw `__annotations__` access? Switch to `annotationlib`.
- [ ] Multiprocessing code tested under `forkserver`?
- [ ] 3.14-only syntax used while `requires-python` allows older versions? Downgrade it.
