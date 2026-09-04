---
name: python-distilled
description: "Knowledge base from \"Python Distilled\" by David M. Beazley. Use when applying Python's object, protocol, function, generator, class, module, I/O, and standard-library frameworks, studying the book, or referencing its concepts."
---

<!-- argument-hint: [topic, framework name, or chapter number] -->

# Python Distilled
**Author**: David M. Beazley | **Pages**: ~31 spine items | **Chapters**: 10 | **Generated**: 2026-09-02

## How to Use This Skill
- **Without arguments**: load the core frameworks below.
- **With a topic**: use the Topic Index to select and read the relevant chapter.
- **With a chapter**: ask for `ch05` or a chapter title.
- **Browse**: ask what chapters or supporting references are available.

## Core Frameworks & Mental Models
- Treat Python as a small language plus powerful built-in objects: prefer the simplest built-in construct before adding abstraction or dependencies.
- Separate **identity**, **type**, and **value**.
  Use `is` for identity and singleton checks such as `None`, `==` for value equality, and `isinstance()` when subtype-aware type testing is genuinely needed.
- Think in **protocols**, not concrete classes.
  Implement the special methods needed for the behavior you promise, such as `__iter__`, `__getitem__`, `__len__`, `__call__`, or context-manager methods.
- Keep functions explicit at their boundaries.
  Prefer immutable defaults, keyword-only options for clarity, positional-only parameters when preserving an API boundary, and return values over hidden mutation.
- Use generators for lazy iteration and streaming state.
  A generator does not execute when called; it must be driven by iteration or `next()`, and `yield from` delegates iteration and completion cleanly.
- Prefer composition and simple functions over inheritance when only behavior varies.
  Use inheritance for a real substitutable relationship, interfaces, or focused mixins, not merely to reuse a few lines.
- Treat imports as executable namespace construction.
  Modules execute once and cache in `sys.modules`; packages should define clear boundaries and avoid circular dependencies.
- Keep bytes and text separate at I/O boundaries.
  Decode incoming bytes and encode outgoing text explicitly using the external protocol's encoding, commonly UTF-8 but not universally.
- Use `async`/`await` only inside a deliberate managed asynchronous environment.
  Await coroutines from async code while an event loop or framework drives them; an async function does not run merely because it was called.
- Use exceptions for exceptional control flow and context managers for resource lifetime.
  Do not use `assert` as runtime input validation because optimization removes it.

## Chapter Index
| # | Title | Key Frameworks |
|---|---|---|
| [ch01](chapters/ch01-python-basics.md) | Python Basics | built-ins, modules, simple structure |
| [ch02](chapters/ch02-operators-expressions-and-data-manipulation.md) | Operators, Expressions, and Data Manipulation | evaluation, locations, comprehensions |
| [ch03](chapters/ch03-program-structure-and-control-flow.md) | Program Structure and Control Flow | statements, exceptions, context managers |
| [ch04](chapters/ch04-objects-types-and-protocols.md) | Objects, Types, and Protocols | data model, protocols, special methods |
| [ch05](chapters/ch05-functions.md) | Functions | signatures, closures, decorators, composition |
| [ch06](chapters/ch06-generators.md) | Generators | lazy execution, delegation, enhanced generators |
| [ch07](chapters/ch07-classes-and-object-oriented-programming.md) | Classes and Object-Oriented Programming | composition, inheritance, descriptors |
| [ch08](chapters/ch08-modules-and-packages.md) | Modules and Packages | import, caching, package boundaries |
| [ch09](chapters/ch09-input-and-output.md) | Input and Output | encoding, files, serialization, concurrency |
| [ch10](chapters/ch10-built-in-functions-and-standard-library.md) | Built-in Functions and Standard Library | built-ins, exceptions, library selection |

## Topic Index
- **async/await** → [ch05](chapters/ch05-functions.md), [ch06](chapters/ch06-generators.md), [ch09](chapters/ch09-input-and-output.md)
- **classes and inheritance** → [ch07](chapters/ch07-classes-and-object-oriented-programming.md)
- **comprehensions** → [ch02](chapters/ch02-operators-expressions-and-data-manipulation.md)
- **copying** → [ch04](chapters/ch04-objects-types-and-protocols.md)
- **descriptors** → [ch07](chapters/ch07-classes-and-object-oriented-programming.md)
- **garbage collection** → [ch04](chapters/ch04-objects-types-and-protocols.md)
- **exceptions and context managers** → [ch03](chapters/ch03-program-structure-and-control-flow.md)
- **functions and decorators** → [ch05](chapters/ch05-functions.md)
- **generators and yield** → [ch06](chapters/ch06-generators.md)
- **I/O and encoding** → [ch09](chapters/ch09-input-and-output.md)
- **introspection** → [ch05](chapters/ch05-functions.md), [ch10](chapters/ch10-built-in-functions-and-standard-library.md)
- **objects and protocols** → [ch04](chapters/ch04-objects-types-and-protocols.md)
- **operators and evaluation** → [ch02](chapters/ch02-operators-expressions-and-data-manipulation.md)
- **packages and imports** → [ch08](chapters/ch08-modules-and-packages.md)
- **package exports and `__main__.py`** → [ch08](chapters/ch08-modules-and-packages.md)
- **polling and concurrency** → [ch09](chapters/ch09-input-and-output.md)
- **serialization** → [ch09](chapters/ch09-input-and-output.md)
- **slots and weak references** → [ch07](chapters/ch07-classes-and-object-oriented-programming.md)
- **standard library** → [ch09](chapters/ch09-input-and-output.md), [ch10](chapters/ch10-built-in-functions-and-standard-library.md)
- **type hints** → [ch05](chapters/ch05-functions.md), [ch07](chapters/ch07-classes-and-object-oriented-programming.md)
- **zero-copy I/O** → [ch09](chapters/ch09-input-and-output.md)

## Supporting Files
- [glossary.md](glossary.md): key terms and chapter references.
- [patterns.md](patterns.md): practical techniques and design patterns.
- [cheatsheet.md](cheatsheet.md): decision rules and trade-offs.

## Scope & Limits
This skill covers the book's programming concepts, not project-specific tooling, deployment practice, or current library documentation.
The book reflects Python 3.9-era coverage and excludes later features such as structural pattern matching; consult current Python documentation for version-sensitive APIs and language features.
The extraction contained **853 source images that were not read**, so image-only examples or diagrams may be missing.
