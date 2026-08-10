# Audit: Effective Python 3rd Edition vs. `python-development` skill

Generated 2026-08-09.

**Book:** *Effective Python: 125 Specific Ways to Write Better Python* (3rd ed.), Brett Slatkin, Addison-Wesley, 2024. Targets Python 3.13. 35 items new in this edition; most others revised.

**Skill under review:** `~/.config/opencode/skills/python-development/SKILL.md` (16 sections, ~32 KB) plus `references/{security,performance,tooling}.md`.

## What the book adds that the skill already has

The skill is more comprehensive than the book on the cutting edge: it already covers PEP 750 t-strings, PEP 695 type parameter syntax, PEP 703 free-threading, and the 3.11+ `ExceptionGroup` / `TaskGroup` family — the book skips all of these. The book's value here is reinforcement: a worked example for almost every rule the skill already states as a principle.

## What the book adds that the skill is missing

Most gaps fall into three buckets:
- **Standard-library patterns the skill never names:** `__missing__` (Item 28), `functools.singledispatch` (Item 50), `collections.abc` (Item 57), `__init_subclass__` / `__set_name__` (Items 62-64), `pdb` / `tracemalloc` (Items 114-115), `warnings` (Item 123), `itertools` enumeration (Item 24).
- **Concurrency patterns beyond the skill's basics:** porting threaded I/O to asyncio, mixing threads and coroutines, keeping the event loop responsive with `run_in_executor` (Items 76-78).
- **Robustness/architecture patterns:** state class over `generator.throw` (Item 47), exception-variable scoping in `try`/`except`/`finally` (Item 84), `traceback` module for structured logging (Item 87), module-scoped config code (Item 120), breaking circular dependencies (Item 122).

## Legend

| Symbol | Meaning |
| --- | --- |
| ✓ | Covered: skill has equivalent rule/pattern. |
| ◐ | Partial: skill has adjacent content but missing the specific point. |
| ⚠ | Gap: skill has nothing; book has an actionable rule worth lifting. |
| ○ | N/A: trivial / too advanced for the skill's level — no action. |
| ✗ | Contradicts: book's recommendation conflicts with the skill's stance. |

---

## Chapter 1: Pythonic Thinking (Items 1-9)

| # | Item | Status | Skill section(s) | Action |
|---|---|---|---|---|
| 1 | Know Which Version of Python | ✓ | §8 | Already covered by "Target a current Python in `requires-python`" |
| 2 | Follow the PEP 8 Style Guide | ✓ | §9 | "PEP 8, enforced by Ruff" |
| 3 | Never Expect Python to Detect Errors at Compile Time | ✓ | §7 | Reinforces "Don't lie with `# type: ignore`" and `from __future__ import annotations` |
| 4 | Write Helper Functions Instead of Complex Expressions | ✓ | §9 | "Helper function over complex expression" |
| 5 | Prefer Multiple-Assignment Unpacking over Indexing | ✓ | §9 | Already stated |
| 6 | Always Surround Single-Element Tuples with Parentheses | ○ | — | Too trivial; one-liner gotcha, not skill-worthy |
| 7 | Consider Conditional Expressions for Simple Inline Logic | ○ | — | Style preference; skill avoids prescriptive style nits here |
| 8 | Prevent Repetition with Assignment Expressions | ✓ | §9 | "Assignment expressions (`:=`) for the loop-and-a-half pattern" |
| 9 | Consider `match` for Destructuring in Flow Control | ◐ | §9 | Skill mentions `match`/`case` in passing for dispatch tables but doesn't flag the capture-pattern pitfall (case `RED` is a capture, not a name lookup). Add one sentence. |

## Chapter 2: Strings and Slicing (Items 10-16)

| # | Item | Status | Skill section(s) | Action |
|---|---|---|---|---|
| 10 | Know the Differences Between `bytes` and `str` | ✓ | §8 | "Decode bytes at the boundary, work in `str`" |
| 11 | Prefer Interpolated F-Strings | ✓ | §8 | F-strings already covered; t-strings already covered |
| 12 | Understand the Difference Between `repr` and `str` | ✓ | §10 | "`__repr__` is for debugging, `__str__` for humans" |
| 13 | Prefer Explicit String Concatenation over Implicit | ○ | — | Style preference; not skill-worthy |
| 14 | Know How to Slice Sequences | ◐ | §9 | Skill covers `*mid, tail` unpacking but not the slice conventions (start inclusive / end exclusive). One-liner is enough. |
| 15 | Avoid Striding and Slicing in a Single Expression | ○ | — | Too niche |
| 16 | Prefer Catch-All Unpacking over Slicing | ✓ | §9 | Reinforces "Multiple-assignment unpacking over indexing" |

