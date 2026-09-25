---
name: python-311-syntax
description: Use when writing, reviewing, or migrating Python code targeting 3.11+, or when deciding whether code is compatible with 3.10. Covers except*/ExceptionGroup, variadic generics (*Ts), starred for-targets, nested async comprehensions, and 3.11 typing/stdlib idioms (Self, LiteralString, NotRequired, TaskGroup, tomllib, StrEnum, add_note).
---

# Python 3.11 Syntax & Idioms

## 1. Determine the target version first
- Check `pyproject.toml` (`requires-python`), `setup.cfg`, `.python-version`, CI matrix, or Dockerfile base image.
- If the minimum is **3.10 or lower**, do NOT emit any construct in section 2. Use the fallbacks in section 4.
- If the minimum is **>= 3.11**, prefer the 3.11 idioms in section 3 over older patterns.

## 2. Grammar that is a SyntaxError on 3.10
These break parsing of the whole module on 3.10, so version checks cannot guard them.

### except* (PEP 654)
```python
try:
    ...
except* ValueError as eg:   # eg is an ExceptionGroup containing only ValueErrors
    for e in eg.exceptions: ...
except* (KeyError, TypeError) as eg:
    ...
```
Rules (violations are SyntaxErrors):
- Never mix `except` and `except*` in one `try`.
- No bare `except*:`; no `except* ExceptionGroup`.
- No `break` / `continue` / `return` inside an `except*` body.
- Multiple `except*` clauses may ALL run; unmatched leftovers are re-raised as a group.
- Catching a group with plain `except ExceptionGroup` is still legal and valid on 3.11.

### Star unpacking in subscripts / *args annotations (PEP 646)
```python
from typing import TypeVarTuple, Generic
Ts = TypeVarTuple("Ts")
class Array(Generic[*Ts]): ...
def f(*args: *Ts) -> tuple[*Ts]: ...
```

### Starred for-targets
```python
for x in *a, *b: ...
```

### Nested async comprehensions (inside async def)
```python
async def g():
    return [[y async for y in src(i)] for i in range(n)]
```

## 3. Preferred 3.11 idioms (when target >= 3.11)
| Old pattern | Use instead |
|---|---|
| `T = TypeVar("T", bound="Cls")` for returning self | `from typing import Self` |
| `class TD(TypedDict, total=False)` split into two classes | `NotRequired[...]` / `Required[...]` |
| `asyncio.gather(...)` with manual cancellation | `async with asyncio.TaskGroup() as tg:` + `except*` |
| `asyncio.wait_for(coro, t)` | `async with asyncio.timeout(t):` |
| `import toml` / `tomli` for reading | `import tomllib`; open files in `"rb"` mode |
| `class Color(str, Enum)` | `class Color(enum.StrEnum)` |
| Wrapping an exception only to add context | `err.add_note("context"); raise` |
| Unreachable-branch comments | `typing.assert_never(value)` for exhaustiveness |
| `str` params that flow into SQL or shell | Annotate as `LiteralString` |

TaskGroup pattern:
```python
async def run_all(jobs):
    try:
        async with asyncio.TaskGroup() as tg:
            tasks = [tg.create_task(j()) for j in jobs]
    except* TimeoutError as eg:
        log.warning("timeouts: %d", len(eg.exceptions))
    return [t.result() for t in tasks if t.done() and not t.cancelled() and t.exception() is None]
```

## 4. Fallbacks for <= 3.10 targets
- ExceptionGroup / except*: `pip install exceptiongroup`; use `exceptiongroup.catch({ValueError: handler})` in place of `except*`.
- `*Ts`: use `typing_extensions.Unpack[Ts]` (e.g. `Generic[Unpack[Ts]]`, `*args: Unpack[Ts]`).
- `Self`, `LiteralString`, `NotRequired`, `Never`, `assert_never`, `dataclass_transform`: import from `typing_extensions`.
- `tomllib`: `tomli` (same API).
- `TaskGroup` / `timeout`: `anyio` task groups or `async_timeout`.
- Conditional imports:
```python
import sys
if sys.version_info >= (3, 11):
    import tomllib
else:
    import tomli as tomllib
```

## 5. Behavior changes to watch during migration
- `with` on a non-context-manager raises `TypeError` (was `AttributeError`). Update any tests that assert the old type.
- Octal escapes above `\377` in string literals emit `DeprecationWarning`.
- Tracebacks show `^^^^` markers. Tests that snapshot traceback text may need updating.
- `asyncio.TaskGroup` cancels sibling tasks on the first failure, unlike `gather(return_exceptions=True)`.

## 6. Review checklist
- [ ] Target version confirmed before using any section-2 syntax
- [ ] No `except`/`except*` mixing; no control-flow keywords inside `except*`
- [ ] `tomllib.load` receives a binary file handle
- [ ] `typing_extensions` used for any 3.11 typing feature when supporting <= 3.10
- [ ] Tests updated for the `TypeError`-on-`with` change
