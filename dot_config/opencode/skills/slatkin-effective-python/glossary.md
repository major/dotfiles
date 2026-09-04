# Glossary of Effective Python Terms

**`__all__`** — A module-level list of strings defining the explicit public API surface exported during wildcard imports and analyzed by documentation tools (Ch 14).
**`__getattr__`** — A fallback method called only when an attribute lookup fails to find the attribute in an instance's dictionary or class tree; ideal for lazy loading (Ch 8).
**`__getattribute__`** — A hook called unconditionally on every attribute access; requires delegating to `super().__getattribute__` to avoid infinite recursion (Ch 8).
**`__init_subclass__`** — A classmethod hook executed whenever a class is subclassed; replaces metaclasses for class validation and plugin registration (Ch 8).
**`__missing__`** — A method on `dict` subclasses called automatically when a requested key is absent during `d[key]` access (Ch 4).
**`__repr__`** — Special method returning an unambiguous, developer-focused string representation of an object (Ch 2).
**`__slots__`** — A class-level declaration that restricts valid attribute names, eliminating per-instance `__dict__` overhead and saving 40–60% memory (Ch 7, Ch 11).
**`__str__`** — Special method returning a human-friendly, readable string representation of an object (Ch 2).
**`any()` and `all()`** — Built-in short-circuiting functions that evaluate iterables lazily without materializing full collections (Ch 3).
**Assignment Expression (`:=`)** — Syntax (the walrus operator) that assigns a value to a variable within a conditional or expression (Ch 1, Ch 6).
**`asyncio.TaskGroup`** — Context manager providing structured concurrency in Python 3.11+, guaranteeing child task lifecycle management and cleanup (Ch 9).
**`asyncio.to_thread`** — Helper function that offloads blocking synchronous functions to a background thread to prevent event loop stalls (Ch 9).
**`autospec=True`** — Parameter in `unittest.mock` ensuring mock objects strictly mirror the real class's API signature and argument names (Ch 13).
**`bisect`** — Standard library module providing O(log n) binary search and insertion functions for sorted sequences (Ch 12).
**`breakpoint()`** — Built-in function (PEP 553) that drops execution into an interactive `pdb` debugging session (Ch 13).
**`bytes`** — Built-in immutable sequence of raw 8-bit unsigned integers; distinct from Unicode `str` (Ch 2).
**Catch-All Unpacking (`*`)** — Destructuring syntax that captures remaining items of an iterable into a list during assignment (Ch 1, Ch 2).
**`collections.abc`** — Standard library module providing abstract base classes (`Sequence`, `Mapping`, `MutableMapping`) for custom containers (Ch 7).
**`collections.deque`** — Double-ended queue offering O(1) appends and pops from both ends (Ch 12).
**`contextlib.ExitStack`** — Programmatic context manager coordinator for handling dynamic or variable numbers of context managers (Ch 10).
**`dataclass`** — Decorator (PEP 557) that automatically generates boilerplate methods (`__init__`, `__repr__`, `__eq__`) from typed field annotations (Ch 7).
**`decimal.Decimal`** — Fixed-point and floating-point arithmetic class providing exact base-10 precision and customizable rounding modes (Ch 12).
**Defensive Copying** — Creating an independent duplicate of a container before mutating or iterating over it (Ch 3, Ch 5).
**Descriptor** — An object attribute defining `__get__`, `__set__`, or `__delete__` to customize attribute access behaviors across classes (Ch 8).
**Dynamic Default Argument** — Setting default parameters to `None` and initializing mutable or runtime values inside the function body (Ch 5).
**`enumerate()`** — Built-in function that yields `(index, item)` pairs from an iterable, replacing `range(len(...))` (Ch 3).
**`ExceptionGroup`** — Python 3.11+ container exception aggregating multiple concurrent errors into a unified hierarchy (Ch 9).
**F-String** — Interpolated string literal (`f"..."`) providing fast, readable formatting and inline expression evaluation (Ch 2).
**Free-Threaded CPython** — Python 3.13+ build mode (PEP 703) operating without the Global Interpreter Lock (GIL) (Ch 9).
**`functools.partial`** — Function adapter that freezes a subset of function arguments and keyword arguments (Ch 5).
**`functools.singledispatch`** — Decorator transforming a function into a single-dispatch generic function based on the first argument's type (Ch 7).
**`functools.wraps`** — Decorator that copies names, docstrings, annotations, and metadata from the wrapped function to the wrapper (Ch 5).
**Global Interpreter Lock (GIL)** — Mutex in CPython preventing multiple native OS threads from executing bytecode simultaneously (Ch 9).
**`heapq`** — Standard library module implementing binary min-heap algorithms on standard Python lists (Ch 12).
**Keyword-Only Arguments (`*`)** — Parameters defined after a bare `*` that callers must supply as keyword arguments (Ch 5).
**`memoryview`** — Built-in object that allows zero-copy slicing and buffer access of binary data without allocating new memory (Ch 11).
**Method Resolution Order (MRO)** — The deterministic C3 linearization order Python follows when searching for methods across inheritance trees (Ch 7).
**Mix-in Class** — Small class defining only utility methods without instance state, designed to be composed via multiple inheritance (Ch 7).
**Name Mangling** — Python's transformation of `__private` attributes into `_ClassName__private` to prevent name clashes in subclasses (Ch 7).
**PEP 8** — The official Python Enhancement Proposal specifying style and formatting guidelines (Ch 1).
**PEP 257** — The official Python Enhancement Proposal specifying docstring conventions (Ch 14).
**Positional-Only Arguments (`/`)** — Parameters defined before a `/` that callers must supply positionally, decoupling parameter names from APIs (Ch 5).
**`ProcessPoolExecutor`** — Concurrency executor running tasks in separate worker processes to bypass the GIL for CPU-bound parallelism (Ch 9).
**`queue.Queue`** — Thread-safe FIFO queue supporting thread coordination and bounded backpressure via `maxsize` (Ch 9).
**Root Exception** — A base `class Error(Exception): pass` defined at the package level to insulate callers from internal exceptions (Ch 10, Ch 14).
**Structural Pattern Matching (`match/case`)** — Python 3.10+ construct testing expressions against sequence, mapping, and class patterns (Ch 1).
**`subTest`** — Context manager in `unittest.TestCase` enabling table-driven parameterized assertions without early failure aborts (Ch 13).
**`super()`** — Built-in proxy object delegating method calls to parent or sibling classes in accordance with MRO (Ch 7).
**`tracemalloc`** — Standard library module tracking Python memory allocations and attributing memory spikes to source code lines (Ch 11, Ch 13).
**`typing.Protocol`** — Structural typing interface class enabling compile-time duck typing checks without explicit inheritance (Ch 10).
**Unicode Sandwich** — Architectural pattern of decoding bytes to `str` at boundaries, processing internally as `str`, and encoding to bytes at output (Ch 2).
**`yield from`** — Syntax delegating generator execution directly to a subgenerator, enabling clean recursive traversals (Ch 6).
**`zip(..., strict=True)`** — Safe parallel iterator pairing that raises `ValueError` if sequences differ in length (Ch 3).
**`zoneinfo.ZoneInfo`** — Standard library IANA time zone support for timezone-aware datetime manipulation (Ch 10, Ch 12).
