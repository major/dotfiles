# Extract Class

Background reference: skill `fowler-refactoring`, ch07.

## When

Use Extract Class when a class has grown too large and handles multiple distinct responsibilities.
Use it when a subset of attributes and methods naturally cluster together, indicating a missing domain entity.
Use it when a group of fields changes together for reasons separate from the rest of the host class.

## Python idiom

Before creating a mutable class, determine whether the extracted data is better expressed as an immutable frozen dataclass.
In idiomatic Python, classes represent entities that combine mutable state with lifecycle management.
If data has no independent lifecycle, prefer a frozen dataclass or a plain dictionary at boundaries.
When a new class is justified, use composition rather than inheritance.
Avoid getter and setter methods by exposing plain public attributes.
Use `@property` only when dynamic computation or validation is strictly required.

## Mechanics

1. Identify the cohesive subset of attributes and methods to extract.
2. Create a new class to represent the extracted responsibility.
3. Instantiate the new class within the source class `__init__` method, or pass it as a dependency.
4. Move the identified attributes from the source class into the new class.
5. Move methods operating primarily on the extracted attributes using [Move Function](move-function.md).
6. Update the source class methods to delegate to the new class instance.
7. Update repository call sites to work directly with the new class where appropriate.
8. Run tests, linter, and type checker to verify behavior preservation.

## Preservation pitfalls

- External attribute access: Callers accessing extracted attributes directly on the source instance will fail unless updated or bridged.
- Equality semantics: Changing class structure alters equality if `__eq__` compares attribute tuples or `__dict__`.
- Serialization: Custom serialization, `pickle`, or `json.dump` schemas will change if the internal object graph changes.
- Bidirectional references: Avoid giving the extracted class a back-link to the parent class unless strictly necessary.

## Before/After

### Before

```pycon
>>> class Person:
...     def __init__(self, name: str, office_area_code: str, office_number: str):
...         self.name = name
...         self.office_area_code = office_area_code
...         self.office_number = office_number
...     def telephone_number(self) -> str:
...         return f"({self.office_area_code}) {self.office_number}"
>>> p = Person("Alice", "415", "555-1212")
>>> p.telephone_number()
'(415) 555-1212'

```

### After

```pycon
>>> from dataclasses import dataclass
>>> @dataclass(frozen=True)
... class TelephoneNumber:
...     area_code: str
...     number: str
...     def format(self) -> str:
...         return f"({self.area_code}) {self.number}"
>>> class Person:
...     def __init__(self, name: str, telephone: TelephoneNumber):
...         self.name = name
...         self.telephone = telephone
...     def telephone_number(self) -> str:
...         return self.telephone.format()
>>> phone = TelephoneNumber("415", "555-1212")
>>> p = Person("Alice", phone)
>>> p.telephone_number()
'(415) 555-1212'

```

## Inverse

The inverse of this refactoring is Inline Class (skill `fowler-refactoring`, ch07).
Use Inline Class when an extracted class is no longer pulling its weight and its responsibilities should return to the host class.
