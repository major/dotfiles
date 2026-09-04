# Effective Python Decision Cheatsheet

## 1. Core Decision Rules
- **When receiving external data**, decode bytes to `str` with explicit UTF-8 immediately, because implicit conversions and default platform encodings corrupt text.
- **When writing functions with mutable or dynamic defaults**, use `None` and assign inside the body, because default expressions evaluate once at import time.
- **When a function accepts boolean flags or options**, enforce keyword-only arguments with `*`, because positional boolean flags obscure call-site intent.
- **When returning more than 2–3 values from a function**, return a `@dataclass` or `NamedTuple`, because positional tuple destructuring causes silent transposition bugs.
- **When dealing with missing dictionary keys**, use `get()` for static defaults, `defaultdict` for shared containers, and `__missing__` for key-dependent defaults, because `setdefault` allocates defaults eagerly.
- **When iterating over multiple sequences in parallel**, always pass `strict=True` to `zip`, because default `zip` silently truncates to the shortest sequence.
- **When building multi-pass algorithms over iterables**, accept a container with `__iter__`, because raw generators exhaust after one pass and silently produce empty sequences.
- **When handling I/O concurrency**, use `asyncio.TaskGroup` for high-volume cooperative I/O and `ThreadPoolExecutor` for blocking legacy libraries, because standard threads cannot execute CPU-bound bytecode in parallel.
- **When dealing with financial or high-precision math**, use `decimal.Decimal`, because IEEE 754 floating-point arithmetic introduces compounding base-10 inaccuracies.
- **When raising a domain exception inside an `except` block**, always use `raise CustomError() from err`, because omitting `from` loses original traceback context.

---

## 2. Decision Flows

### Choosing a Concurrency Model
```text
Is the bottleneck CPU calculation or waiting on I/O?
├── CPU Calculation
│   ├── Need multi-core scaling?
│   │   ├── Python 3.13+ with Free-Threading? → ThreadPoolExecutor (no GIL)
│   │   └── Standard CPython? → ProcessPoolExecutor / Native C/Rust Extension
│   └── Tight numerical loop? → NumPy / PyO3 / Cython
└── Waiting on I/O
    ├── High-volume network/sockets (>1,000s)? → asyncio + TaskGroup
    ├── Synchronous/blocking libraries used? → asyncio.to_thread / ThreadPoolExecutor
    └── External OS command/CLI? → subprocess.run(..., timeout=N)
```

### Choosing a Data Container
```text
What are the primary operational requirements?
├── Key-value lookups with default values?
│   ├── Static fallback? → dict.get(k, default)
│   ├── Empty container per missing key? → collections.defaultdict(list)
│   └── Default needs key name? → Custom dict with __missing__(key)
├── Ordered sequence with queue operations?
│   ├── FIFO queue (pop left / push right)? → collections.deque (O(1))
│   └── Priority ranking? → heapq with tuples / dataclasses (O(log n))
└── Structured domain entity?
    ├── Mutable entity with methods? → @dataclass(slots=True)
    └── Immutable cache key / set member? → @dataclass(frozen=True, slots=True)
```

---

## 3. Heuristics, Thresholds & Defaults

| Metric / Scenario | Recommended Threshold | Rationale |
|---|---|---|
| Comprehension complexity | Max 2 control expressions | Comprehensions with 3+ `for`/`if` clauses should be refactored into generator functions |
| Tuple return values | Max 2–3 items | Functions returning 4+ values should return dedicated `@dataclass` objects |
| Slicing + Striding | 2 distinct statements | Avoid combining slice bounds and stride in a single `data[a:b:c]` expression |
| Deprecation warning | `stacklevel=2` | Ensures warning points to the caller's line, not the library's internal line |
| In-place Queue operations | `deque` instead of `list` | `list.pop(0)` is O(n); `deque.popleft()` is O(1) |
| Binary I/O buffer slicing | `memoryview` > 10MB | Prevents duplicating multi-megabyte buffers in RAM |

---

## 4. Code Smells & Quick Fixes

- ❌ `def add_item(item, target=[]):`
  - 👉 Fix: `def add_item(item, target=None): if target is None: target = []`
- ❌ `for i in range(len(items)): x = items[i]`
  - 👉 Fix: `for i, x in enumerate(items):`
- ❌ `for name, score in zip(names, scores):`
  - 👉 Fix: `for name, score in zip(names, scores, strict=True):`
- ❌ `if not result:` (when `result` could be `0`, `""`, or `[]`)
  - 👉 Fix: Raise an explicit exception or check `if result is None:`
- ❌ `except:` or `except Exception:` (swallowing errors)
  - 👉 Fix: `except (KeyError, ValueError) as err:` or `raise CustomError() from err`
- ❌ `mock.patch("module.Class")`
  - 👉 Fix: `mock.patch("module.Class", autospec=True)`
