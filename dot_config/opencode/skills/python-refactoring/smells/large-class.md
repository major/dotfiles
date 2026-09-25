# Large Class

Background reference: skill `fowler-refactoring`, ch03 and ch07.

## Symptom

A single class or module attempts to do far too much, accumulating dozens of attributes, methods, or hundreds of statements.
It becomes a focal point of complexity, duplicate code, and confusing responsibilities.

## Python forms

- God modules: Sprawling Python files containing dozens of unrelated functions, global variables, and classes serving disparate domains.
- Kitchen-sink classes: Classes with twenty or more public methods, combining business logic, persistence, caching, and formatting.
- Clustered prefix attributes: Groups of attributes sharing prefixes (such as `billing_` and `shipping_`) indicating embedded sub-concepts.

## Detect

### Evidence of harm

Do not treat a long class with high cohesion and a single responsibility as a smell.
Confirm Large Class only when concrete harm exists:
- Multiple axes of change: Edits for completely different functional requirements touch the same class or module.
- Low cohesion: Methods operate on disjoint subsets of instance attributes rather than shared state.
- Testing gridlock: Unit tests for the class require thousands of lines of setup and dozens of mocks.

### Ruff hints

- `PLR0904` (too-many-public-methods): Flags classes exceeding the threshold of allowed public methods (default 20).
- `PLR0915` (too-many-statements): Flags bloated routines and methods within large classes.

### Look-alikes

- Divergent Change: One class changing for many reasons; Large Class is the structural size symptom, while Divergent Change is the change pattern.
- Data Clumps: Clusters of fields that belong together; Extract Class can resolve both.

### Deliberate exceptions

- Unified domain models: An entity representing a complex domain concept with many intrinsic properties and cohesive operations.
- Application entrypoints: Main orchestration modules coordinating top-level application subsystems.

## Choose

| Situation | Chosen refactoring | Alternative | Why |
| --- | --- | --- | --- |
| Subsets of attributes and methods are cohesive | [Extract Class](../refactorings/extract-class.md) | Keep monolithic class | Separates distinct responsibilities into focused cooperating classes |
| God module contains independent domain calculations | [Extract Class](../refactorings/extract-class.md) or extract module | Keep single file | Partitioning into cohesive modules creates clear architectural boundaries |
| Methods inside large class duplicate logic | [Extract Function](../refactorings/extract-function.md) | Leave duplicates | Consolidates repeated algorithms into clear, reusable helpers |
| High method count with single cohesive responsibility | Keep the current design | Extract Class | Splitting an intrinsically cohesive entity creates artificial indirection |

## Verify

- Run the full test suite after decomposing classes or modules.
- Run project linter and type checker across newly extracted components.
- Verify that each extracted component can be tested independently with minimal fixtures.
