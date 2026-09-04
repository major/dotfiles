# Chapter 3: Loops and Iterators

## Core Idea
Python's iteration protocols allow expressive, memory-efficient data processing, but iterators are stateful single-use streams. Writing robust loops requires understanding iterator exhaustion, avoiding container mutation during iteration, enforcing parallel sequence alignment, and leveraging `itertools` for compositional pipelines.

## Frameworks Introduced
- **Defensive Iterator Protocol**: Ensuring functions that iterate multiple times do not silently exhaust caller-provided iterators.
  - When to use: When writing functions that take an iterable and need to make multiple passes (e.g., calculating normalizations, percentages, or statistics).
  - How: Accept a container class that implements `__iter__` to yield new iterator instances on each pass, or defensively convert single-use iterators using `iter(arg) is arg` detection.
- **Strict Parallel Iteration (`zip(..., strict=True)`)**: Pairing iterators safely without silent data loss.
  - When to use: When iterating over two or more sequences that are expected to have identical lengths.
  - How: Call `zip(seq1, seq2, strict=True)` to raise `ValueError` on length mismatch, or use `itertools.zip_longest` with a `fillvalue` if uneven lengths are expected.
- **Two-Phase Container Mutation**: Separating query/filtering from container modification.
  - When to use: When removing or updating elements in a dictionary, set, or list based on runtime conditions.
  - How: Identify targets in a first pass and store keys/indices in a separate collection, then apply mutations in a second pass (or construct a clean comprehension).
- **Short-Circuit Evaluation Pipeline**: Using `any()` and `all()` with generator expressions for lazy evaluation.
  - When to use: When validating predicates across large datasets without generating full intermediate lists.
  - How: Pass generator expressions directly into `any(predicate(x) for x in data)`.

## Key Concepts
- **Iterator Exhaustion**: An iterator or generator yields each item once and then raises `StopIteration`. Subsequent iteration loops will silently execute zero times.
- **`enumerate`**: Built-in function yielding `(index, item)` pairs with optional custom starting index (`enumerate(items, start=1)`).
- **`zip` with `strict=True`**: Python 3.10+ parameter that prevents `zip` from silently truncating output to the shortest input sequence.
- **`for...else` Trap**: In Python, an `else` block after a loop executes only if the loop did *not* hit a `break` statement; its behavior is non-intuitive and easily misread.
- **Scope Leak of Loop Variables**: Variables defined in `for x in sequence:` persist in the surrounding function scope after the loop terminates.
- **Container `__iter__` vs Iterator**: An iterable container defines `__iter__()` returning a new iterator object; an iterator defines `__iter__()` returning `self` and `__next__()`.

## Mental Models
- **Think of iterators as single-use conveyor belts**: Once an item falls off the end, it cannot be rewound. If you need multiple passes, build an iterable container that starts a new conveyor belt each time.
- **Think of `zip` without `strict=True` as a silent truncation risk**: Unless truncation is explicitly desired, always enforce length parity with `strict=True`.
- **Use helper functions with early returns instead of `for...else`**: Replace the confusing `else` clause with a helper function that returns immediately when a condition is met.

## Anti-patterns
- **Using `range(len(sequence))` for index lookups**: Manually tracking indices instead of using `enumerate(sequence)`.
- **Using loop variables after loop completion**: Relying on the persisted value of `for item in items:` after the loop finishes.
- **Mutating a dictionary or list while iterating over it**: Calling `del d[k]` or `lst.remove(x)` during active iteration, triggering runtime errors or skipped elements.
- **Passing exhausted generators to multi-pass functions**: Passing a generator expression to a function that iterates twice without container wrapping.
- **Using `for...else` constructs**: Relying on loop `else` blocks, which confuse readers who expect `else` to run when the loop body does not execute.

## Code Examples

### Defensive Iteration with Container Classes
```python
class ReadVisits:
    """An iterable container that opens a fresh iterator on every pass."""
    def __init__(self, data_path: str):
        self.data_path = data_path

    def __iter__(self):
        with open(self.data_path) as f:
            for line in f:
                yield int(line)

def normalize(numbers):
    # Defense against single-use iterator:
    if iter(numbers) is numbers:
        raise TypeError("Must supply a container, not an iterator")
    total = sum(numbers)  # Pass 1
    return [value / total for value in numbers]  # Pass 2

# Usage
visits = ReadVisits("my_numbers.txt")
percentages = normalize(visits)  # Works safely across multiple passes
```
- **What it demonstrates**: Creating reusable iterable containers to protect multi-pass algorithms from iterator exhaustion.

