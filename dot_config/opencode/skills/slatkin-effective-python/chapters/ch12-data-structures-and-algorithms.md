# Chapter 12: Data Structures and Algorithms

## Core Idea
Python's standard library provides highly optimized, production-grade data structures and algorithmic primitives. Writing fast, reliable Python software requires selecting the appropriate algorithmic tool for the job: `deque` for O(1) queues, `heapq` for priority heaps, `bisect` for O(log n) binary search, `decimal` for exact financial arithmetic, and `copyreg` for resilient object serialization.

## Frameworks Introduced
- **Multi-Criteria Key Sorting Protocol**: Composing stable multi-level sort criteria via tuple keys.
  - When to use: When sorting objects across multiple fields with mixed ascending/descending order.
  - How: Pass `key=lambda x: (x.primary_field, -x.secondary_field)` to `sort()` or `sorted()`. For types that cannot be negated with `-`, chain multiple `sort()` calls from least significant to most significant key relying on Timsort's stability.
- **Binary Search Lookup Protocol (`bisect`)**: Executing O(log n) searches on sorted sequences.
  - When to use: When querying large static or append-only sorted datasets (e.g. timestamp lookups, tax brackets, score tables).
  - How: Use `bisect.bisect_left(data, target)` to find insertion indices or exact matches without scanning through O(n) elements.
- **O(1) Double-Ended Queue Protocol (`collections.deque`)**: Building fast FIFO pipelines.
  - When to use: For producer-consumer buffers, sliding windows, and task scheduling.
  - How: Replace `list.pop(0)` (which takes O(n) time) with `collections.deque.popleft()` (which takes O(1) time).
- **Priority Queue Protocol (`heapq`)**: Managing ranked workloads and finding top-k items.
  - When to use: For job schedulers, Dijkstra shortest-path algorithms, and real-time top-k leaderboards.
  - How: Store tuples `(priority, index, task)` in a list and maintain min-heap invariants with `heapq.heappush()` and `heapq.heappop()`.

## Key Concepts
- **`list.sort()` vs `sorted()`**: `list.sort()` mutates the list in place and returns `None` (saving memory); `sorted(iterable)` accepts any iterable and returns a fresh sorted `list`.
- **`bisect`**: Module providing binary search functions (`bisect_left`, `bisect_right`, `insort`) for sorted lists.
- **`collections.deque`**: Double-ended queue implemented as a doubly-linked list of memory blocks, offering O(1) appends and pops from both ends.
- **`heapq`**: Standard library module implementing binary min-heaps on top of standard Python lists.
- **`decimal.Decimal`**: Fixed-point and floating-point arithmetic with user-specifiable precision, eliminating IEEE 754 binary floating-point rounding errors (e.g. `0.1 + 0.2 == 0.3`).
- **`copyreg`**: Module for registering custom functions to serialize and deserialize custom classes with `pickle`, ensuring schema evolution compatibility.

## Mental Models
- **Think of `list.pop(0)` as an O(n) memory shift**: Every time `list.pop(0)` is called, Python must shift all remaining elements one slot forward in memory; use `deque.popleft()` for O(1) constant-time queue operations.
- **Think of `heapq` as a self-sorting bucket**: Instead of sorting the entire list after every insertion (O(n log n)), `heappush` positions the new item in O(log n) time while keeping the minimum at index 0 in O(1) time.
- **Use `Decimal` whenever money is involved**: Standard `float` values cannot represent base-10 fractions like `$0.10` exactly, leading to compounding accounting discrepancies.

## Anti-patterns
- **Using `list` as a FIFO queue**: Calling `list.insert(0, item)` or `list.pop(0)`, resulting in O(n) quadratic slowdowns under high volume.
- **Linear search on sorted sequences**: Iterating through sorted lists with `for item in items:` instead of using `bisect.bisect_left()`.
- **Using standard `float` for currency and accounting**: Performing financial calculations with IEEE 754 floats, causing precision rounding bugs.
- **Sorting entire lists repeatedly to get the minimum/maximum**: Calling `items.sort()` repeatedly instead of maintaining a `heapq` or using `heapq.nsmallest()` / `heapq.nlargest()`.
- **Unversioned `pickle` serialization**: Pickling internal classes without `copyreg` registration, causing deserialization crashes when classes are renamed or refactored.

## Code Examples