## Chapter 3: Loops and Iterators (Items 17-24)

| # | Item | Status | Skill section(s) | Action |
|---|---|---|---|---|
| 17 | Prefer `enumerate` over `range` | ✓ | §9 | Already stated |
| 18 | Use `zip` to Process Iterators in Parallel | ✓ | §9 | Skill covers `zip(..., strict=True)` (3.10+) |
| 19 | Avoid `else` Blocks After `for` and `while` Loops | ✓ | §9 | Already stated |
| 20 | Never Use for Loop Variables After the Loop Ends | ○ | — | Common-knowledge gotcha; not skill-worthy |
| 21 | Be Defensive when Iterating over Arguments | ◐ | §3 | Skill's defensive-parsing section covers external data but not iterator exhaustion. The book's pattern is "if the caller passes an iterator, copy it before iterating twice" — worth one sentence in §3. |
| 22 | Never Modify Containers While Iterating | ✓ | §3 | "[x] * n aliases nested items" + Item 22 reinforce the same point |
| 23 | Pass Iterators to `any` and `all` for Short-Circuiting | ○ | — | Trivial |
| 24 | **Consider `itertools` for Working with Iterators** | ⚠ | §9 | **GAP.** Skill mentions itertools once but doesn't enumerate the standard idioms (`chain`, `islice`, `batched`, `pairwise`, `accumulate`, `product`). Add a "Default to `itertools` for nontrivial iteration" subsection. |

## Chapter 4: Dictionaries (Items 25-29)

| # | Item | Status | Skill section(s) | Action |
|---|---|---|---|---|
| 25 | Be Cautious when Relying on Dict Insertion Ordering | ○ | — | Common knowledge; not skill-worthy |
| 26 | Prefer `get` over `in` and `KeyError` | ✓ | §2, §3 | Already covered by defensive parsing |
| 27 | Prefer `defaultdict` over `setdefault` | ✓ | §8 | Already covered by "`setdefault`/`defaultdict(list)`" |
| 28 | **Know How to Construct Key-Dependent Defaults with `__missing__`** | ⚠ | §2 | **GAP.** Skill doesn't mention `__missing__`. Add a one-paragraph note in §2 covering: (a) when `defaultdict` is wrong because the factory needs the key, (b) when `setdefault` is wrong because the value is expensive or may raise, (c) the `__missing__` pattern. |
| 29 | Compose Classes Instead of Deeply Nesting | ✓ | §2 | Reinforces "Compose Classes Instead of Deeply Nesting" + dataclass recommendation |

## Chapter 5: Functions (Items 30-39)

| # | Item | Status | Skill section(s) | Action |
|---|---|---|---|---|
| 30 | Know That Function Arguments Can Be Mutated | ◐ | §3 | Book's example (mutating a passed-in dict changes caller's dict) is the "in-place mutation of dicts you didn't originate" rule. Already covered, but the "aliasing" angle (a and b both point to the same list) is worth one explicit sentence. |
| 31 | Return Dedicated Result Objects Instead of >3 Variables | ✓ | §1 | Reinforces "Return Dedicated Result Objects" and the "let verbs be functions" rule |
| 32 | Prefer Raising Exceptions to Returning `None` | ✓ | §5 | Already covered by "Name exceptions in the business's language" |
| 33 | Know How Closures Interact with Variable Scope and `nonlocal` | ○ | — | Language reference material, not skill-worthy |
| 34 | Reduce Visual Noise with Variable Positional Arguments | ✓ | §8 | Already covered |
| 35 | Provide Optional Behavior with Keyword Arguments | ✓ | §1 | "Keyword-only arguments are API safety" |
| 36 | Use `None` and Docstrings to Specify Dynamic Default Arguments | ✓ | §4, §7 | Skill's "Optional[X] means X \| None" + sentinel-default pattern already cover this |
| 37 | Enforce Clarity with Keyword-Only and Positional-Only Arguments | ✓ | §1 | "Keyword-only arguments are API safety" already covers `*`; add one sentence about `/` for positional-only (Python 3.8+). |
| 38 | Define Function Decorators with `functools.wraps` | ✓ | §8 | Already covered |
| 39 | Prefer `functools.partial` over `lambda` for Glue Functions | ○ | — | Niche; not skill-worthy |

