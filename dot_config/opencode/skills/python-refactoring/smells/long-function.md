# Long Function

Background reference: skill `fowler-refactoring`, ch03 and ch06.

## Symptom

A function spans multiple concerns, has accumulated dozens of statements, or requires explanatory comments to track its progression.
Readers struggle to maintain the entire mental model of the execution context at once.

## Python forms

- Procedural scripts inside a function: A single routine handling parsing, validation, calculation, and formatted logging sequentially.
- Tangled local variables: Many intermediate variables created early and modified repeatedly throughout the body.
- Deep nested blocks: Multiple nested loops and conditional branches creating high cyclomatic complexity.

## Detect

### Evidence of harm

Do not treat line count alone as proof of a smell.
Confirm Long Function only when concrete harm exists:
- Multiple reasons to change: Edits to unrelated requirements force modifications to the same function.
- High semantic distance: Readers must trace low-level mechanics to understand high-level intent.
- Testing friction: Writing unit tests requires massive setup to reach specific interior code branches.

### Ruff hints

- `C901` (complex-structure): Flags functions exceeding the configured cyclomatic complexity threshold.
- `PLR0915` (too-many-statements): Flags functions exceeding the statement limit (default 50).
- `PLR0912` (too-many-branches): Flags functions with excessive branching paths.
- `PLR0914` (too-many-locals): Flags functions defining more than 15 local variables.

### Look-alikes

- Large Class: A class with many responsibilities vs a single function doing too much.
  Decompose the function first before evaluating whether class splitting is necessary.
- Long Parameter List: A function with too many arguments.
  Often long functions also accumulate long parameter lists, but each requires its own treatment.

### Deliberate exceptions

- Linear dispatch pipelines: Functions executing a straightforward list of steps where decomposition adds indirection without reuse.
- High-performance vector routines: Flattened procedural code explicitly structured to avoid function call overhead in tight numerical loops.

## Choose

| Situation | Chosen refactoring | Alternative | Why |
| --- | --- | --- | --- |
| Cohesive block of statements computes a sub-result | [Extract Function](../refactorings/extract-function.md) | Inline comments | Named functions communicate intent and isolate local variables |
| Tangled locals make parameter passing unwieldy | [Replace Function with Command](../refactorings/replace-function-with-command.md) | Mega parameter list | Closures or command objects hold shared state across sub-steps |
| Function contains multiple sequential phases | [Extract Function](../refactorings/extract-function.md) | Keep single routine | Dividing phases reveals intermediate data contracts |
| Straightforward linear execution with clear intent | Keep the current design | Extract Function | Unnecessary extraction adds indirection without improving clarity |

## Verify

- Run the full test suite to ensure behavior is preserved.
- When `radon` is available, verify `radon cc` outputs B or better on extracted functions.
- Run project linter and type checker on the modified file.