### Priority Queue with `heapq`
```python
import heapq
from dataclasses import dataclass, field
from typing import Any

@dataclass(order=True)
class PrioritizedTask:
    priority: int
    task_id: int = field(compare=False)
    data: Any = field(compare=False)

class PriorityQueue:
    def __init__(self):
        self._heap: list[PrioritizedTask] = []

    def push(self, priority: int, task_id: int, data: Any) -> None:
        # Binary heap insertion in O(log n) time
        heapq.heappush(self._heap, PrioritizedTask(priority, task_id, data))

    def pop(self) -> PrioritizedTask:
        # Extracts lowest priority value in O(log n) time
        return heapq.heappop(self._heap)

# Usage
pq = PriorityQueue()
pq.push(priority=2, task_id=101, data="Send email")
pq.push(priority=1, task_id=102, data="Security alert")
pq.push(priority=3, task_id=103, data="Backup database")

assert pq.pop().data == "Security alert"  # Lowest number = highest priority
```
- **What it demonstrates**: Building an efficient priority queue with `heapq` and dataclass ordering.

### Exact Financial Calculations with `Decimal`
```python
from decimal import Decimal, ROUND_HALF_UP

# Anti-pattern: IEEE 754 float precision loss
# total = 0.1 + 0.2  # 0.30000000000000004

# Pythonic: Exact arithmetic with Decimal
rate = Decimal("0.0825")  # 8.25% sales tax
subtotal = Decimal("19.99")
tax = (subtotal * rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
total = subtotal + tax

print(f"Tax: ${tax}, Total: ${total}")
assert total == Decimal("21.64")
```
- **What it demonstrates**: Exact decimal arithmetic and rounding for financial calculations.

### O(log n) Binary Range Lookup with `bisect`
```python
import bisect

# Breakpoint lookup for grading scale
breakpoints = [60, 70, 80, 90]
letter_grades = ["F", "D", "C", "B", "A"]

def calculate_grade(score: int) -> str:
    # bisect returns insertion index in O(log n) time
    idx = bisect.bisect_right(breakpoints, score)
    return letter_grades[idx]

assert calculate_grade(85) == "B"
assert calculate_grade(95) == "A"
assert calculate_grade(55) == "F"
```
- **What it demonstrates**: Implementing threshold and range lookup in O(log n) time using `bisect`.

## Reference Tables

### Standard Collection Time Complexity Comparison
| Operation | `list` | `collections.deque` | `heapq` (on list) | `set` / `dict` |
|---|---|---|---|---|
| Append Right | O(1) amortized | O(1) | O(log n) (`heappush`) | O(1) |
| Pop Right | O(1) | O(1) | O(log n) (`heappop`) | O(1) |
| Append Left / Pop Left | **O(n)** | **O(1)** | N/A | N/A |
| Find Minimum | O(n) (or sort) | O(n) | **O(1)** (`heap[0]`) | O(n) |
| Search Target | O(n) (or O(log n) with `bisect`) | O(n) | O(n) | **O(1)** |

## Worked Example

### Building a High-Throughput Request Rate Monitor
Implement a rolling 60-second request rate window with O(1) amortized updates and fast percentile tracking.

```python
import collections
import time
from typing import Deque

class RollingWindowRateLimiter:
    def __init__(self, window_seconds: float = 60.0):
        self.window_seconds = window_seconds
        self.timestamps: Deque[float] = collections.deque()

    def record_request(self) -> int:
        now = time.time()
        self.timestamps.append(now)
        
        # Evict timestamps older than the rolling window in O(1) time
        cutoff = now - self.window_seconds
        while self.timestamps and self.timestamps[0] < cutoff:
            self.timestamps.popleft()
            
        return len(self.timestamps)

# Usage
monitor = RollingWindowRateLimiter(window_seconds=60.0)
for _ in range(5):
    current_rate = monitor.record_request()
print(f"Current 60s request volume: {current_rate}")
```

## Key Takeaways
1. Use the `key` parameter in `sort()` and `sorted()` to define complex, multi-criteria ordering via tuples.
2. Remember that `list.sort()` mutates in-place (returning `None`), while `sorted()` returns a new list from any iterable.
3. Use `bisect.bisect_left` for O(log n) lookups and insertions in sorted sequences.
4. Always use `collections.deque` instead of `list` for FIFO queues and rolling windows to guarantee O(1) performance.
5. Use `heapq` for priority queues and finding top-k items (`nsmallest`/`nlargest`) without full sorting.
6. Use `decimal.Decimal` whenever calculations require exact precision and controlled rounding (such as financial systems).
7. Use `copyreg` to ensure long-term maintainability and schema evolution for `pickle` serialization.

## Connects To
- **Ch 3**: Integrates with loops, iterators, and `itertools`.
- **Ch 4**: Bridges with dictionary access patterns and custom mappings.
- **Ch 11**: Provides the algorithmic foundation for profiling and performance optimization.
