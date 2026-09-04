# Decision Cheatsheet

## Choose the Representation
| If the data is... | Use | Remember |
|---|---|---|
| Unicode characters | `str` | decode at input, encode at output |
| Raw binary | `bytes` | indexing yields integers |
| Incrementally built binary | `bytearray` | mutable, then convert if needed |

## I/O Choices
- Use the protocol's specified encoding, commonly UTF-8, not UTF-8 by assumption.
- Choose `rt`/`wt` for text and `rb`/`wb` for bytes; specify `newline` when exact newline behavior matters.
- Use buffering for throughput, flushing for latency, and `readinto(preallocated_buffer)` when repeated reads can fill one contiguous destination buffer.
- Use polling for a nonblocking readiness loop, `threading` to isolate blocking calls, and `asyncio` when the whole application is awaitable.

## Choose the Abstraction
- If a direct built-in expresses the operation, use it before writing a loop.
- If data should stream or be lazy, use a generator expression or generator function.
- If state and behavior form a stable unit, use a class.
- If only behavior varies, inject a function or policy and prefer composition.
- If consumers need Pythonic behavior, implement the smallest relevant protocol.

## Boundary Rules
- Use `is None` for the `None` singleton; use `==` for values.
- Use `isinstance()` for subtype-aware checks; avoid exact `type(x) == ...` unless exactness is required.
- Use immutable defaults; use `None` as the sentinel for fresh mutable state.
- Catch narrow exception types and preserve causes with exception chaining.
- Use `assert` for developer invariants, never required runtime validation.
- Decode and encode explicitly; do not mix `str` and `bytes`.
- Never unpickle untrusted data: object deserialization can permit remote code execution.

## Execution Tells
- A generator call did not run its body: consume it.
- An async function call did not run its body: await from async code while an event loop or framework drives execution.
- An import did not reload changed source: inspect `sys.modules` and restart rather than mutating cache casually.
- A custom built-in subclass behaves inconsistently: use `UserDict`, `UserList`, or composition.
- A package command needs a stable entry point: add `__main__.py` and run `python -m package`; reserve the guard for a runnable module.
- A repeated scan needs independent traversals: make `__iter__` return a fresh generator.
- A class allocates many small instances: measure before using `__slots__`; it restricts dynamic attributes and some inheritance patterns.
- A cache must not own its values: use weak references and accept that entries can disappear after collection.
