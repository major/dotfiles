# Extract Function

Background reference: skill `fowler-refactoring`, ch06.

## When

Use Extract Function when a fragment of code within a longer function can be grouped together and named according to its purpose.
Use it when code requires an explanatory comment to explain what it is doing.
Use it when a code block is duplicated across several places, or to isolate a sub-task before applying [Move Function](move-function.md).

## Python idiom

Prefer module-level pure functions that take explicit arguments and return computed values.
Avoid modifying mutable arguments passed into the extracted function.
Provide Google-style docstrings and explicit type hints on newly extracted functions.
If the extracted code requires no instance attributes, define it at module scope rather than as a class method.
If radon is available in the target environment, verify that `radon cc` grades the new function B or better and no function grade gets worse.
Do not install tools in the target environment.

## Mechanics

1. Create a new target function named after the intention of the extracted code.
2. Copy the code fragment from the source function into the target function.
3. Pass all variables read by the extracted fragment as explicit parameters.
4. If the fragment reassigns a local variable needed by remaining code in the source function, return that variable.
5. If the fragment reassigns multiple variables, extract smaller single-purpose functions or return a frozen dataclass.
6. Replace the original code fragment in the source function with a call to the new function.
7. Move existing inline comments and tool directives (`# noqa`, `# type: ignore`, `# pragma`) alongside their corresponding statements.
8. Add Google-style docstring and type hints to the extracted function.
9. Run tests, linter, and type checker to verify behavior preservation.

## Preservation pitfalls

- Variable reassignment: Reassigning a variable inside the extracted function does not update the caller's local variable unless returned explicitly.
- Control flow interruption: Watch for `return`, `break`, or `continue` statements inside the fragment, which alter control flow if extracted directly.
- Scope and closures: Extracting code that reads or binds `nonlocal` variables requires careful parameter passing to preserve state boundaries.
- Exception boundaries: If the fragment is inside a `try...except` block, ensure that exception handling remains intact.
- Directive movement: Keep linter suppression comments on the specific statements that require them.

## Before/After

### Before

```pycon
>>> def calculate_invoice_total(subtotal: float, discount: float, state: str) -> float:
...     # calculate state sales tax
...     tax_rate = 0.08 if state == "CA" else 0.05
...     tax = subtotal * tax_rate
...     total = subtotal - discount + tax
...     return round(total, 2)
>>> calculate_invoice_total(100.0, 10.0, "CA")
98.0

```

### After

```pycon
>>> def calculate_tax(subtotal: float, state: str) -> float:
...     """Calculate sales tax for a given subtotal and state.
...
...     Args:
...         subtotal: The order subtotal amount.
...         state: Two-letter state postal code.
...
...     Returns:
...         Calculated sales tax amount.
...     """
...     # calculate state sales tax
...     tax_rate = 0.08 if state == "CA" else 0.05
...     return subtotal * tax_rate
>>> def calculate_invoice_total(subtotal: float, discount: float, state: str) -> float:
...     """Calculate final invoice total including discount and tax."""
...     tax = calculate_tax(subtotal, state)
...     total = subtotal - discount + tax
...     return round(total, 2)
>>> calculate_invoice_total(100.0, 10.0, "CA")
98.0

```

## Inverse

The inverse of this refactoring is Inline Function (skill `fowler-refactoring`, ch06).
Use Inline Function when a function body is just as clear as its name, or when unnecessary indirection obscures code flow.
