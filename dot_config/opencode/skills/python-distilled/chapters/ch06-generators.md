# Chapter 6: Generators

## Core Idea
A generator suspends and resumes a function around `yield`, enabling lazy pipelines, streaming state, delegation, and controlled execution.

## Frameworks Introduced
- **Lazy generator execution**: calling a generator function creates an inert generator; iteration drives it.
  - When to use: large data, streams, pipelines, or incremental production.
  - How: yield one item, retain local state, and let the consumer control progress.
- **Generator delegation**: `yield from` forwards iteration, values, exceptions, and a subgenerator's return value.
  - When to use: compose generator stages without manually forwarding protocol details.
- **Enhanced generators**: `send()`, `throw()`, and `close()` turn a generator into a bidirectional stateful task.
  - When to use: specialized coroutine-like workflows, not ordinary async code.

## Key Concepts
- **Suspension point**: a `yield` where execution pauses.
- **StopIteration**: signals exhaustion and may carry a generator return value.
- **Restartable generator**: a fresh generator invocation, not a rewind of an existing one.
- **Generator expression**: lazy expression form for iteration.

## Mental Models
Think of a generator as a paused stack frame with live locals.
Prefer ordinary iteration generators unless bidirectional control is a clear requirement.

## Anti-patterns
- **Assuming a generator runs when called**: no body code runs until driven.
- **Using enhanced generators for modern async I/O by default**: `async`/`await` is the current dedicated model.

## Code Examples
```python
def countdown(n):
    while n > 0:
        yield n
        n -= 1
```
- **What it demonstrates**: lazy stateful iteration.

## Worked Example
The chapter's generator pipeline decomposes a directory search into `get_paths`, `get_files`, `get_lines`, `get_comments`, and a final matcher.
Each stage accepts an iterable and yields only its concern, so a path source can be replaced by a list, file, or another generator without rewriting downstream stages.
For a reusable iterable class, make `__iter__` return a fresh generator each time; this lets two `for` loops restart independently instead of sharing one exhausted iterator.

## Source-Named Sections
- **Generators and `yield`**: the first `next()` runs to the first yield; locals survive suspension, and exhaustion raises `StopIteration`.
- **Restartable Generators**: call the generator function again for a fresh traversal; an existing generator is not rewindable.
- **Generator Delegation**: use `yield from` to forward iteration and capture a subgenerator's return value.
- **Enhanced Generators and `yield` Expressions**: `send`, `throw`, and `close` support specialized bidirectional workflows.

## Decision Rules
- Use a generator for one-pass, lazy production; return a reusable iterable object when callers expect repeated iteration.
- Keep pipeline stages single-purpose and composable.
- Prefer `async`/`await` for modern asynchronous I/O rather than inventing generator-based scheduling.

## Key Takeaways
1. Use generators to avoid materializing streams.
2. Use `yield from` to compose generator behavior.
3. Explicitly choose between iteration generators and async coroutines.

## Connects To
- **Ch 5**: generators are functions with a different execution model.
- **Ch 9**: streaming I/O benefits from lazy consumption.
