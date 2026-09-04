# Effective Python Design Patterns & Techniques

## Unicode Sandwich
**When to use**: Handling any I/O involving external files, network sockets, databases, or API payloads.
**How**:
1. Decode incoming `bytes` to `str` at the outermost input boundary using explicit `utf-8`.
2. Keep all business logic, manipulation, and transformations strictly within Unicode `str`.
3. Encode `str` back to `bytes` exclusively at the final transmission or write boundary.
**Trade-offs**: Requires explicit boundary discipline, but completely eliminates encoding mismatches and Unicode mixing bugs.

## Dynamic Default Argument Sentinel
**When to use**: Any function parameter requiring a mutable default container (`[]`, `{}`) or runtime calculation (`datetime.now()`).
**How**: Set parameter default to `None` in the signature. Inside the function body, check `if param is None: param = []`. Document behavior in docstring.
**Trade-offs**: Adds a 2-line check inside the function, but prevents shared mutable state bugs across invocations.

## Explicit Parameter Boundaries (`/` and `*`)
**When to use**: Public library functions, mathematical utilities, and functions accepting boolean flags.
**How**:
- Place parameters before `/` to enforce positional-only calls, freeing parameter names to change internally.
- Place parameters after `*` to force keyword-only calls, ensuring callers explicitly name booleans and options.
**Trade-offs**: Slightly more verbose at the call site for keyword arguments, but prevents catastrophic argument-order transposition errors.

## Structured Concurrency with `asyncio.TaskGroup`
**When to use**: Managing asynchronous fan-out operations, concurrent API calls, or multi-task batch processing.
**How**: Wrap task creation in `async with asyncio.TaskGroup() as tg:`. Spawn tasks with `tg.create_task()`. Catch concurrent errors with `except*`.
**Trade-offs**: Requires Python 3.11+, but prevents orphaned background tasks and unhandled task crashes.

## Reusable Context Manager via `@contextmanager`
**When to use**: Encapsulating setup and teardown logic (e.g. temporary logging levels, transaction scopes, directory switches).
**How**: Decorate a generator function containing a single `yield` statement with `@contextlib.contextmanager`. Place setup before `yield`, and mandatory teardown in a `finally` block.
**Trade-offs**: Minor generator overhead compared to a full class implementing `__enter__`/`__exit__`, but significantly faster and cleaner to write.

## Descriptor Validation with `__set_name__`
**When to use**: Reusable attribute validation (e.g., positive numbers, valid email strings) across multiple classes.
**How**: Implement a class with `__set_name__(self, owner, name)` to bind field names dynamically, and store per-instance state in `instance.__dict__[self.internal_name]`.
**Trade-offs**: Adds an extra class indirection, but avoids duplicating `@property` getters and setters across dozens of fields.

## Automatic Plugin Registration with `__init_subclass__`
**When to use**: Building extensible plugin registries, serializers, or factory registries without metaclass complexity.
**How**: Define `def __init_subclass__(cls, plugin_name: str, **kwargs):` on the base class. Subclasses declare `class MyPlugin(Base, plugin_name="custom"):` and register automatically at import time.
**Trade-offs**: Runs at class creation time during import; requires unique registry keys.

## Two-Phase Container Mutation
**When to use**: Modifying or pruning items from a collection (dict, set, list) based on dynamic runtime criteria.
**How**: In Phase 1, iterate over the collection and record target keys or IDs in a separate list/set. In Phase 2, iterate over the deletion list and remove elements from the original collection.
**Trade-offs**: Requires temporary memory for the deletion keys, but avoids `RuntimeError: dictionary changed size during iteration` and skipped list elements.

## Single-Dispatch Polymorphism (`@singledispatch`)
**When to use**: Adding operations (e.g. JSON encoders, HTML formatters) to existing data classes or external types without monkey-patching or subclassing.
**How**: Decorate a base function with `@functools.singledispatch`. Register specialized handlers for individual types using `@fn.register(TargetType)`.
**Trade-offs**: Dispatches only on the type of the first argument; cleaner than modifying external class hierarchies.

## Zero-Copy Binary Buffer Slicing (`memoryview`)
**When to use**: Slicing and transmitting large binary network packets or disk streams (>10MB).
**How**: Wrap the raw `bytes` object in `view = memoryview(data)`. Slice windows using `chunk = view[offset : offset + size]`.
**Trade-offs**: Slightly different API than raw `bytes`, but reduces memory consumption and copying overhead from O(n) to O(1).

## Package Root Exception Insulation
**When to use**: Designing internal and public Python packages and libraries.
**How**: Define `class Error(Exception): pass` in `exceptions.py`. Inherit all domain-specific exceptions from `Error`. Re-export `Error` in `__init__.__all__`.
**Trade-offs**: Requires wrapping external third-party exceptions at the package boundary, but completely protects callers from unexpected internal exception leaks.
