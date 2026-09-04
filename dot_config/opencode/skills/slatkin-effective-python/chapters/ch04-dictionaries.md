# Chapter 4: Dictionaries

## Core Idea
Dictionaries are Python's central data structure. Writing idiomatic dictionary code requires mastering key-lookup ergonomics (`get` vs `defaultdict` vs `__missing__`), avoiding eager construction overhead, and recognizing when nested dictionary structures should be refactored into modular classes.

## Frameworks Introduced
- **Missing-Key Handling Protocol**: Selecting the appropriate dictionary access pattern based on default construction cost and key dependency.
  - When to use: Whenever querying dictionaries for potentially missing keys.
  - How:
    1. Use `dict.get(key, default)` for static or primitive default values.
    2. Use `collections.defaultdict` when every missing key initializes the same container type (e.g., `list`, `set`, `int`).
    3. Implement a custom `dict` subclass with `__missing__(self, key)` when the default value depends dynamically on the specific key being accessed.
- **Data Structure De-nesting Refactoring**: Transforming deeply nested dictionaries into hierarchical class compositions.
  - When to use: As soon as a dictionary's values contain nested dictionaries, lists of tuples, or exceed two levels of nesting.
  - How: Replace internal layers with lightweight `dataclasses` or named container classes, preserving clear attribute names and type safety.

## Key Concepts
- **Insertion Order Guarantee**: Modern Python (3.7+) guarantees that standard dictionaries preserve insertion order, but code should not rely on order when interacting with arbitrary mapping types.
- **`dict.get()`**: Method for retrieving values with a fallback default (`d.get(k, 0)`), avoiding explicit `KeyError` exception handling.
- **`setdefault` Trap**: `dict.setdefault(key, default)` always evaluates its default expression eagerly on every call, even if the key already exists, creating unnecessary allocations.
- **`collections.defaultdict`**: A dictionary subclass that calls a provided zero-argument factory function whenever a missing key is accessed.
- **`__missing__()` Magic Method**: A method defined on `dict` subclasses that Python invokes automatically when a requested key is not present during `d[key]` access.
- **Dictionary Composition**: Modeling domain entities as structured objects with typed fields rather than arbitrary nested mapping trees.

## Mental Models
- **Think of `setdefault` as an antipattern for expensive objects**: Because `setdefault(k, [])` creates a new `[]` on every call before checking if `k` is present, prefer `defaultdict(list)` instead.
- **Think of `__missing__` as a key-aware factory**: When the default value must know the requested key name (e.g. opening a file named after the key), `__missing__` is the only clean native mechanism.
- **Replace nested dictionaries with classes before adding a third level of nesting**: If you find yourself writing `grades[student][subject][term]`, immediately refactor into domain classes.

## Anti-patterns
- **Using `try/except KeyError` or `in` checks for simple defaults**: Writing 4 lines of boilerplate where `dict.get(key, default)` achieves the same result in one line.
- **Overusing `setdefault`**: Using `setdefault` to manage mutable internal collections, resulting in confusing syntax and wasted object allocations.
- **Deeply nested primitive collections**: Using dictionaries of lists of dictionaries to model real-world business domains, leading to fragile code without auto-completion or static typing.
- **Assuming all mappings preserve order**: Writing code that assumes custom `Mapping` implementations adhere to Python's built-in dict insertion order guarantees.

## Code Examples

### Dynamic Key-Dependent Defaults with `__missing__`
```python
class Pictures(dict):
    """Custom dict that opens file handles dynamically based on key name."""
    def __missing__(self, key: str):
        value = open_picture(key)
        self[key] = value
        return value

def open_picture(path: str):
    try:
        return open(path, "a+b")
    except OSError:
        raise KeyError(f"Failed to open picture {path}")

# Usage
pictures = Pictures()
handle = pictures["profile.png"]  # Calls __missing__("profile.png") automatically
```
- **What it demonstrates**: Creating clean, key-aware default value generation via subclassing and `__missing__`.

