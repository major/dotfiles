# Repeated Resource Cleanup

Background reference: Python-only smell (no Fowler equivalent).

## Symptom

Code repeatedly duplicates manual resource acquisition and release mechanics using `try...finally` blocks across multiple call sites.
Callers safely manage cleanup today, but the repeated boilerplate is error-prone and clutters domain logic.

## Python forms

- Repeated try/finally blocks: Duplicating identical setup, teardown, or cleanup sequences (e.g. locks, connections, temp files) in multiple functions.
- Manual acquisition and release: Repeated calls to `.acquire()` and `.release()`, or `.open()` and `.close()`, wrapped in manual error handlers.
- Nested resource guards: Multi-level nested `try...finally` statements that obscure core business logic.

## Detect

### Evidence of harm

Distinguish design smells from correctness defects:
- An actual resource leak (e.g. opening a file or connection without ensuring release) is a correctness defect, not a design smell.
- Repeated `try...finally` blocks that safely manage cleanup are design smells refactorable to context managers.
Confirm Repeated Resource Cleanup only when concrete harm exists:
- Duplicated cleanup logic: Multiple call sites copy and paste identical multi-line resource setup and teardown logic.
- Fragile maintenance: Changes to cleanup protocol or error suppression require updating every manual `try...finally` block.
- Visual clutter: Business operations are overwhelmed by resource management boilerplate.

### Ruff hints

- `SIM115` (open-file-with-context-handler): Flags file opening without a context manager (`with open(...)`), which serves as a defect (leak) hint.

### Look-alikes

- Correctness defect (Resource Leak): Forgetting to release a resource on an error path is a defect, requiring an immediate bug fix.
- Duplicated Code: General code repetition; when repetition specifically manages resource lifecycles, it is Repeated Resource Cleanup.

### Deliberate exceptions

- Single isolated cleanup: A one-off `try...finally` block in a low-level driver where defining a context manager adds no reuse.
- Complex multi-stage rollbacks: Sagas or transactional distributed rollbacks where individual steps have complex branch fallbacks.

## Choose

| Situation | Chosen refactoring | Alternative | Why |
| --- | --- | --- | --- |
| Repeated try/finally blocks manage resource cleanup | [Introduce Context Manager](../refactorings/introduce-context-manager.md) | Keep manual try/finally | Context managers provide clean `with` syntax and guarantee cleanup |
| Class manages internal lifecycle transitions | [Introduce Context Manager](../refactorings/introduce-context-manager.md) | Separate setup/teardown methods | Implements `__enter__` and `__exit__` dunder methods for idiomatic Python usage |
| Function requires temporary state switch | [Introduce Context Manager](../refactorings/introduce-context-manager.md) with `@contextmanager` | Manual flag restoration | Generator-based context managers encapsulate setup and restore cleanly |
| One-off cleanup in low-level utility | Keep the current design | Introduce Context Manager | Avoids adding indirection for isolated, non-repeated operations |

## Verify

- Run the full test suite verifying cleanup occurs during both normal execution and exception raising.
- Run project linter and type checker across updated call sites.
- Verify that resources (file descriptors, sockets, database transactions) are reliably released.
