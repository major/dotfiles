---
name: slatkin-effective-python
description: "Knowledge base from \"Effective Python: 125 Specific Ways to Write Better Python (3rd Edition)\" by Brett Slatkin. Use when applying Pythonic design patterns, writing clean and robust Python code, optimizing performance and concurrency, or referencing any of the 125 items."
---

<!-- argument-hint: [topic, framework name, item number, or chapter number] -->

# Effective Python: 125 Specific Ways to Write Better Python (3rd Edition)
**Author**: Brett Slatkin | **Pages**: ~670 | **Chapters**: 14 (125 Items) | **Generated**: 2026-08-24

## How to Use This Skill

- **Without arguments** — load core frameworks and mental models for general Python guidance
- **With a topic** — ask about `concurrency`, `dataclasses`, `descriptors`, `slicing`, or `walrus operator` to load targeted concepts
- **With item number** — ask for `item 36` or `item 77` to get the exact rule and code example
- **With chapter** — ask for `ch05` or `ch09` to load that specific chapter deep dive
- **Browse** — ask "what chapters do you have?" to see the complete index

When answering questions on specific Python idioms, I reference the underlying chapter files and 125 items.

---

## Core Frameworks & Mental Models

### 1. Pythonic Thinking & Expression Ergonomics
- **Write Helper Functions over Dense One-Liners (Item 4)**: Code readability is paramount. Extract nested conditional expressions, chained dictionary gets, or complex boolean logic into explicit helper functions.
- **Multiple-Assignment & Starred Unpacking (Items 5, 16)**: Destructure sequences directly (`a, b = b, a` and `first, *middle, last = items`) instead of calculating manual index offsets.
- **Assignment Expressions / Walrus Operator (Item 8)**: Use `(var := expr)` within `if` and `while` conditions to avoid duplicate lookups and eliminate awkward variable assignment ceremonies.
- **Structural Pattern Matching with Discipline (Item 9)**: Use `match/case` when destructuring nested shapes, sequences, or mappings with guard conditions; stick to standard `if/elif` for simple scalar value comparisons.

### 2. Data Structures, Iteration & Dictionaries
- **Unicode Sandwich (Item 10)**: Decode incoming `bytes` to `str` with explicit `utf-8` at system boundaries, process internally as Unicode `str`, and encode back to `bytes` exclusively at output boundaries.
- **Strict Parallel Iteration (Item 18)**: Always pass `strict=True` to `zip()` unless truncation to the shortest iterator is explicitly intended.
- **Defensive Multi-Pass Iteration (Item 21)**: Iterators and generators exhaust after a single pass. Wrap data in container classes implementing `__iter__()` when algorithms must iterate multiple times.
- **Missing Key Resolution Protocol (Items 26–28)**: Use `dict.get()` for primitive defaults, `collections.defaultdict` for uniform mutable collections (e.g. `list`, `set`), and subclass `dict` with `__missing__` for key-dependent dynamic values. Avoid `dict.setdefault()` due to eager default evaluation.

### 3. Functions & API Design
- **Dynamic Default Arguments (Item 36)**: Default argument expressions evaluate *once* at module import time. Always default dynamic or mutable parameters to `None` and initialize them inside the function body (`if arg is None: arg = []`).
- **Signature Boundary Enforcement (Item 37)**: Use positional-only markers (`/`) to decouple internal parameter names from caller code, and use keyword-only markers (`*`) to force explicit naming of boolean flags and optional configurations.
- **Decorator Introspection Preservation (Item 38)**: Always decorate wrapper functions with `@functools.wraps(func)` to preserve `__name__`, docstrings, annotations, and introspection metadata.
- **Comprehension Discipline (Items 40–42)**: Prefer comprehensions over `map`/`filter` with lambdas. Limit comprehensions to at most two control subexpressions; refactor heavier transformations into generator functions.

