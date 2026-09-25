# Feature Envy

Background reference: skill `fowler-refactoring`, ch03 and ch08.

## Symptom

A function or method accesses data or functions of another module or class more than its own enclosing context.
The logic seems more interested in a collaborator than in where it currently lives.

## Python forms

- External attribute access: A method barely uses `self` and instead calls methods or reads multiple attributes on a passed collaborator.
- Dict envy: A function repeatedly navigates nested keys of an external dictionary, assuming the internal structure of data owned elsewhere.
- Module envy: A function in one module frequently calls internal helpers or accesses data from another module to perform domain calculations.

## Detect

### Evidence of harm

Do not treat attribute counts or dictionary lookups as proof of a smell.
Confirm Feature Envy only when concrete harm exists:
- Change coupling: The function must change whenever the collaborator alters its internal data structures or key names.
- Duplicated domain rules: Multiple callers repeat identical calculations on the collaborator's data instead of using a single domain method.
- Fragile contracts: Callers must understand the detailed schema or private conventions of the collaborator.

### Ruff hints

- `PLR6301` (no-self-use): Flags instance methods that do not use `self`.
  Such methods frequently belong on a collaborator or as a standalone module-level function.
- `SLF001` (private-member-access): Flags code accessing private underscore members of another class.
  This signals intimate coupling and misplaced responsibility.

### Look-alikes

- Message Chains: Code navigates deep chains like `customer.contract.billing.address.zip`.
  Message Chains couple the caller to the navigation path across many objects, whereas Feature Envy couples a function deeply to a single collaborator.
- Data Class: A class with fields and no methods often attracts envious callers.
  The smell in the caller is Feature Envy, while the data holder may be a Data Class.

### Deliberate exceptions

- Pure functions over frozen records: A pure function that takes a frozen dataclass and computes a value is valid functional design when both live in the same domain module.
- Serialization and boundary mapping: Adapters converting domain entities to DTOs, database rows, or JSON dictionaries legitimately inspect many fields.
- Strategy pattern: Strategy objects specifically exist to operate on context objects passed as arguments.

## Choose

| Situation | Chosen refactoring | Alternative | Why |
| --- | --- | --- | --- |
| Entire function envies a collaborator class or module | [Move Function](../refactorings/move-function.md) | Keep in source with accessor | Moving colocates logic with data and eliminates change coupling |
| Only part of a function envies a collaborator | [Extract Function](../refactorings/extract-function.md) then [Move Function](../refactorings/move-function.md) | Move entire function | Separates host-specific responsibilities from collaborator-focused logic |
| Function needs no instance state on the target | [Move Function](../refactorings/move-function.md) to target module | Create a wrapper class | Module-level functions are idiomatic in Python and avoid unnecessary class overhead |
| Access causes no change coupling or duplication | Keep the current design | Move Function | Restructuring without demonstrated harm creates unnecessary indirection |

## Verify

- Run the test suite before and after moving the function.
- Run the project linter and type checker on both source and target locations.
- Verify caller references and mock patch paths across tests.
