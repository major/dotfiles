# Chapter 10: Built-in Functions and Standard Library

## Core Idea
Python's built-ins and standard library encode common, tested solutions; know how to select them before implementing equivalents.

## Frameworks Introduced
- **Use the built-ins**: choose a built-in when it directly expresses the operation.
  - When to use: truth testing, iteration, conversion, inspection, aggregation, and common container work.
  - How: check the built-in's empty-input behavior and iterable contract before writing a loop.
- **Library by abstraction**: select modules according to the problem boundary rather than memorizing every name.
  - When to use: truth testing, iteration, conversion, inspection, aggregation, and common container work.

## Key Concepts
- **`all()`**: true when every input is true, including an empty iterable.
- **`any()`**: true when at least one input is true, false for an empty iterable.
- **`breakpoint()`**: enters the configured debugger.
- **Built-in exception**: standard failure type available without import.
- **Standard library**: batteries-included modules shipped with Python.

## Mental Models
Use an iterable-consuming built-in to preserve lazy processing where possible.
Treat the standard library as a vocabulary of established abstractions, not a catalog to reimplement.
Choose a module by the abstraction it owns: `collections` for containers, `itertools` for iteration, and `inspect` for introspection.

## Anti-patterns
- **Reimplementing obvious built-ins**: increases code and misses edge cases.
- **Choosing a module by name alone**: verify representation, lifecycle, and failure semantics.

## Code Examples
```python
if all(record.valid for record in records):
    publish(records)
```
- **What it demonstrates**: concise, short-circuiting aggregate validation.

## Worked Example
Replace a manual accumulator with `sum`, `min`, `max`, `any`, or `all` when its semantics match, then keep a loop only when it must retain intermediate state or handle richer failure behavior.
For a data-processing task, combine `collections` for specialized containers and `itertools` for lazy composition instead of rewriting those mechanisms.

## Source-Named Sections
- **Built-in Functions**: `len`, `iter`, `next`, `enumerate`, `zip`, `sorted`, `sum`, `min`, `max`, `all`, and `any` express common operations and often short-circuit or consume lazily.
- **Built-in Exceptions**: select a standard exception whose meaning matches the failed contract; define a subclass when callers need a domain distinction.
- **Standard Library**: use focused modules such as `collections`, `itertools`, `inspect`, `re`, and `datetime` according to the abstraction they own.
- **Introspection and Debugging**: `breakpoint()` and `inspect` are useful when investigating actual runtime objects, signatures, and call paths.

## Decision Rules
- Check empty-input semantics before replacing a loop with `all`, `any`, `min`, or `max`.
- Keep the built-in operation visible in the call site so its input and empty-input semantics remain reviewable.

## Key Takeaways
1. Prefer direct built-ins for standard operations.
2. Know empty-input and short-circuit behavior.
3. Read focused standard-library documentation instead of recreating utilities.

## Connects To
- **Ch 2**: built-ins consume expressions and iterables.
- **Ch 9**: standard-library modules cover practical I/O.
