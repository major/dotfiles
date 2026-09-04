# Chapter 5: Functions

## Core Idea
Functions are Python's primary composition mechanism, and their signatures, scopes, return values, and side effects define usable interfaces.

## Frameworks Introduced
- **Explicit function interfaces**: make accepted inputs, outputs, errors, and side effects understandable from the call boundary.
  - When to use: every public or callback-facing function.
  - How: use keyword-only options, immutable defaults, type hints when checked, and consistent return behavior.
- **First-class functions and closures**: functions can be stored, passed, returned, and retain enclosing bindings.
  - When to use: callbacks, deferred work, policies, and composition.
  - How: bind loop values deliberately and preserve metadata with `functools.wraps` in decorators.

## Key Concepts
- **Call signature**: the legal arrangement of arguments.
- **Default argument**: evaluated once at function definition.
- **Closure**: function plus retained enclosing bindings.
- **Decorator**: callable that transforms or wraps another callable.
- **Partial application**: callable with some arguments pre-bound.
- **Applicative order**: arguments evaluated before the call.

## Mental Models
Prefer a small function with explicit inputs over hidden global state.
Use `partial()` when adapting a callable's signature, especially where serialization matters.
`partial()` binds arguments eagerly when it is created; a lambda can defer evaluation until called.
Pickleability is conditional on the underlying callable and all bound values being pickleable, so do not promise serialization merely because `partial()` was used.

## Anti-patterns
- **Mutable default arguments**: state leaks across calls.
- **Unpreserved decorator metadata**: wrappers hide names, docs, and signatures.
- **Unbounded dynamic execution**: `exec()` and `eval()` create security and maintenance hazards.

## Code Examples
```python
def func(x, items=None):
    if items is None:
        items = []
    items.append(x)
    return items
```
- **What it demonstrates**: safe handling of per-call mutable state.

## Worked Example
Given `def after(seconds, func, *args): ...`, use `partial(func, configured_value)` when the callback needs a fixed argument before submission.
Choose a lambda when the value must be computed later or when the callable is intentionally local, and choose `partial()` when eager binding, a visible callable object, or conditional pickleability is useful.

## Source-Named Sections
- **Default Arguments**: defaults are evaluated once at definition time, so mutable defaults retain state between calls.
- **Scoping Rules**: names resolve local, enclosing, global, then built-in; use `nonlocal` only when a closure intentionally updates enclosing state.
- **Higher-Order Functions and Callbacks**: callbacks invert control, so explicitly design how arguments, results, and callback errors travel.
- **Decorators and `@wraps`**: preserve function metadata when wrapping, and keep decorator order deliberate.
- **Function Introspection**: `__name__`, `__doc__`, `__annotations__`, `__closure__`, `inspect.signature()`, `globals()`, and `locals()` expose useful diagnostics, not a substitute for a stable API.
- **Asynchronous Functions and `await`**: await coroutines from async code; an event loop or other framework must drive them, and `async with` is required for async context managers.

## Decision Rules
- Use a closure for private retained state, a class when state needs a visible protocol, and a plain function for stateless transformation.
- Use type hints when a checker consumes them; the interpreter does not enforce them.
- Return `None` for a deliberate mutator only when that convention makes side effects obvious.

## Key Takeaways
1. Treat the function signature as an API contract.
2. Minimize side effects and document unavoidable ones.
3. Use closures and decorators deliberately because they alter evaluation and metadata.

## Connects To
- **Ch 6**: generators change the execution model of functions.
- **Ch 7**: methods and descriptors are function-binding mechanisms.