### 4. Object-Oriented Design & Metaprogramming
- **Progressive Attribute Refactoring (Items 58–60)**: Start with plain public attributes. Migrate to `@property` only when validation or dynamic computation becomes necessary. Extract repeated property logic into descriptors implementing `__set_name__`.
- **Cooperative Super Initialization (Item 53)**: Always use `super().__init__(*args, **kwargs)` in subclass hierarchies to respect Method Resolution Order (MRO) and avoid broken diamond inheritance.
- **Subclass Registration over Metaclasses (Items 62, 63)**: Use `__init_subclass__` on base classes to validate child classes and register plugins automatically at import time, avoiding metaclass complexity.
- **Standard Container ABCs (Item 57)**: Subclass `collections.abc.Sequence`, `Mapping`, or `MutableMapping` to inherit complete, standard-compliant container interfaces.

### 5. Concurrency, Parallelism & Robustness
- **Structured Concurrency with `asyncio.TaskGroup` (Item 77)**: Use `async with asyncio.TaskGroup() as tg:` in Python 3.11+ to manage concurrent tasks, guaranteeing that all tasks finish or cancel cleanly upon error.
- **Event Loop Protection with `asyncio.to_thread` (Item 76)**: Never run CPU-heavy or blocking synchronous functions directly on the `asyncio` event loop; offload them with `await asyncio.to_thread()`.
- **CPU Parallelism via `ProcessPoolExecutor` (Item 78)**: The GIL prevents standard threads from running CPU-bound Python bytecode in parallel. Use `ProcessPoolExecutor` (or explore Python 3.13+ free-threaded builds) for multi-core parallelism.
- **Four-Block Error Handling & Root Exceptions (Items 80, 84, 85)**: Use `try/except/else/finally` to isolate error handling from success logic and resource cleanup. Define package-level root exceptions, and preserve traceback context with `raise CustomError() from err`.

---

## Chapter Index

| # | Title | Items Covered | Key Frameworks & Concepts |
|---|-------|---------------|---------------------------|
| [ch01](chapters/ch01-pythonic-thinking.md) | Pythonic Thinking | Items 1–9 | PEP 8, Walrus operator (`:=`), Helper functions, Unpacking, `match/case` |
| [ch02](chapters/ch02-strings-and-slicing.md) | Strings and Slicing | Items 10–16 | Unicode Sandwich, `bytes` vs `str`, F-strings, Starred unpacking, Striding |
| [ch03](chapters/ch03-loops-and-iterators.md) | Loops and Iterators | Items 17–24 | `enumerate`, `zip(..., strict=True)`, Defensive iteration, `itertools` |
| [ch04](chapters/ch04-dictionaries.md) | Dictionaries | Items 25–29 | `dict.get`, `defaultdict`, `__missing__`, De-nesting dicts to classes |
| [ch05](chapters/ch05-functions.md) | Functions | Items 30–39 | Dynamic defaults (`None`), Positional/keyword boundaries (`/`, `*`), `@wraps` |
| [ch06](chapters/ch06-comprehensions-and-generators.md) | Comprehensions and Generators | Items 40–47 | Comprehensions vs `map`/`filter`, `yield from`, Generator pipelines |
| [ch07](chapters/ch07-classes-and-interfaces.md) | Classes and Interfaces | Items 48–57 | `@dataclass`, `super()` MRO, Mix-ins, `singledispatch`, `collections.abc` |
| [ch08](chapters/ch08-metaclasses-and-attributes.md) | Metaclasses and Attributes | Items 58–66 | `@property`, Descriptors (`__set_name__`), `__init_subclass__`, `__getattr__` |
| [ch09](chapters/ch09-concurrency-and-parallelism.md) | Concurrency and Parallelism | Items 67–79 | `TaskGroup`, `asyncio.to_thread`, GIL, `ProcessPoolExecutor`, Free-threading |
| [ch10](chapters/ch10-robustness.md) | Robustness | Items 80–91 | `try/except/else/finally`, `@contextmanager`, Root exceptions, `Protocol` |
| [ch11](chapters/ch11-performance.md) | Performance | Items 92–99 | `cProfile`, `timeit`, `memoryview` zero-copy, Lazy dynamic imports, `ctypes` |
| [ch12](chapters/ch12-data-structures-and-algorithms.md) | Data Structures and Algorithms | Items 100–107 | `collections.deque`, `heapq`, `bisect`, `decimal.Decimal`, `copyreg` |
| [ch13](chapters/ch13-testing-and-debugging.md) | Testing and Debugging | Items 108–115 | `unittest.TestCase`, `self.subTest`, `autospec=True`, `tracemalloc`, `pdb` |
| [ch14](chapters/ch14-collaboration.md) | Collaboration | Items 116–125 | `venv`, PEP 257 docstrings, `__all__` API boundaries, Circular imports, `warnings` |

