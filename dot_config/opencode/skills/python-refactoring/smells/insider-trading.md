# Insider Trading

Background reference: skill `fowler-refactoring`, ch03 and ch08.

## Symptom

Separate modules or classes spend excessive effort peeking into each other's private data, internal state, or implementation details.
They trade private secrets behind the scenes, creating tight, unencapsulated coupling that breaks whenever either changes.

## Python forms

- Access to `_private` names from other modules: Modules directly importing or reading attributes prefixed with a single underscore (e.g. `collaborator._internal_cache`) from external modules.
- Intimate data structures: One class directly reaching into another class's internal collections to modify contents.
- Bidirectional private coupling: Two classes that cannot function or be tested without accessing each other's private fields.

## Detect

### Evidence of harm

Do not flag underscore attribute access within the same module where private functions legitimately coordinate.
Confirm Insider Trading only when concrete harm exists:
- Breakage on internal updates: Refactoring private implementation details of one class silently breaks unrelated external callers.
- Unencapsulated mutations: External callers mutate internal invariants, putting objects into corrupted or inconsistent states.
- High change coupling: Modules cannot be understood or refactored independently because their private states are entwined.

### Ruff hints

- `SLF001` (private-member-access): Flags code accessing private underscore members of an external class or module.

### Look-alikes

- Feature Envy: A function using many public methods of another class; Insider Trading specifically breaches private boundaries.
- Shotgun Surgery: Changes scattered across files; Insider Trading is an encapsulation breach between specific cooperating units.

### Deliberate exceptions

- Package-internal cooperation: Closely cooperating helpers within the same private package or module interacting with internal data.
- Unit testing internals: Test fixtures inspecting internal state when public accessors are intentionally not exposed.

## Choose

| Situation | Chosen refactoring | Alternative | Why |
| --- | --- | --- | --- |
| External function manipulates private attributes | [Move Function](../refactorings/move-function.md) | Make attributes public | Moving the function inside encapsulates the operations with the data |
| Class needs internal information from a collaborator | [Hide Delegate](../refactorings/hide-delegate.md) | Direct private access | Collaborator provides an explicit public interface, protecting internal details |
| Co-dependent classes share private state | [Move Function](../refactorings/move-function.md) | Merge modules | Colocating shared state in a single module or class eliminates cross-boundary leakage |
| Intra-module private helper coordination | Keep the current design | Move Function | Modules serve as natural encapsulation boundaries in Python |

## Verify

- Run the full test suite after encapsulating private access.
- Run project linter with `SLF001` enabled to verify that zero cross-module private accesses remain.
- Run type checker to verify that all exposed interfaces are properly typed.
