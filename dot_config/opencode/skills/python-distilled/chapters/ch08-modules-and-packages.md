# Chapter 8: Modules and Packages

## Core Idea
`import` locates, creates, executes, caches, and binds a module namespace; packages organize those namespaces into maintainable application boundaries.

## Frameworks Introduced
- **Import lifecycle**: source is found, a module object is created, code executes, and the result is cached in `sys.modules`.
  - When to use: debugging imports, initialization side effects, reload behavior, or search paths.
  - How: inspect `sys.path` and `sys.modules`, and keep module top-level work intentional.
- **Package-first organization**: start a growing application as a package with clear exports and a controlled entry point.
  - When to use: more than a trivial script or when multiple modules share a namespace.

## Key Concepts
- **Module namespace**: isolated mapping of a module's definitions.
- **Module cache**: `sys.modules` mapping that prevents repeat execution.
- **Circular import**: mutually dependent initialization that observes incomplete modules.
- **`__main__`**: module name used for the executed entry point.
- **Package export**: names deliberately exposed through package namespace conventions.

## Mental Models
Treat importing as execution, not text inclusion.
Use qualified module names to make ownership and dependencies visible.

## Anti-patterns
- **Top-level side effects in reusable modules**: importing unexpectedly performs work.
- **Deleting cache entries to reload casually**: existing references can point to stale objects.
- **Circular module dependencies**: initialization order becomes fragile.

## Code Examples
```python
if __name__ == '__main__':
    main()
```
- **What it demonstrates**: a module can be imported without running its CLI entry point.

## Worked Example
Create `myapp/__init__.py`, reusable modules such as `foo.py` and `bar.py`, and `myapp/__main__.py` for the command entry point.
Run it with `python -m myapp`; Python executes `__main__.py` while imports of `myapp` remain safe and package-relative imports preserve the namespace boundary.
The same `__main__.py` convention permits executing a package directory or ZIP archive directly.

## Source-Named Sections
- **Module Caching**: import executes a module once and then reuses `sys.modules`; changing source in a running interpreter does not automatically reload it.
- **Circular Imports**: split shared definitions or move imports to a narrower boundary rather than depending on partially initialized modules.
- **Controlling Package Namespace and Exports**: use `__init__.py` to expose deliberate names, not every implementation detail.
- **Package Data and Deployment**: package layout and installation paths matter; deployment tooling changes over time and belongs in current documentation.
- **Start with a Package**: the book recommends beginning nontrivial programs as packages to avoid a painful later split.

## Decision Rules
- Use `import package.module` when namespace ownership should remain visible; use selected imports only when the local name improves clarity.
- Use the `python -m package` entry point for packages; use a runnable-module guard for a single file.
- Treat import-time work as startup code and keep it minimal.

## Key Takeaways
1. Keep imports visible and dependency direction simple.
2. Design package namespaces intentionally.
3. Avoid relying on reload or import-time mutation.

## Connects To
- **Ch 1**: basic scripts evolve into packages.
- **Ch 9**: package deployment and environment paths affect I/O.