---

## Topic Index

- **`__all__` API boundaries** → ch14
- **`__getattr__` / `__getattribute__`** → ch08
- **`__init_subclass__` plugin registration** → ch08
- **`__missing__` dictionary defaults** → ch04
- **`__repr__` vs `__str__`** → ch02
- **`__slots__` optimization** → ch07, ch11
- **`asyncio` & `TaskGroup`** → ch09
- **`autospec=True` mocking** → ch13
- **Binary data & `bytes`** → ch02, ch11
- **`bisect` binary search** → ch12
- **`breakpoint()` and `pdb`** → ch13
- **Circular dependency resolution** → ch10, ch14
- **Classes & Mix-ins** → ch07
- **Comprehensions** → ch01, ch06
- **Context managers (`contextlib`)** → ch10
- **`dataclass` (frozen/slotted)** → ch04, ch07
- **`decimal.Decimal`** → ch12
- **Decorators & `functools.wraps`** → ch05
- **Default arguments (`None` sentinel)** → ch05
- **`deque` queues** → ch12
- **Descriptors & `__set_name__`** → ch08
- **Docstrings & PEP 257** → ch14
- **`enumerate` vs `range`** → ch03
- **Exceptions (Root, Chaining, Four-block)** → ch05, ch10, ch14
- **F-strings formatting** → ch02
- **Free-threaded Python (no GIL)** → ch09
- **Generators & `yield from`** → ch03, ch06
- **Global Interpreter Lock (GIL)** → ch09
- **`heapq` priority queues** → ch12
- **Helper functions** → ch01, ch05
- **`itertools`** → ch03
- **Keyword-only / Positional-only (`*`, `/`)** → ch05
- **Lazy imports** → ch11
- **`match/case` pattern matching** → ch01
- **`memoryview` zero-copy** → ch11
- **Method Resolution Order (`super()`)** → ch07
- **PEP 8 style guide** → ch01
- **Profiling (`cProfile`, `timeit`)** → ch11
- **`Protocol` (structural typing)** → ch10
- **`queue.Queue`** → ch09
- **Single-dispatch (`@singledispatch`)** → ch07
- **Slicing & Starred unpacking** → ch01, ch02
- **Sorting (`sort` vs `sorted`, key functions)** → ch12
- **`subTest` testing** → ch13
- **`tracemalloc` memory debugging** → ch11, ch13
- **Unicode Sandwich** → ch02
- **Virtual environments (`venv`)** → ch14
- **Walrus operator (`:=`)** → ch01, ch06
- **Warnings & deprecations** → ch10, ch14
- **`zip(..., strict=True)`** → ch03

---

## Supporting Files

- [glossary.md](glossary.md) — Alphabetical definitions of all key terms and mechanisms
- [patterns.md](patterns.md) — Reusable architectural design patterns and protocols
- [cheatsheet.md](cheatsheet.md) — Decision rules, heuristics, flowcharts, and code smells

---

## Scope & Limits

This skill encapsulates the Python 3.13-aligned best practices, patterns, and principles from *Effective Python (3rd Edition)*. Note: Diagrammatic image contents from the EPUB source were omitted during text extraction, but all code structures, tables, and architectural principles are fully represented.
