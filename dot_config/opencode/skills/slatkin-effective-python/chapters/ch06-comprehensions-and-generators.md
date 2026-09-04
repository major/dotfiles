# Chapter 6: Comprehensions and Generators

## Core Idea
Comprehensions and generators provide Python's core toolkit for concise, memory-efficient data processing. Writing scalable Python requires preferring comprehensions over `map`/`filter`, chaining generator expressions for lazy evaluation pipelines, composing generators with `yield from`, and managing state transitions with clean iterable classes rather than complex `send()`/`throw()` generator methods.

## Frameworks Introduced
- **Lazy Generator Pipeline Architecture**: Constructing data transformations as chains of generator expressions and generator functions.
  - When to use: When processing large files, streaming APIs, or unbounded datasets where materializing entire lists would exhaust RAM.
  - How: Define small generator functions that accept iterators and `yield` transformed records, connecting them via generator expressions `(fn(x) for x in upstream_stream)`.
- **Assignment Expression Filtering Protocol**: Using walrus operators in comprehensions to avoid duplicate expensive computations.
  - When to use: When filtering a comprehension by a value derived from a function call that is also needed in the output expression.
  - How: Put `(result := compute(item))` inside the `if` filter clause, and use `result` directly in the output expression.
- **Generator Composition (`yield from`)**: Seamlessly delegating execution to nested subgenerators.
  - When to use: When building hierarchical tree traversals, chained sequences, or nested generator routines.
  - How: Replace `for x in subgen(): yield x` with `yield from subgen()`, gaining C-level speed and automatic exception propagation.
- **Stateful Iterable Class Pattern**: Replacing complex generator `send()`/`throw()` control flow with stateful classes.
  - When to use: When an iterative process needs dynamic control, resets, error recovery, or parameter updates during execution.
  - How: Encapsulate state inside a class and implement `__iter__()` returning a generator, rather than using two-way generator communication.

## Key Concepts
- **Comprehension Clarity**: List, dictionary (`{k: v for ...}`), and set (`{v for ...}`) comprehensions express transformations directly without awkward `lambda` wrappers required by `map` and `filter`.
- **Generator Function**: A function containing the `yield` keyword that produces a lazy generator iterator rather than returning a static collection.
- **Generator Expression**: Lazy comprehension syntax enclosed in parentheses `(x for x in seq)` evaluating one item at a time.
- **`yield from`**: Transparent subgenerator delegation syntax that connects calling code directly to the child generator.
- **The `send()` Pitfall**: A generator method that injects values into a generator, which often obscures control flow and complicates testing.
- **The `throw()` Pitfall**: A generator method that raises exceptions at the yield point, which creates messy state transitions.

## Mental Models
- **Think of generator expressions as lazy conveyor belts**: Chaining generator expressions `step2 = (b for b in (a for a in stream))` builds an execution pipeline without loading data until the terminal consumer calls `next()` or iterates.
- **Two-expression limit for comprehensions**: If a comprehension requires more than two control subexpressions (e.g., two `for` loops, or a `for` and two `if`s), it belongs in a regular loop or generator function.
- **Use `yield from` as a sub-routine call for iterators**: Just as functions call other functions, generators call subgenerators using `yield from`.

## Anti-patterns
- **Using `map` and `filter` with lambdas**: Writing `map(lambda x: x**2, filter(lambda x: x % 2 == 0, items))` instead of `[x**2 for x in items if x % 2 == 0]`.
- **Three-level nested comprehensions**: Writing unreadable multi-line nested comprehensions that mix multiple iterators and conditions.
- **Accumulating lists in memory when yielding suffices**: Building a large temporary list inside a function `results = []; for ...: results.append(x); return results` instead of `yield x`.
- **Using `generator.send()` or `generator.throw()` for state control**: Creating tangled generator state machines instead of clean class-based iterators.

## Code Examples

### Chaining Generator Expressions for Memory Efficiency
```python
# Processing large log files in O(1) memory
def read_log_lines(path: str):
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            yield line

# Pipeline: Line Stream -> Strip -> Filter -> Extract Length
lines = read_log_lines("production.log")
clean_lines = (line.strip() for line in lines)
error_lines = (line for line in clean_lines if "ERROR" in line)
error_lengths = (len(line) for line in error_lines)

# Execution: Memory is only consumed as items are read
first_five = [next(error_lengths) for _ in range(5)]
```
- **What it demonstrates**: Composing multi-stage lazy pipelines with zero intermediate memory allocation.