### Safe Parallel Iteration with `strict=True`
```python
names = ["Cecilia", "Lise", "Marie"]
counts = [12, 15]

# Anti-pattern: Silently drops "Marie"
# for name, count in zip(names, counts): ...

# Pythonic: Raises ValueError on length mismatch
try:
    for name, count in zip(names, counts, strict=True):
        print(f"{name}: {count}")
except ValueError as e:
    print(f"Dataset alignment error: {e}")
```
- **What it demonstrates**: Enforcing data integrity across parallel collections.

### Safe In-Place Mutation via Key Caching
```python
# Anti-pattern: Mutating during iteration (RuntimeError in dict)
# for key, val in metrics.items():
#     if val == 0: del metrics[key]

# Pythonic: Two-phase deletion
metrics = {"cpu": 80, "memory": 0, "disk": 45, "swap": 0}
to_delete = [key for key, val in metrics.items() if val == 0]
for key in to_delete:
    del metrics[key]
```
- **What it demonstrates**: Eliminating mutation-during-iteration bugs by caching deletion targets.

## Reference Tables

### Common `itertools` Functions and Use Cases
| Function | Category | Primary Use Case | Example |
|---|---|---|---|
| `itertools.chain(*iterables)` | Linking | Seamlessly iterate over multiple sequences sequentially | `chain(list_a, list_b)` |
| `itertools.zip_longest(*iterables, fillvalue=None)` | Linking | Parallel iteration with padding for shorter sequences | `zip_longest(a, b, fillvalue=0)` |
| `itertools.islice(iterable, stop)` | Filtering | Slice an iterator lazily without converting to list | `islice(stream, 10)` |
| `itertools.takewhile(predicate, iterable)` | Filtering | Consume items as long as predicate remains True | `takewhile(lambda x: x < 5, s)` |
| `itertools.product(*iterables)` | Combinatorics | Cartesian product (nested loops replacement) | `product([1, 2], ['a', 'b'])` |
| `itertools.batched(iterable, n)` | Grouping | Chunk an iterator into tuples of length n (Python 3.12+) | `batched(items, 100)` |

## Worked Example

### Building a Memory-Efficient Stream Validator
Validate streaming telemetry data points against alert thresholds without loading the entire stream into memory.

```python
import itertools
from typing import Iterator

def stream_telemetry() -> Iterator[dict[str, float]]:
    """Simulates a continuous sensor stream."""
    samples = [{"temp": 22.5, "pressure": 101.3}, {"temp": 28.1, "pressure": 102.0}]
    yield from samples

def has_critical_anomaly(readings: Iterator[dict[str, float]], max_temp: float = 25.0) -> bool:
    """Short-circuit evaluation using any() over lazy generator."""
    # any() terminates immediately upon encountering the first True value
    return any(sample["temp"] > max_temp for sample in readings)

def process_batches(readings: Iterator[dict[str, float]], batch_size: int = 2):
    """Process stream in discrete chunks without materializing full list."""
    # itertools.batched in Python 3.12+ (or islice fallback)
    for batch in itertools.batched(readings, batch_size):
        avg_temp = sum(s["temp"] for s in batch) / len(batch)
        print(f"Batch average temperature: {avg_temp:.2f}")

# Execute
stream = stream_telemetry()
print("Has anomaly:", has_critical_anomaly(stream))
```

## Key Takeaways
1. Use `enumerate` instead of `range(len(...))` to access both loop indices and elements cleanly.
2. Always pass `strict=True` to `zip` when sequences must be of equal length.
3. Avoid `for...else` and `while...else` blocks; use early returns in helper functions instead.
4. Never access loop variables after the loop terminates.
5. Guard against exhausted iterators by accepting container objects that implement `__iter__`.
6. Never mutate a dictionary, set, or list while iterating over it; cache changes or build new collections.
7. Use `any()` and `all()` with generator expressions for short-circuiting logical evaluations.
8. Leverage `itertools` (`chain`, `batched`, `zip_longest`, `islice`) for expressive iterator pipelines.

## Connects To
- **Ch 6**: Directly bridges into generator functions (`yield`), generator expressions, and `yield from`.
- **Ch 12**: Integrates with standard library data structures like `heapq`, `deque`, and `bisect`.
