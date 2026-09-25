# Shotgun Surgery

Background reference: skill `fowler-refactoring`, ch03 and ch08.

## Symptom

A single conceptual change or business rule update requires making many small edits scattered across multiple modules or classes.
Developers fear missing one of the necessary changes when modifying the behavior.

## Python forms

- Scattered calculation logic: Small formulas or business rules related to one domain concept distributed across five different files.
- Fragmented data transformation: Step-by-step enrichment of the same record implemented across disparate helpers in multiple modules.
- Leaked internal invariants: Callers across the repository managing the same sequence of mutations on an external entity.

## Detect

### Evidence of harm

Do not treat multi-file edits caused by renaming an API as Shotgun Surgery.
Confirm Shotgun Surgery only when concrete harm exists:
- High commit fan-out: Git history shows small edits spread across numerous files for every domain feature ticket.
- Inconsistent behavior: One call site was updated with new calculation logic while another was overlooked, causing subtle bugs.
- Fragile extensions: Adding a new domain requirement requires deep awareness of disparate implementation locations.

### Ruff hints

- `PLR0904` (too-many-public-methods): Sprawling classes where operations should be centralized or relocated.

### Look-alikes

- Divergent Change: One class altered for many different reasons (one-to-many relationship).
  Shotgun Surgery is the opposite: one reason to change forces edits across many classes (many-to-one relationship).
- Duplicated Code: Identical blocks of code; Shotgun Surgery often involves different code fragments that all serve one conceptual change.

### Deliberate exceptions

- Cross-cutting concerns: Telemetry, metrics collection, or security checks applied deliberately across varied endpoints.
- Independent plugin architectures: Decoupled plugins registering themselves independently with a central dispatcher.

## Choose

| Situation | Chosen refactoring | Alternative | Why |
| --- | --- | --- | --- |
| Related functions scattered across several modules | [Move Function](../refactorings/move-function.md) | Keep scattered | Colocates related functions in one cohesive module or class |
| Several functions derive values from the same record | [Combine Functions into Transform](../refactorings/combine-functions-into-transform.md) | Combine into Class | Pure data transformations avoid shared mutable state and keep calculations inspectable |
| Functions share mutable state or complex context | [Combine Functions into Class](../refactorings/combine-functions-into-class.md) | Module functions | Encapsulates state and operations in a single cohesive unit |
| Edits are cross-cutting application telemetry | Keep the current design | Move Function | Cross-cutting concerns naturally span multiple endpoints |

## Verify

- Run the full test suite after consolidating functions.
- Run project linter and type checker across all affected modules.
- Verify that a domain rule modification now requires editing only the consolidated module.
