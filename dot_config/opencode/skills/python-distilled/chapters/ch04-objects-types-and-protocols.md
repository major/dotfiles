# Chapter 4: Objects, Types, and Protocols

## Core Idea
Every value is an object with identity, type, and value; Pythonic abstractions arise by implementing protocols rather than copying concrete implementations.

## Frameworks Introduced
- **Object model**: identity is stable, type defines behavior, and value may be mutable or immutable.
  - When to use: diagnosing aliasing, equality, copying, and lifecycle behavior.
  - How: use `is` for identity, `==` for value, and explicit copies when shared mutation is unsafe.
- **Protocol-oriented design**: support the operations consumers need through special methods.
  - When to use: custom containers, iterators, numbers, callables, or managed resources.
  - How: implement the smallest coherent protocol and obey its expected semantics.

## Key Concepts
- **Identity**: unique object identity returned by `id()`.
- **Mutability**: whether an object's value can change.
- **Container**: an object holding references to other objects.
- **Iteration protocol**: `__iter__()` and `__next__()` behavior.
- **Attribute protocol**: `__getattribute__`, `__getattr__`, and `__setattr__` behavior.
- **Sentinel**: a unique object used to represent a special state.

## Mental Models
Use `None` as a deliberate missing-value marker and test it with `is None`.
Think of `len(x)`, `x[i]`, and `x + y` as readable requests to protocols.

## Anti-patterns
- **Using `is` for ordinary equality**: identity and value are different contracts.
- **Implementing half a protocol**: surprising behavior is worse than an explicit unsupported operation.

## Code Examples
```python
if value is None:
    value = default
```
- **What it demonstrates**: correct singleton testing and optional-value handling.

## Worked Example
Assignment creates aliases: after `b = a`, mutating a list through `b` also changes `a`.
With `a = [1, 2, [3, 4]]`, `b = list(a)` makes distinct outer lists, so `b.append(100)` leaves `a` unchanged, but `b[2][0] = -100` changes both because the nested list is shared.
Use `copy.deepcopy(a)` only when recursive independence is required; it is slower and cannot copy many runtime resources such as open files, threads, or generators.

## Source-Named Sections
- **References and Copies**: distinguish rebinding, shallow copy, and deep copy by asking which nested objects remain shared.
- **Reference Counting and Garbage Collection**: `del` removes a name and may release an object immediately when its count reaches zero; cyclic references wait for cycle collection.
- **Object Representation and Printing**: implement `__repr__` for an unambiguous debugging representation and `__str__` for user-facing output.
- **Object Protocols**: implement only the operations your abstraction promises, including number, comparison, container, iteration, attribute, function, or context-manager protocols.

## Decision Rules
- Use `is` for identity and `==` for value equality.
- Copy shallowly when the container boundary is enough; deep-copy only a known mutable graph.
- Prefer a protocol-compatible object over a nominal base class when consumers only need behavior.

## Key Takeaways
1. Design around behavior consumers require.
2. Make mutability and aliasing intentional.
3. Implement special methods consistently with built-in expectations.

## Connects To
- **Ch 7**: classes customize these protocols.
- **Ch 2**: operators and expressions dispatch through them.
