# Remove Flag Argument

Background reference: skill `fowler-refactoring`, ch11.

## When

Use Remove Flag Argument when a function accepts a boolean flag or literal discriminator that controls which branch of execution is chosen.
Use it when callers at call sites must read the callee implementation to understand what `True` or `False` means.
Use it to resolve [Long Parameter List](../smells/long-parameter-list.md).

## Python idiom

Boolean arguments create boolean traps where readers at call sites cannot tell what `True` or `False` signifies without inspecting signatures.
Replace the single branching function with separate, clearly named functions that each implement one branch directly.
If callers must compute the flag value dynamically at runtime, provide explicit functions and let callers dispatch with a simple conditional or pass an explicit `Enum`.
Avoid adding keyword-only boolean flags as a substitute for clear, separate functions.

## Mechanics

1. Identify the branching condition driven by the flag argument inside the function.
2. For each branch of the condition, create a separate function with a descriptive name communicating the specific action.
3. Move the corresponding branch logic into each new function, eliminating the flag parameter from their signatures.
4. If common setup or teardown exists between the branches, extract the shared logic into a private helper function.
5. Search the codebase for all call sites passing literal boolean values (`True`, `False`) and update them to call the specific functions.
6. If dynamic callers remain, provide a clean dispatch or keep a top-level dispatcher that delegates to the specific functions.
7. Add Google-style docstrings and type annotations to the newly created functions.
8. Run tests, linter, and type checker to verify behavior preservation.

## Preservation pitfalls

- Dynamic flag values: If callers compute the boolean flag dynamically (e.g. `is_premium = user.balance > 100`), ensure callers can either branch cleanly or call a dispatcher.
- Missing keyword arguments: If existing callers pass the flag by keyword name, updating the signature without updating all callers causes `TypeError`.
- Partial logic branches: Ensure that side effects executed outside the conditional block are faithfully preserved across both extracted functions.

## Before/After

### Before

```pycon
>>> def book_ticket(customer_name: str, is_premium: bool) -> str:
...     if is_premium:
...         return f"VIP ticket for {customer_name} with lounge access"
...     return f"Standard ticket for {customer_name}"
>>> book_ticket("Alice", True)
'VIP ticket for Alice with lounge access'
>>> book_ticket("Bob", False)
'Standard ticket for Bob'

```

### After

```pycon
>>> def book_vip_ticket(customer_name: str) -> str:
...     """Book a VIP ticket with lounge access for a customer."""
...     return f"VIP ticket for {customer_name} with lounge access"
>>> def book_standard_ticket(customer_name: str) -> str:
...     """Book a standard ticket for a customer."""
...     return f"Standard ticket for {customer_name}"
>>> book_vip_ticket("Alice")
'VIP ticket for Alice with lounge access'
>>> book_standard_ticket("Bob")
'Standard ticket for Bob'

```