## Chapter 6: Comprehensions and Generators (Items 40-47)

| # | Item | Status | Skill section(s) | Action |
|---|---|---|---|---|
| 40 | Use Comprehensions Instead of `map` and `filter` | ✓ | §2 | "Prefer comprehensions over imperative append-loops" |
| 41 | Avoid More Than Two Control Subexpressions in Comprehensions | ○ | — | Style preference |
| 42 | Reduce Repetition in Comprehensions with Assignment Expressions | ○ | — | Style preference; not skill-worthy |
| 43 | Consider Generators Instead of Returning Lists | ✓ | §8 | Already covered |
| 44 | Consider Generator Expressions for Large List Comprehensions | ✓ | §8 | Already covered |
| 45 | Compose Multiple Generators with `yield from` | ○ | — | Language reference |
| 46 | Pass Iterators to Generators as Arguments | ○ | — | Niche; the `send` method discussion is internal-generator mechanics |
| 47 | **Manage Iterative State Transitions with a Class** | ⚠ | §1, §8 | **GAP.** Book's point: `generator.throw()` looks clever for "reset timer"-style state machines, but the boilerplate (nested `try`/`except StopIteration`, helper threads) is unreadable — a class with `tick()`/`reset()` and `__bool__` is simpler. Add to §1 ("Let verbs be functions") or §8 (generators). |

## Chapter 7: Classes and Interfaces (Items 48-57)

| # | Item | Status | Skill section(s) | Action |
|---|---|---|---|---|
| 48 | Accept Functions Instead of Classes for Simple Interfaces | ✓ | §1 | "Let verbs be functions" already covers this |
| 49 | Prefer Object-Oriented Polymorphism over `isinstance` | ◐ | §7 | Skill mentions Protocols in §7 but not OOP polymorphism as a positive pattern. The book flags the OOP-vs-singledispatch axis (see Item 50). Worth one sentence in §7 noting that for *highly connected* types use a class hierarchy, for *independent* systems over *simple data* consider `singledispatch`. |
| 50 | **Consider `functools.singledispatch` for Functional-Style Programming** | ⚠ | §7 | **GAP.** Skill's §7 mentions Protocols but not `singledispatch`. The book's case: when you have N data types × M behaviors, OOP forces you to scatter behaviors across M modules per class. `singledispatch` lets you keep related behaviors in one place. Add a one-paragraph alternative in §7. |
| 51 | Prefer `dataclasses` for Lightweight Classes | ✓ | §2 | Already covered |
| 52 | Use `@classmethod` Polymorphism to Construct Objects Generically | ○ | — | Internal class design; not skill-worthy |
| 53 | Initialize Parent Classes with `super` | ○ | — | Language reference; not skill-worthy |
| 54 | Consider Composing Functionality with Mix-in Classes | ✓ | §8 | Already covered by "Composition over inheritance" |
| 55 | Prefer Public Attributes over Private Ones | ○ | — | Common knowledge |
| 56 | Prefer `dataclasses` for Creating Immutable Objects | ✓ | §2 | Already covered by "Value objects: `@dataclass(frozen=True)`" |
| 57 | **Inherit from `collections.abc` Classes for Custom Container Types** | ⚠ | §10 | **GAP.** Skill's §10 says "Implement protocols, not bespoke accessor APIs" and lists `__len__` / `__getitem__` but doesn't point to `collections.abc` (Sequence, Mapping, MutableMapping) as the way to get `index`/`count`/`__contains__` for free. Add a one-paragraph note: "for nontrivial container types, inherit from `collections.abc.Sequence`/`Mapping`, not `list`/`dict` — the ABC enforces the full protocol and supplies the rest." |

## Chapter 8: Metaclasses and Attributes (Items 58-66)

