# Chapter 1: Python Basics

## Core Idea
Start with Python's small core: expressions, built-in containers, functions, classes, modules, and simple package structure.

## Frameworks Introduced
- **Python fits your brain**: prefer a clear built-in solution before inventing machinery.
  - When to use: every design decision involving lists, sets, dictionaries, functions, or modules.
  - How: solve the local problem simply, then introduce packages and third-party dependencies only when the boundary is real.

## Key Concepts
- **Name**: a binding to an object rather than storage containing a value.
- **Mutable object**: an object whose value can change in place.
- **Iterable**: an object that can supply successive values to `for`.
- **Module**: a file-backed namespace loaded by `import`.
- **Package**: a directory-based hierarchy of modules.

## Mental Models
Think of assignment as rebinding a name to an object.
Use a dictionary for keyed lookup, a set for membership, a tuple for fixed records, and a list for ordered mutable data.

## Anti-patterns
- **Overbuilding basic code**: it hides behavior already provided by Python's core.
- **Unstructured application scripts**: they make imports, configuration, and execution order difficult to reason about.

## Code Examples
```python
if __name__ == '__main__':
    main()
```
- **What it demonstrates**: separates importable definitions from main-program execution.

## Worked Example
Begin a small application with `program/__init__.py` and `program/__main__.py`, put reusable operations in sibling modules, and run it using `python -m program`.
For a genuinely single-file utility, keep `main()` behind the runnable-module guard so importing the file does not execute the command.

## Source-Named Sections
- **Primitives, Variables, and Expressions**: names refer to objects, and expressions evaluate before assignment stores a reference.
- **Lists, Tuples, Sets, and Dictionaries**: select ordered mutation, fixed records, membership, or keyed lookup respectively.
- **Iteration and Looping**: `for` consumes any iterable, not only lists.
- **Modules, Script Writing, and Packages**: separate reusable definitions from execution and establish a namespace boundary as code grows.

## Decision Rules
- Choose the simplest built-in data model that matches the invariant.
- Use a package once multiple modules or a command entry point are foreseeable.
- Install third-party packages only when the standard library and core language do not fit.

## Key Takeaways
1. Learn the built-in containers before reaching for a framework.
2. Keep reusable definitions separate from top-level execution.
3. Use packages to isolate namespaces as an application grows.

## Connects To
- **Ch 8**: modules and packages are developed in detail.
- **Ch 4**: built-in behavior is exposed through object protocols.
