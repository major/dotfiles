# Chapter 3: Program Structure and Control Flow

## Core Idea
Python executes statements in source order, with `if`, `for`, `while`, exceptions, and context managers providing the essential control structures.

## Frameworks Introduced
- **Exception hierarchy and propagation**: exceptions are class-based objects that move outward until handled.
  - When to use: report failure at the layer that can add useful context or recover.
  - How: catch narrowly, chain with `raise ... from ...` when translating, and preserve traceback meaning.
- **Context manager protocol**: pair setup and cleanup around a `with` block.
  - When to use: files, locks, connections, and any resource with guaranteed release.

## Key Concepts
- **Traceback**: execution path recorded with an exception.
- **Exception chaining**: explicit causal relation between failures.
- **Assertion**: developer invariant checked only when `__debug__` is true.
- **Iteration variable**: loop binding that remains after the loop.

## Mental Models
Exceptions represent errors, including invalid input; do not use them for expected, non-error branching.
Exceptions can be valid control flow in narrow contexts such as iterator termination, cancellation, or a parser that deliberately signals a failed alternative.
Think of `with` as a lifetime boundary whose exit runs even when the body raises.

## Anti-patterns
- **Bare `except`**: it catches interrupts and unrelated failures.
- **Assertions for input validation**: optimized execution can remove them.
- **Swallowing exceptions**: it destroys diagnostic information and hides broken invariants.

## Code Examples
```python
with open(filename) as file:
    for line in file:
        process(line)
```
- **What it demonstrates**: deterministic resource cleanup.

## Worked Example
For a parser, catch `ValueError` at the boundary where it can become `ConfigError`, and use `raise ConfigError(name) from exc` so the original cause remains visible.
Raise exceptions for errors, including invalid input; do not use them for expected non-error branching.
Catch only where recovery is possible, or where a higher layer can add meaningful context.

## Source-Named Sections
- **The Exception Hierarchy**: derive application exceptions from `Exception`, catch the narrow type you can recover from, and let unrelated failures propagate.
- **Chained Exceptions and Tracebacks**: translate an error only when the higher layer has a useful vocabulary, preserving the causal traceback with `from`.
- **Context Managers and the `with` Statement**: resource owners implement `__enter__` and `__exit__`; cleanup belongs next to acquisition.
- **Assertions and `__debug__`**: assert invariants useful during development, but use normal checks for required behavior.

## Decision Rules
- If the caller can recover, catch and handle; if it cannot add context, propagate.
- If cleanup must happen on every exit path, use `with`, not duplicated `try/finally` code.
- If the condition is expected and frequent, use ordinary control flow rather than exception-driven application logic.

## Key Takeaways
1. Keep normal control flow in statements and reserve exceptions for failures.
2. Catch the narrowest useful exception type.
3. Put resource ownership in a context manager.

## Connects To
- **Ch 4**: context managers and exceptions are protocols and classes.
- **Ch 9**: file and stream operations depend on these boundaries.