| # | Item | Status | Skill section(s) | Action |
|---|---|---|---|---|
| 58 | Use Plain Attributes Instead of Setter and Getter Methods | ○ | — | Common knowledge |
| 59 | Consider `@property` Instead of Refactoring Attributes | ○ | — | Common knowledge |
| 60 | Use Descriptors for Reusable `@property` Methods | ○ | — | Advanced; outside the skill's level |
| 61 | Use `__getattr__`, `__getattribute__`, `__setattr__` for Lazy Attributes | ○ | — | Advanced; outside the skill's level |
| 62 | **Validate Subclasses with `__init_subclass__`** | ⚠ | §2 | **GAP.** Skill's §2 has dataclass + frozen + value-object rules but not the `__init_subclass__` validation pattern. Book's case: validating that a subclass defines required attributes (e.g. `sides >= 3`) at *class definition* time, not at first instantiation. Add a one-paragraph note. |
| 63 | **Register Class Existence with `__init_subclass__`** | ⚠ | §2 | **GAP.** Companion to 62: instead of raising, use `__init_subclass__` to register the new class in a module-level mapping (e.g. for reverse lookups by name/identifier). One paragraph. |
| 64 | **Annotate Class Attributes with `__set_name__`** | ⚠ | §2 | **GAP.** Book's case: descriptor classes that need to know their attribute name without forcing the user to pass it twice. `__set_name__(self, owner, name)` is called automatically on class creation (3.6+). One paragraph. |
| 65 | **Consider Class Body Definition Order** | ⚠ | — | **GAP, advanced.** Book's pattern: walk `cls.__dict__` in `__init_subclass__` to discover fields/methods in the order they were declared. Useful for declarative frameworks (CSV row mappers, plugin registries, workflow steps). One paragraph, mark as advanced. |
| 66 | Prefer Class Decorators over Metaclasses | ◐ | §2 | Reinforces Items 62-64's "metaclass is too heavy" message. Worth a single sentence: "If you reach for a metaclass, stop — `__init_subclass__` and a class decorator cover 90% of the use cases." |

## Chapter 9: Concurrency and Parallelism (Items 67-79)

| # | Item | Status | Skill section(s) | Action |
|---|---|---|---|---|
| 67 | Use `subprocess` to Manage Child Processes | ✓ | §8 | Already covered |
| 68 | Use Threads for Blocking I/O; Avoid for Parallelism | ✓ | §11, §13 | Already covered |
| 69 | Use `Lock` to Prevent Data Races | ✓ | §11 | Already covered |
| 70 | Use `Queue` to Coordinate Work Between Threads | ◐ | — | Book's message: `Queue` works but forces heavy refactoring when scaling. Skill's §11 doesn't address. Marginal — only worth adding if the user often uses threads. |
| 71 | Know How to Recognize When Concurrency Is Necessary | ○ | — | Design advice, not a rule |
| 72 | Avoid Creating New Thread Instances for On-Demand Fan-out | ◐ | — | Same as 70 — niche thread patterns |
| 73 | Understand How `Queue` Refactoring Adds Friction | ◐ | — | Same |
| 74 | Consider `ThreadPoolExecutor` When Threads Are Necessary | ◐ | §11 | Skill mentions `ThreadPoolExecutor` in §11 once; could be more explicit, but covered. |
| 75 | Achieve Highly Concurrent I/O with Coroutines | ✓ | §11 | Already covered |
| 76 | **Know How to Port Threaded I/O to `asyncio`** | ⚠ | §11 | **GAP.** Skill's §11 covers asyncio from scratch but doesn't address the migration path from a threaded codebase. The book walks through converting a `Thread`-per-connection TCP server to `asyncio.start_server` step by step. Add a "Porting threaded I/O to asyncio" subsection. |
| 77 | **Mix Threads and Coroutines to Ease the Transition to `asyncio`** | ⚠ | §11 | **GAP.** Companion to 76: during migration you need both. `asyncio.run_coroutine_threadsafe` to call a coroutine from a thread, `loop.run_in_executor` to call blocking code from a coroutine. Add a "Mixing threads and coroutines during migration" subsection. |
| 78 | **Maximize Responsiveness of `asyncio` Event Loops** | ⚠ | §11 | **GAP.** Skill's §11 says "Every await on external I/O needs a timeout" but doesn't address that *the system call itself* (e.g. `open()`/`write()` called directly in a coroutine) blocks the event loop. Book's two rules: (a) wrap blocking calls in `loop.run_in_executor(None, ...)`; (b) use `asyncio.run(..., debug=True)` to detect long blocking calls. Add to §11. |
| 79 | Consider `concurrent.futures` for True Parallelism | ✓ | §11 | Already covered by "Threads don't parallelize CPU-bound work" |