### Avoiding Duplicate Computation with Assignment Expressions
```python
stock_data = {"apple": 15, "banana": 4, "kiwi": 0, "pear": 8}
order_minimum = 5

def get_order_batches(count: int) -> int:
    # Expensive calculation or lookup
    return count // 4

# Anti-pattern: get_order_batches called TWICE per item
# orders = {k: get_order_batches(v) for k, v in stock_data.items() if get_order_batches(v) > 0}

# Pythonic: Walrus operator captures batch count in filter clause
orders = {
    k: batches
    for k, v in stock_data.items()
    if (batches := get_order_batches(v)) > 0
}
```
- **What it demonstrates**: Preventing redundant calculations in comprehensions using the walrus operator.

### Hierarchical Tree Traversal with `yield from`
```python
class TreeNode:
    def __init__(self, value, left=None, right=None):
        self.value = value
        self.left = left
        self.right = right

    def __iter__(self):
        """In-order traversal delegating to subtrees cleanly."""
        if self.left:
            yield from self.left
        yield self.value
        if self.right:
            yield from self.right

# Usage
tree = TreeNode(10, TreeNode(5, TreeNode(2), TreeNode(7)), TreeNode(15))
assert list(tree) == [2, 5, 7, 10, 15]
```
- **What it demonstrates**: Clean, recursive generator composition with `yield from`.

## Reference Tables

### Comprehension vs Function Decision Guide
| Use Case | Recommended Syntax | Alternative to Avoid |
|---|---|---|
| Simple 1-to-1 transform + optional filter | List/dict/set comprehension | `map()` / `filter()` with `lambda` |
| Pipeline over large / infinite data stream | Generator expression `(...)` | List comprehension `[...]` |
| Nested loops with complex inner logic | Explicit `for` loop or generator function | Multi-line nested list comprehension |
| Tree / nested structure flattening | Generator with `yield from` | Manual nested loops appending to lists |
| Dynamic state / parameter resets during iteration | Class with `__iter__()` | Generator with `.send()` or `.throw()` |

## Worked Example

### Building a Streaming CSV Aggregator
Stream large CSV files, filter records meeting specific criteria, and compute batch summaries with O(1) memory footprint.

```python
import csv
from typing import Iterator, Iterable

def stream_csv_records(file_path: str) -> Iterator[dict[str, str]]:
    """Yield records row-by-row as dictionaries."""
    with open(file_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        yield from reader

def parse_and_filter(
    records: Iterable[dict[str, str]], 
    min_amount: float
) -> Iterator[dict[str, float]]:
    """Lazy filter and transformation stage."""
    for row in records:
        if (amount := float(row.get("amount", 0))) >= min_amount:
            yield {"id": row["transaction_id"], "amount": amount}

def compute_total_volume(filtered_stream: Iterator[dict[str, float]]) -> float:
    """Terminal consumer computing total sum."""
    return sum(item["amount"] for item in filtered_stream)

# Usage demonstrates clear separation of stages
# records = stream_csv_records("transactions_large.csv")
# high_value = parse_and_filter(records, min_amount=1000.0)
# total = compute_total_volume(high_value)
```

## Key Takeaways
1. Prefer list, dict, and set comprehensions over `map()` and `filter()` combined with lambdas.
2. Limit comprehensions to at most two control subexpressions (e.g. one `for` and one `if`); use regular loops or generator functions when complexity exceeds this threshold.
3. Use the walrus operator (`:=`) in the `if` clause of comprehensions to avoid duplicate calculations.
4. Replace functions returning full lists with generator functions that `yield` outputs lazily.
5. Chain generator expressions for multi-stage pipelines to minimize memory overhead.
6. Compose nested generators and recursive traversals with `yield from`.
7. Pass iterators as inputs to generators rather than attempting two-way communication with `send()`.
8. Encapsulate complex state transitions in classes implementing `__iter__` rather than using `throw()`.

## Connects To
- **Ch 3**: Builds directly on iterator protocols and short-circuit evaluation (`any`, `all`).
- **Ch 9**: Serves as the foundation for asynchronous generators and coroutine pipelines (`async for`, `async def`).
