# Loops

Background reference: skill `fowler-refactoring`, ch03 and ch08.

## Symptom

Imperative `for` or `while` loops with manual accumulators obscure the intent of a data transformation.
Readers must trace loop indexing, conditional branches, and variable mutation to understand what collection is being produced.

## Python forms

- Imperative accumulators: Initializing an empty list or dictionary and iteratively appending or updating inside a `for` loop.
- Manual predicate checks: Loops iterating through a collection solely to check if any or all elements satisfy a condition.
- Mixed iteration and side effects: A single loop that filters data, computes an aggregate, and writes to disk or network concurrently.

## Detect

### Evidence of harm

Do not replace loops when a comprehension would be less readable or deeply nested.
Confirm Loops only when concrete harm exists:
- Obscured transformation intent: Readers cannot immediately discern the filtering, mapping, or reduction taking place.
- Accumulator leakage: Temporary accumulator variables linger in scope after the loop completes.
- State mutation bugs: In-place modification of collections during iteration leading to index errors or skipped elements.

### Ruff hints

- `SIM110` (reimplemented-builtin): Flags `for` loops that can be replaced with built-in functions like `any()` or `all()`.
- `C400` (unnecessary-generator-list): Flags redundant generator wrapping where direct list comprehensions are clearer.

### Look-alikes

- Side-effecting operations: Loops that execute I/O (such as writing records to database) should remain loops in the imperative shell.
- Long Function: A loop spanning dozens of lines doing multiple tasks; split the loop or extract functions first.

### Deliberate exceptions

- Complex early exit algorithms: Search procedures with complex backtracking or multi-level breaks where comprehensions are impossible.
- Imperative I/O processing: Streaming large files line-by-line where side effects belong in the outer shell.

## Choose

| Situation | Chosen refactoring | Alternative | Why |
| --- | --- | --- | --- |
| Loop transforms elements into a new collection | [Replace Loop with Pipeline](../refactorings/replace-loop-with-pipeline.md) | Keep imperative loop | Comprehensions declare intent concisely without accumulator variables |
| Loop checks existence or truth of condition | [Replace Loop with Pipeline](../refactorings/replace-loop-with-pipeline.md) | Manual boolean flag | Built-ins `any()` and `all()` short-circuit efficiently and read like prose |
| Loop computes aggregate sum or count | [Replace Loop with Pipeline](../refactorings/replace-loop-with-pipeline.md) | Accumulator variable | `sum()` with generator expression eliminates mutable counter variable |
| Complex multi-step loop with side effects | Keep the current design | Replace Loop with Pipeline | Forcing complex side effects into pipelines hurts readability |

## Verify

- Run the full test suite to ensure output values match exactly.
- Verify eager vs lazy evaluation behaviors when switching between list comprehensions and generator expressions.
- Run project linter and type checker on modified files.