## Chapter 10: Robustness (Items 80-90)

| # | Item | Status | Skill section(s) | Action |
|---|---|---|---|---|
| 80 | Take Advantage of Each Block in `try/except/else/finally` | ✓ | §5 | Already covered by "Raise specific exceptions, catch specific exceptions" |
| 81 | `assert` Internal Assumptions, `raise` Missed Expectations | ○ | — | Common knowledge; skill assumes this |
| 82 | Consider `contextlib` and `with` Statements | ✓ | §8 | Already covered |
| 83 | Always Make `try` Blocks as Short as Possible | ○ | — | Reinforces §5 implicitly; not a separate rule |
| 84 | **Beware of Exception Variables Disappearing** | ⚠ | §5 | **GAP.** Book's point: `except Foo as e` scopes `e` to the `except` block — it's *not* visible in `else` or `finally`. To log/use it in `finally`, assign to an outer-scope variable first. Skill's §5 doesn't mention this. Add a one-sentence note. |
| 85 | Beware of Catching the Exception Class | ✓ | §5 | Already covered by "Raise specific exceptions, catch specific exceptions" + "no bare `except:`" |
| 86 | Understand the Difference Between `Exception` and `BaseException` | ◐ | §5 | Book's point: catching `Exception` (not `BaseException`) is right because `KeyboardInterrupt` / `SystemExit` / `GeneratorExit` are *not* errors — they're control flow. Skill doesn't state this. Add a one-sentence note next to "no bare `except:`" or in §11 async section. |
| 87 | **Use `traceback` for Enhanced Exception Reporting** | ⚠ | §6 | **GAP.** For concurrent servers, default tracebacks don't surface. Book's recipe: `traceback.extract_tb(e.__traceback__)` for structured JSON logging of `[{frame.name, error_type, error_message}, ...]`. Add a "Best-effort enrichment" example in §6. |
| 88 | Consider Explicitly Chaining Exceptions | ◐ | — | Useful but already implied by the "raise from" idiom in `contextlib`-style usage. |
| 89 | Always Pass Resources into Generators | ◐ | §8 | Reinforces `with` for resources. Niche. |
| 90 | Never Set `__debug__` to `False` | ○ | — | Edge case, not skill-worthy |

## Chapter 11: Performance (Items 91-99)

| # | Item | Status | Skill section(s) | Action |
|---|---|---|---|---|
| 91 | Avoid `exec` and `eval` | ✓ | §8 | Already covered |
| 92 | Profile Before Optimizing | ✓ | §13 | Already covered |
| 93 | Optimize with `timeit` Microbenchmarks | ◐ | §13 | Skill covers profiling but not `timeit` specifically. Worth a one-sentence mention in the profiling gate. |
| 94 | Know When and How to Replace Python with Another Language | ○ | — | Decision-level, not skill-worthy |
| 95 | Consider `ctypes` to Integrate with Native Libraries | ○ | — | Advanced; outside the skill's level |
| 96 | Consider Extension Modules | ○ | — | Advanced |
| 97 | Rely on Precompiled Bytecode and File System Caching | ○ | — | Operational, not a code rule |
| 98 | Lazy-Load Modules with Dynamic Imports | ○ | — | Performance optimization, niche |
| 99 | Consider `memoryview` and `bytearray` | ○ | — | Performance, niche |

## Chapter 12: Data Structures and Algorithms (Items 100-106)

| # | Item | Status | Skill section(s) | Action |
|---|---|---|---|---|
| 100 | Sort by Complex Criteria Using `key` | ◐ | — | Common knowledge; not skill-worthy |
| 101 | Know the Difference Between `sort` and `sorted` | ○ | — | Common knowledge |
| 102 | Consider Searching Sorted Sequences (`bisect`) | ○ | — | Common knowledge |
| 103 | Prefer `deque` for Producer-Consumer Queues | ◐ | — | Marginal; skill assumes "use the right structure" without enumerating |
| 104 | Know How to Use `heapq` for Priority Queues | ○ | — | Same as 103 |
| 105 | **Use `datetime` Instead of `time` for Local Clocks** | ⚠ | — | **GAP, narrow.** Worth one line: "use `datetime` with `timezone.utc`; the `time` module returns platform-dependent local time and has no concept of time zones." |
| 106 | Use `decimal` when Precision Is Paramount | ✓ | §13 | Already covered |

