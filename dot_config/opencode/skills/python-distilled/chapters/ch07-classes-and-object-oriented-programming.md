# Chapter 7: Classes and Object-Oriented Programming

## Core Idea
Classes package state and behavior, but Python's strongest object-oriented style favors protocols, composition, duck typing, and simple interfaces over deep inheritance.

## Frameworks Introduced
- **Composition over inheritance**: delegate variable behavior to contained objects or functions.
  - When to use: behavior changes independently of stored state or inheritance would create plumbing.
  - How: inject a policy, delegate calls, and keep each component testable.
- **Duck typing**: use an object based on supported operations rather than its nominal class.
  - When to use: flexible APIs that consume protocol-compatible objects.
- **Descriptors and attribute binding**: class attributes can control how instance access is resolved.
  - When to use: properties, validation, managed attributes, and framework internals.

## Key Concepts
- **Instance method**: function receiving `self`.
- **MRO**: method resolution order used for attribute lookup.
- **Mixin**: focused class that adds behavior through cooperative inheritance.
- **Property**: managed attribute interface.
- **Descriptor**: object implementing attribute access methods.
- **`__slots__`**: declaration restricting instance storage and potentially reducing memory.

## Mental Models
Use inheritance for substitutability, interfaces, or focused mixins, not mere code reuse.
Use `__repr__` to make object state inspectable during debugging.
Use properties and descriptors to control attribute access, not to hide an unnecessarily complicated data model.

## Anti-patterns
- **Subclassing built-in containers for interception**: C-level methods may bypass overridden methods.
- **Deep or unrelated multiple inheritance**: MRO complexity makes behavior difficult to predict.
- **Premature metaclasses**: class construction magic is rarely needed for ordinary application code.

## Code Examples
```python
class Account:
    def __init__(self, owner, balance):
        self.owner = owner
        self.balance = balance

    def __repr__(self):
        return f'Account({self.owner!r}, {self.balance!r})'
```
- **What it demonstrates**: explicit state initialization and useful representation.

## Worked Example
Replace a family of single-method parser subclasses with injected parser functions; only introduce a class when state, lifecycle, or a stable protocol justifies it.
For a dictionary that must uppercase keys, subclassing `dict` and overriding `__setitem__` is insufficient because C-level `update()` and construction can bypass it.
Use `collections.UserDict` instead, where the managed mapping routes operations through the Python-level implementation, or prefer composition with a private mapping.

## Source-Named Sections
- **Operator Overloading and Protocols**: special methods make objects work with `len`, indexing, iteration, arithmetic, comparison, and context management.
- **Avoiding Inheritance via Composition and Functions**: a contained policy or callback often removes subclass plumbing and is easier to test.
- **Dynamic Binding and Duck Typing**: consumers can accept any object that provides the required operations.
- **Types, Interfaces, and Abstract Base Classes**: use `abc` and `@abstractmethod` when a framework needs an enforced interface.
- **Multiple Inheritance, Interfaces, and Mixins**: keep mixins focused and understand cooperative MRO; do not combine unrelated classes.
- **Properties, Descriptors, and Attribute Binding**: descriptors explain how functions become bound methods and how managed attributes work.
- **Weak References and Object Life Cycle**: weak references observe objects without keeping them alive; use them for caches or observers where ownership must remain elsewhere.
- **Reducing Memory Use with `__slots__`**: slots can remove per-instance dictionaries, but restrict dynamic attributes and complicate some inheritance and tooling.
- **Type Hinting, Class Decorators, and Metaclasses**: these are metadata and construction tools; introduce them only for a concrete framework need.

## Decision Rules
- Use `UserDict`, `UserList`, or composition when built-in subclass methods must be intercepted reliably.
- Use a property for a stable attribute-shaped API and a method for an operation with visible work.
- Use weak references only when non-ownership is the invariant; otherwise retain a normal reference.
- Treat `__slots__` as a measured memory optimization, not a default class style.

## Key Takeaways
1. Keep classes small and behaviorally coherent.
2. Prefer composition and dependency injection.
3. Treat descriptors, metaclasses, and `__slots__` as specialized tools.

## Connects To
- **Ch 4**: class methods implement object protocols.
- **Ch 8**: modules provide the broader namespace boundary.
