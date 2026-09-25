# Comments

Background reference: skill `fowler-refactoring`, ch03 and ch06.

## Symptom

Extensive explanatory comments are written to compensate for obscure, convoluted, or poorly named code ("deodorant comments").
Instead of writing clean, self-describing code, the author left paragraphs explaining what the code is attempting to do.

## Python forms

- Explanatory block comments above code chunks: Comments explaining a paragraph of procedural statements that could be a named function.
- In-line variable apologies: Comments explaining what an ambiguously named variable actually represents.
- Commented-out code blocks: Inactive historical code left behind in comments rather than tracked in version control.

## Detect

### Evidence of harm

Do not treat Google-style docstrings, legal notices, or architectural design rationale as deodorant comments.
Confirm Comments only when concrete harm exists:
- Comment rot: Comments describe behavior that diverged from actual code behavior months ago, misleading maintainers.
- Visual clutter: Dense comment blocks distract from the actual data flow and logic structure.
- Masked complexity: Tangled procedural blocks remain unrefactored because the author felt a comment made it acceptable.

### Ruff hints

- `ERA001` (commented-out-code): Flags commented-out Python code that should be deleted.

### Look-alikes

- Mysterious Name: Obscure identifier explained by an adjacent comment; rename the identifier to eliminate the comment.
- Long Function: Long code chunks separated by section comments; extract each section into a named function.

### Deliberate exceptions

- Preserved inline notes: Tool directives (`# noqa`, `# type: ignore`, `# pragma`) must always be preserved in place on their statements.
- "Why" comments: Explanations of non-obvious business constraints, external hardware bugs, or performance trade-offs.
- Public API docstrings: Google-style docstrings documenting contracts and parameters on public functions.

## Choose

| Situation | Chosen refactoring | Alternative | Why |
| --- | --- | --- | --- |
| Comment explains what a block of code does | [Extract Function](../refactorings/extract-function.md) | Keep comment | An expressive function name communicates intent directly in the code |
| Comment explains what an identifier holds | [Change Function Declaration](../refactorings/change-function-declaration.md) | Keep comment | Renaming the parameter or variable makes the comment redundant |
| Commented-out dead code | Delete the comment | Keep commented out | Git version control tracks historical revisions cleanly |
| Comment explains why a non-obvious decision was made | Keep the current design | Delete comment | Business rationale and external bug references are valuable documentation |

## Verify

- When extracting or moving code, preserve tool directives (`# noqa`, `# type: ignore`) and necessary notes in place on their statements.
- Run the full test suite after refactoring.
- Run project linter and type checker to verify no warnings were introduced.
