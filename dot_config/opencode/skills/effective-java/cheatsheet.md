# Effective Java Cheatsheet

## Construction decisions

1. Need one instance, caching, a named mode, or a hidden implementation? Use a static factory.
2. More than a few optional parameters or repeated parameter types? Use a builder.
3. Dependency varies by deployment or test? Inject it; do not construct it inside the class.
4. Singleton required? Prefer a single-element enum unless a different lifecycle is explicit.

## API defaults

| Situation | Default | Reconsider when |
|---|---|---|
| Public field | Private field plus accessor | The type is a data carrier with no invariants |
| Mutable class | Immutable class | Mutation is essential and carefully synchronized |
| Collection result | Empty collection, never `null` | Absence has distinct domain meaning, then consider `Optional` |
| Generic parameter | `T` plus `? extends`/`? super` at boundaries | The API truly needs exact invariance |
| Return type | Interface or minimal capability | Caller legitimately needs a concrete contract |
| Numeric money/count | Integral units or `BigDecimal` | Binary floating point is acceptable for approximation |
| Resource cleanup | try-with-resources | Resource lifetime is deliberately transferred |
| Reflection/native code | Ordinary interfaces and Java code | A verified framework or platform boundary requires it |

## Review decision tree

**A value crosses an API boundary?**
-> Is it mutable? Make a defensive copy or clearly transfer ownership.
-> Is `null` valid? Prefer an empty result; use `Optional` for an optional return value, not fields, parameters, or collections.
-> Is its type a string only by convenience? Use a domain type, enum, or value object.

**A method changes shared state?**
-> Can it fail after partial mutation? Validate/build temporary state, then commit for failure atomicity.
-> Can multiple threads reach it? Establish safe publication and synchronize every related access.
-> Is it scheduling work? Use an executor/task abstraction, not manually managed threads.

**A class extends another class?**
-> Is the superclass designed and documented for inheritance? If not, prefer composition.
-> Can construction call an overridable method? Reject the design.
-> Is the subclass substitutable under equals, synchronization, and failure behavior? If not, do not inherit.

**A stream is proposed?**
-> Is the operation clearer as a pipeline with no shared mutation? Use a stream.
-> Does it require complex control flow, checked exceptions, or stateful coordination? Use a loop.
-> Is parallel speedup measured on this workload and source? Otherwise keep it sequential.

## Smells and fixes

- Raw types, unchecked warnings, or casts scattered through code: parameterize types and isolate any unavoidable checked cast with an invariant comment.
- `ordinal()` used as persisted data or an array index: use an explicit field, `EnumMap`, or `EnumSet`.
- `equals` overridden without `hashCode`, or mutable fields used in either: repair the full contract and avoid mutable keys.
- `clone()` on a public class: prefer copy constructor or copy factory; if cloning remains, handle mutable state and superclass behavior deliberately.
- Catching and ignoring an exception: handle it, propagate it, or explain why it is intentionally irrelevant.
- `float`/`double` for exact currency or decimal results: use integer minor units or `BigDecimal`.
- `new String(...)` or repeated `+` in a loop: remove needless objects or use `StringBuilder` for incremental concatenation.
- Overloads differing only by functional-interface or boxed/primitive types: rename methods or make the call unambiguous.
- Finalizers, cleaners as correctness mechanisms, or Java serialization for new formats: use explicit close/lifecycle methods and a deliberate data format.

## Non-negotiable checks

- Validate parameters at the boundary with the clearest standard exception.
- Override `toString` for useful diagnostics, and document thread-safety and every checked exception.
- Use `@Override`; eliminate compiler warnings before review.
- Optimize only after measuring, and preserve the clearest correct design until evidence demands change.