## Chapter 13: Testing and Debugging (Items 107-115)

| # | Item | Status | Skill section(s) | Action |
|---|---|---|---|---|
| 107 | **Make `pickle` Serialization Maintainable with `copyreg`** | ⚠ | §12 | **GAP.** Skill's §12 says "no `pickle` for untrusted input" but doesn't address the maintainability angle. Book's point: when `pickle` is used internally (e.g. `multiprocessing` IPC, game state saves), `copyreg` lets you control which constructor to use on load so old saved state survives class evolution. One paragraph in §12 with a clear "internal use only" caveat. |
| 108 | Verify Related Behaviors in `TestCase` Subclasses | ◐ | §16 | Reinforces "One test class per behavior" |
| 109 | Prefer Integration Tests over Unit Tests | ◐ | §16 | Design choice; the book argues for integration as the default and unit as the tool when integration is too expensive. Skill's §16 takes the more pragmatic "both, depending on what you're asserting" stance — this isn't a clean contradiction but is a viewpoint worth a one-line note. |
| 110 | Isolate Tests with `setUp`, `tearDown`, etc. | ◐ | §16 | Skill covers isolation in §16 via monkeypatching + fixtures; book goes deeper on `setUp`/`tearDown`. Marginal. |
| 111 | Use Mocks to Test Code with Complex Dependencies | ✓ | §16 | Already covered by "Monkeypatch your own internal helpers" |
| 112 | Encapsulate Dependencies to Facilitate Mocking | ◐ | §16 | Book's pattern: pass dependencies as constructor args so tests can swap them. Already implicit in skill's §16. |
| 113 | Use `assertAlmostEqual` to Control Precision | ○ | — | Trivia |
| 114 | **Consider Interactive Debugging with `pdb`** | ⚠ | — | **GAP.** Skill has no debug-in-production guidance. Add a short subsection: "`breakpoint()` (3.7+) drops into pdb at the call site; `python -m pdb -c continue <script>` runs a script under pdb and enters postmortem on uncaught exception; `import pdb; pdb.pm()` enters postmortem from a REPL." |
| 115 | **Use `tracemalloc` to Understand Memory Usage and Leaks** | ⚠ | §13 | **GAP.** Skill's §13 covers CPU profiling but not memory. Book's recipe: `tracemalloc.start(25)`, `take_snapshot()` before/after, `compare_to(..., 'lineno')` to find the top allocation sites by file:line. One paragraph. |

## Chapter 14: Collaboration (Items 116-125)

| # | Item | Status | Skill section(s) | Action |
|---|---|---|---|---|
| 116 | Know Where to Find Community-Built Modules | ○ | §14 | Skill already directs to PyPI / `uv` |
| 117 | Use Virtual Environments for Isolated Dependencies | ✓ | §14 | Already covered by `uv` |
| 118 | Write Docstrings for Every Function, Class, and Module | ✓ | §4 | Already covered by "Docstrings as Contract" |
| 119 | Use Packages to Organize Modules | ◐ | — | Common knowledge; not skill-worthy |
| 120 | **Consider Module-Scoped Code to Configure Deployment Environments** | ⚠ | — | **GAP.** Book's pattern: put `if TESTING: Database = TestingDatabase else: Database = RealDatabase` at module top level so the *same* module behaves differently in dev vs prod without scattering env-reading logic. One paragraph as a "deployment environment configuration" note. |
| 121 | Define a Root Exception to Insulate Callers from APIs | ✓ | §5 | Already covered by "Name exceptions in the business's language" + "module-level base" |
| 122 | **Know How to Break Circular Dependencies** | ⚠ | — | **GAP.** Book's three rules: (1) refactor to put shared state at the bottom of the import graph; (2) **import, configure, run** — defer cross-module access to an explicit `configure()` phase called after all imports; (3) use a separate "config" module as the shared leaf. One paragraph in a new "Module structure" subsection of §14. |
| 123 | **Consider `warnings` to Refactor and Migrate Usage** | ⚠ | §5, §12 | **GAP.** For API evolution, use `warnings.warn(..., DeprecationWarning, stacklevel=N)` to point at the *caller's* line, not your own. In tests, `-W error` turns the warning into a failure; in production, `logging.captureWarnings(True)` routes it through the standard logger. Add a paragraph to §5 (error handling) and a sentence to §12 (security noting `-W error` in CI). |
| 124 | Consider Static Analysis via `typing` to Obviate Bugs | ✓ | §7, §14 | Already covered |
| 125 | Prefer Open Source Projects for Bundling | ○ | — | Edge case (vs. `zipapp`/`zipimport`); not skill-worthy |

