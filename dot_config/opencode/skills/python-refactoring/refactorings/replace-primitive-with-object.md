# Replace Primitive with Object

Background reference: skill `fowler-refactoring`, ch07.

## When

Use Replace Primitive with Object when a raw primitive (string, integer, dictionary) represents a domain concept that has specific rules, constraints, or validations.
Use it when raw dictionary payloads from I/O boundaries flow across internal layers, forcing multiple callers to validate keys or extract fields.
Use it to resolve [Primitive Obsession](../smells/primitive-obsession.md).

## Python idiom

Map boundary data (e.g. JSON dictionaries or query parameters) to `@dataclass(frozen=True)` records immediately at the system boundary.
Core domain logic should interact exclusively with typed records rather than unstructured dictionaries.
Use `Enum` or `StrEnum` (Python 3.11+) when a primitive string represents a closed set of domain values.
Use a boundary conversion function to normalize and construct the frozen record rather than mutating fields inside `__post_init__`.
Use `TypedDict` only when the dictionary structure must be preserved verbatim for external serialization (use `ReadOnly` only on Python 3.13+).

## Mechanics

1. Define a `@dataclass(frozen=True)` representing the domain concept with typed fields.
2. Move existing validation or normalization logic into a boundary mapping function; adding new validation is a separate follow-up task.
3. At the system boundary (e.g. API endpoint, file reader), map incoming primitives or dictionaries to the new dataclass instance using the boundary function.
4. Update internal callee signatures to accept the new record object instead of raw primitives.
5. Replace dictionary indexing (e.g. `user["email"]`) with dot-attribute access (e.g. `user.email`).
6. Add Google-style docstrings and type annotations to the record definition and callers.
7. Run tests, linter, and type checker to verify behavior preservation.

## Preservation pitfalls

- Dictionary key subscripting: Replacing a dictionary with a dataclass breaks any caller expecting `record["key"]`; update all in-repo callers.
- Serialization boundaries: If instances must be returned as JSON, provide an explicit serializer function rather than passing the dataclass directly to `json.dumps`.
- Hashability and mutability: Frozen dataclasses are hashable by default, whereas mutable objects are not; ensure caller equality comparisons behave as expected.
- Record freezing considerations: Before making a record frozen, check caller usage including weak references, positional construction, and structural pattern matching.

## Before/After

### Before

```pycon
>>> def create_user_profile(user_dict: dict[str, str]) -> str:
...     # Raw dictionary accessed across functions without contract
...     name = user_dict["name"].strip()
...     email = user_dict["email"].lower()
...     return f"User {name} <{email}>"
>>> create_user_profile({"name": " Alice ", "email": "ALICE@EXAMPLE.COM"})
'User Alice <alice@example.com>'

```

### After

```pycon
>>> from dataclasses import dataclass
>>> @dataclass(frozen=True)
... class UserProfile:
...     """Immutable user profile data contract."""
...     name: str
...     email: str
>>> def profile_from_dict(user_dict: dict[str, str]) -> UserProfile:
...     """Create normalized user profile from raw boundary dictionary."""
...     return UserProfile(name=user_dict["name"].strip(), email=user_dict["email"].lower())
>>> def create_user_profile(profile: UserProfile) -> str:
...     """Format user profile string from verified record."""
...     return f"User {profile.name} <{profile.email}>"
>>> user = profile_from_dict({"name": " Alice ", "email": "ALICE@EXAMPLE.COM"})
>>> create_user_profile(user)
'User Alice <alice@example.com>'

```