### `defaultdict` vs `setdefault` for Internal State
```python
from collections import defaultdict

# Anti-pattern: setdefault allocates a new list on EVERY call
# class Visits:
#     def __init__(self):
#         self.data = {}
#     def add(self, country, city):
#         self.data.setdefault(country, []).append(city)

# Pythonic: defaultdict handles initialization cleanly without eager allocation
class Visits:
    def __init__(self):
        self.data = defaultdict(set)

    def add(self, country: str, city: str) -> None:
        self.data[country].add(city)

visits = Visits()
visits.add("England", "Bath")
visits.add("England", "London")
```
- **What it demonstrates**: Cleaner state management and zero redundant allocations using `defaultdict`.

### Refactoring Nested Dictionaries to Classes
```python
from dataclasses import dataclass, field

# Anti-pattern: Fragile nested dictionary
# report = {"Alice": {"Math": [90, 95], "English": [85]}}

# Pythonic: Composed dataclasses
@dataclass
class GradeBook:
    grades: list[float] = field(default_factory=list)

    def add_grade(self, score: float) -> None:
        self.grades.append(score)

    @property
    def average(self) -> float:
        return sum(self.grades) / len(self.grades) if self.grades else 0.0

@dataclass
class Student:
    subjects: dict[str, GradeBook] = field(default_factory=lambda: defaultdict(GradeBook))
```
- **What it demonstrates**: Refactoring nested primitive structures into maintainable, typed class hierarchies.

## Reference Tables

### Missing Key Handling Decision Matrix
| Requirement | Recommended Tool | Reason |
|---|---|---|
| Static fallback value (e.g. `0`, `None`, `"unknown"`) | `dict.get(key, default)` | Minimal syntax, fast C-level execution |
| Shared mutable collection (e.g. `list`, `set`) | `collections.defaultdict(list)` | Factory runs only on actual cache misses |
| Expensive default construction | `if key not in d: d[key] = expensive()` | Avoids creating expensive objects unnecessarily |
| Default value requires key name or context | Subclass `dict` with `__missing__(key)` | Encapsulated, transparent `d[key]` syntax |

## Worked Example

### Refactoring a Multi-Tenant Rate Limiter Cache
Track API hit counts per tenant and endpoint, automatically instantiating window metrics without nested dictionary chaos.

```python
from collections import defaultdict
from dataclasses import dataclass, field
import time

@dataclass
class EndpointMetric:
    call_count: int = 0
    last_reset: float = field(default_factory=time.time)

    def record_hit(self, window_seconds: float = 60.0) -> bool:
        now = time.time()
        if now - self.last_reset > window_seconds:
            self.call_count = 0
            self.last_reset = now
        self.call_count += 1
        return self.call_count <= 100  # Max 100 req/min

class TenantRateLimiter:
    def __init__(self):
        # Nested defaultdict automatically provisions hierarchy
        self._tenants: dict[str, dict[str, EndpointMetric]] = defaultdict(
            lambda: defaultdict(EndpointMetric)
        )

    def check_request(self, tenant_id: str, endpoint: str) -> bool:
        metric = self._tenants[tenant_id][endpoint]
        return metric.record_hit()

# Execution
limiter = TenantRateLimiter()
assert limiter.check_request("org_123", "/api/v1/orders") is True
```

## Key Takeaways
1. Use `dict.get()` with defaults for basic value retrieval instead of checking `in` or catching `KeyError`.
2. Avoid `dict.setdefault()` when defaults are expensive to instantiate; use `collections.defaultdict` instead.
3. Subclass `dict` and implement `__missing__` when default values depend on the missing key itself.
4. Refactor nested dictionaries containing more than two levels into structured `dataclasses` or domain classes.
5. Do not write code that relies critically on dictionary ordering when accepting generic mapping interfaces.

## Connects To
- **Ch 7**: Connects with `dataclasses` (Item 51) and custom container ABCs (Item 57).
- **Ch 8**: Feeds into dynamic attribute lookups and descriptor patterns.
