# Temporary Field

Background reference: skill `fowler-refactoring`, ch03 and ch07.

## Symptom

An object contains instance attributes that are only populated and valid during certain specific operations or phases of calculation.
At all other times, these attributes sit as `None` or uninitialized, confusing callers who expect full object validity.

## Python forms

- Attributes created outside `__init__`: Setting new attributes on `self` inside arbitrary methods (e.g. `self.temp_result = ...`) rather than during initialization.
- Optional fields used only in sub-algorithms: Classes holding numerous `Optional[T]` fields that remain `None` except when a specific secondary method executes.
- Clustered calculation scratchpads: Passing instance attributes around as temporary scratchpads during a complex calculation.

## Detect

### Evidence of harm

Do not treat cached properties (like `@functools.cached_property`) as temporary fields if they represent lazy evaluation of stable values.
Confirm Temporary Field only when concrete harm exists:
- Incomplete object states: Methods fail with `AttributeError` or `NoneType` errors if called before an arbitrary prerequisite method is run.
- Hidden lifecycle order: Callers must invoke methods in an implicit, undocumented sequence to populate temporary attributes.
- Obscured object invariants: It is impossible to tell from `__init__` what attributes the class actually possesses throughout its lifecycle.

### Ruff hints

- `RUF012` (mutable-class-default): Class attribute annotations used to declare optional attributes.

### Look-alikes

- Mutable Data: Instance attributes mutated throughout the lifecycle.
  Temporary Field applies specifically to fields valid only in an isolated calculation phase.
- Long Function: Tangled locals in a long function; when moved to instance fields, they become temporary fields.

### Deliberate exceptions

- Lazy cached properties: Attributes holding memoized results computed on demand and cached for the object lifetime.
- Deserialization builders: Temporary builder patterns where attributes accumulate during structured parsing before freeze.

## Choose

| Situation | Chosen refactoring | Alternative | Why |
| --- | --- | --- | --- |
| Attributes used only during an isolated algorithm | [Extract Class](../refactorings/extract-class.md) | Keep optional fields | Moves temporary state and algorithm into a dedicated calculator object |
| Fields set dynamically outside `__init__` | [Extract Class](../refactorings/extract-class.md) | Initialize with None | Declaring all attributes at initialization guarantees predictable object shape |
| Temporary variables passed through instance attributes | [Extract Class](../refactorings/extract-class.md) | Module functions | Stateless pure functions taking explicit arguments eliminate object state entirely |
| Stable property lazily evaluated and cached | Keep the current design | Extract Class | Standard lazy caching patterns with `@cached_property` are idiomatic |

## Verify

- Run the full test suite covering all object creation and method invocation orders.
- Run project type checker to verify that all instance attributes are declared in `__init__`.
- Ensure no methods depend on undocumented invocation ordering.