---

## Summary: items to add or expand

Ranked by value-to-noise. Each line is one concrete addition to the skill.

### High value (clear gap, common need)

1. **Item 24** — `itertools` enumeration in §9: `chain`/`islice`/`batched`/`pairwise`/`accumulate`/`product`. Replaces ad-hoc loops with named idioms.
2. **Item 50** — `functools.singledispatch` in §7 as the alternative to OOP when you have many data types × many behaviors over independent systems.
3. **Items 62-64** — `__init_subclass__` (validate + register) and `__set_name__` in §2: the three metaclass-shaped patterns that don't need metaclasses in 3.6+.
4. **Item 78** — wrap blocking system calls in `loop.run_in_executor` + use `asyncio.run(..., debug=True)` to detect event-loop stalls. Add to §11.
5. **Item 87** — `traceback.extract_tb` for structured JSON exception logging in concurrent servers. Add to §6.
6. **Item 115** — `tracemalloc` snapshot-diff workflow for memory-leak diagnosis. Add to §13.
7. **Item 114** — `breakpoint()` + postmortem pdb. Add to §13 or a new "Debugging" subsection.
8. **Item 123** — `warnings.warn(..., stacklevel=N)` for deprecations; `-W error` in CI; `logging.captureWarnings(True)` in production. Add to §5/§12.

### Medium value (worth a sentence or short paragraph)

9. **Item 28** — `__missing__` for keys whose default needs the key. Add to §2.
10. **Item 47** — state class instead of `generator.throw()` for timer-like flows. Add to §1 or §8.
11. **Item 57** — `collections.abc.Sequence` / `Mapping` for nontrivial containers, so `index`/`count`/`__contains__` come for free. Add to §10.
12. **Item 84** — `except Foo as e` scopes `e` to the except block; assign to outer-scope variable for `finally`. Add to §5.
13. **Item 122** — `import, configure, run` to break circular deps. Add to §14.
14. **Item 105** — `datetime` + `timezone.utc`, not `time`. One sentence somewhere in §8 or §13.
15. **Item 107** — `copyreg` for maintainable `pickle` (internal use only). Add to §12.
16. **Item 86** — catch `Exception`, not `BaseException` (the latter includes `KeyboardInterrupt`/`SystemExit`/`GeneratorExit`). One sentence in §5.
17. **Item 65** — `cls.__dict__` walk in `__init_subclass__` for declarative ordering. Advanced, one paragraph in §2.

### Low value / defer

- Items 76, 77 (porting threaded I/O to asyncio) — would be useful if the user maintains a threaded codebase; otherwise fold the *idea* into a one-liner in §11 and skip the worked example.
- Items 14, 21, 37, 49, 66, 109, 110, 112 — partial / reinforcement; add one-sentence callouts only when editing those sections for other reasons.

### Reject

- Items 6, 7, 13, 15, 17 (wait, that's 16), 20, 23, 39, 41, 42, 45, 46, 55, 58, 59, 83, 88, 89, 100, 101, 102, 103, 104, 113, 116, 119, 125 — too trivial, too advanced, or pure language-reference material. Don't add to the skill.

### Contradictions

- None found. The book and skill agree on every code-style and design rule where both take a position.

---

## Sources & traceability

- Book text extracted from `/home/major/Downloads/Effective Python: 125 Specific Ways to Write Better Python.pdf` via `pdftotext` (citra's text extraction was hitting its raw-part budget on this image-heavy PDF; the rendered text is reliable).
- Item-to-section mapping uses the skill's current 16-section structure as of 2026-08-09.
