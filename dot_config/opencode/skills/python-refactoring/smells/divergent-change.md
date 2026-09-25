# Divergent Change

Background reference: skill `fowler-refactoring`, ch03 and ch06.

## Symptom

A single class or module is repeatedly modified in different ways for completely different business reasons or by different teams.
Whenever a database schema changes, the module changes; whenever financial calculation rules change, the same module changes.

## Python forms

- Mixed sequential phases: A single class or module that handles parsing raw text, executing business logic, and formatting output reports.
- Clustered unrelated methods: A service class containing methods for user authentication, payment processing, and email notification.
- Conflicting commit contexts: Different git commits touching distinct subsections of the same file for disparate functional requirements.

## Detect

### Evidence of harm

Do not treat a large file with high internal cohesion as Divergent Change.
Confirm Divergent Change only when concrete harm exists:
- Git merge conflicts: Frequent merge conflicts between developers working on unrelated feature streams touching the same file.
- Risk of collateral regression: Changing reporting layout logic risks inadvertently breaking payment transaction calculations.
- Context switching cognitive overload: Understanding one feature requires filtering out massive unrelated domain logic in the same file.

### Ruff hints

- `C901` (complex-structure): High cyclomatic complexity caused by mixing multiple unrelated business branches.
- `PLR0915` (too-many-statements): Excessive statements from packing multiple domain concerns into one file.
- `PLR0904` (too-many-public-methods): Bloated classes serving multiple unrelated caller domains.

### Look-alikes

- Shotgun Surgery: One change touches many files; Divergent Change is one file touched by many different changes.
- Large Class: A class with many lines of code; it becomes Divergent Change specifically when different changes occur for different reasons.

### Deliberate exceptions

- Cohesive façade: A lightweight API façade providing a unified entry point to underlying subsystems without implementing the logic itself.
- Single-purpose CLI dispatcher: A top-level CLI module routing commands to respective sub-handlers.

## Choose

| Situation | Chosen refactoring | Alternative | Why |
| --- | --- | --- | --- |
| Routine mixes input processing with core calculation | [Split Phase](../refactorings/split-phase.md) | Single routine | Decouples data ingestion from business calculations via intermediate record |
| Class serves two distinct domain responsibilities | [Extract Class](../refactorings/extract-class.md) | Subclasses | Separates independent lifecycles and business reasons to change |
| Standalone operations belong with a collaborator | [Move Function](../refactorings/move-function.md) | Keep in module | Moves secondary operations to the module or class where they are cohesive |
| Module is a thin facade routing calls | Keep the current design | Extract Class | Thin routing facades add clarity and do not house domain complexity |

## Verify

- Run the full test suite after splitting phases or extracting classes.
- Run project linter and type checker across modified modules.
- Verify that changes to one business concern no longer touch the file of another concern.
