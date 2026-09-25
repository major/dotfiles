# Mysterious Name

Background reference: skill `fowler-refactoring`, ch03 and ch06.

## Symptom

A variable, parameter, function, class, or module has an identifier that does not communicate its purpose.
Readers must pause and deduce the meaning from surrounding code or implementation details.

## Python forms

- Cryptic abbreviations: Single-letter or compressed variable names (such as `d`, `tmp`, `fn`) that mask domain meaning.
- Non-standard casing: Functions or arguments named with mixedCase instead of idiomatic `snake_case`.
- Misleading nouns or verbs: Functions named after data structures instead of actions, or collections named as singular entities.
- Ambiguous identifiers: Identifiers like `data`, `info`, or `item` used in scopes where multiple entities interact.

## Detect

### Evidence of harm

Do not rename identifiers solely for stylistic preference.
Confirm Mysterious Name only when concrete harm exists:
- Semantic distance: Readers must inspect function bodies or collaborator files to discover what a parameter or variable holds.
- Misleading assumptions: An identifier implies one type, units, or lifecycle but actually holds another, leading to bugs.
- Frequent renaming friction: Developers hesitate to touch code or add comments explaining what identifiers represent.

### Ruff hints

- `N802` (invalid-function-name): Flags function names that violate `snake_case`.
- `N803` (invalid-argument-name): Flags function arguments that violate `snake_case`.
- `N806` (non-lowercase-variable-in-function): Flags local variables inside functions using uppercase or mixed casing.
- `E741` (ambiguous-variable-name): Flags ambiguous single-character names such as `l`, `O`, or `I`.

### Look-alikes

- Comments: Explanatory comments placed directly above an obscurely named variable or function to describe what it is.
  Rename the identifier first to make the comment redundant.
- Speculative Generality: Abstract parameter names introduced for unused future features.
  The issue is speculative generality rather than poor naming.

### Deliberate exceptions

- Conventional short variables: Standard mathematical variables (`x`, `y`, `i`), coordinate pairs, or loop indices within short comprehensions.
- Protocol signatures: Conforming to existing third-party interfaces or standard library callables where parameter names are prescribed.

## Choose

| Situation | Chosen refactoring | Alternative | Why |
| --- | --- | --- | --- |
| Function or method name is obscure or misleading | [Change Function Declaration](../refactorings/change-function-declaration.md) | Add docstring | Expressive names communicate intent directly at call sites |
| Parameter name obscures type or role | [Change Function Declaration](../refactorings/change-function-declaration.md) | Keep name with type hint | Clear parameter names document keyword arguments at call sites |
| Local variable name obscures purpose | Change Function Declaration | Retain abbreviation | Clear variable names eliminate need for local comments |
| Name conforms to domain standard | Keep the current design | Change Function Declaration | Domain terms should be preserved even if terse |

## Verify

- Run the full test suite after renaming across all call sites.
- Run project linter and type checker to confirm no references were broken.
- Check dynamic references such as `getattr`, `__all__`, and string mock patches.
