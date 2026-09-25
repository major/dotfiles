# Introduce Context Manager

Background reference: Python-only refactoring (no Fowler equivalent).

## When

Use Introduce Context Manager when resource setup and teardown logic is manually managed with repeated `try...finally` blocks.
Use it when operations require temporary state switches (such as acquiring locks, suppressing exceptions, changing directories, or mocking clocks) that must reliably reset.
Use it to resolve [Repeated Resource Cleanup](../smells/repeated-resource-cleanup.md).

## Python idiom

Python context managers provide deterministic resource cleanup using the `with` statement.
For simple functions and state switches, prefer `contextlib.contextmanager` over writing custom class dunders.
A generator decorated with `@contextmanager` yields the resource within a `try` block and executes cleanup inside `finally`.
For complex objects that maintain their own resource lifecycles (such as database pools or hardware connections), implement `__enter__` and `__exit__` dunder methods directly on the class.

## Mechanics

1. Identify the resource acquisition (setup) and cleanup (teardown) logic duplicated across `try...finally` blocks.
2. If using `@contextlib.contextmanager`: write a generator function that performs setup, `yield`s the resource, and performs cleanup in a `finally` block.
3. If using a class: define `__enter__` to perform setup and return the resource, and `__exit__` to execute cleanup and handle exceptions.
4. Replace manual `try...finally` blocks across all call sites with idiomatic `with` statements.
5. Add Google-style docstrings and type annotations to the context manager.
6. Run tests, linter, and type checker to confirm behavior preservation under both success and exception conditions.

## Preservation pitfalls

- Exception suppression: In `__exit__`, returning `True` swallows exceptions; return `None` or `False` unless exception suppression is explicitly intended.
- Yielding multiple times: A generator wrapped in `@contextmanager` must yield exactly once; yielding multiple times raises `RuntimeError`.
- Reentrancy: Context managers holding mutable state may not be reentrant or reusable across multiple `with` statements unless designed for it.

## Before/After

### Before

```pycon
>>> class ResourceHandle:
...     def __init__(self, name: str):
...         self.name = name
...         self.is_open = True
...     def close(self) -> None:
...         self.is_open = False
>>> handle = ResourceHandle("database")
>>> try:
...     status = f"operating on {handle.name}"
... finally:
...     handle.close()
>>> status
'operating on database'
>>> handle.is_open
False

```

### After

```pycon
>>> from collections.abc import Iterator
>>> from contextlib import contextmanager
>>> class ResourceHandle:
...     """Resource handle with explicit lifecycle states."""
...     def __init__(self, name: str):
...         self.name = name
...         self.is_open = True
...     def close(self) -> None:
...         """Close the resource handle."""
...         self.is_open = False
>>> @contextmanager
... def managed_resource(name: str) -> Iterator[ResourceHandle]:
...     """Context manager ensuring resource handle cleanup."""
...     handle = ResourceHandle(name)
...     try:
...         yield handle
...     finally:
...         handle.close()
>>> with managed_resource("database") as handle:
...     status = f"operating on {handle.name}"
>>> status
'operating on database'
>>> handle.is_open
False

```
