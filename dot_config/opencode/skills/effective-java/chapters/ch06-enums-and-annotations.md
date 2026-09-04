# Chapter 6: Enums and Annotations

## Core Idea
Use Java enums as real, type-safe classes for closed sets of values, and use annotations when tools need structured metadata.
Choose the representation that makes invalid states difficult to express and maintenance changes compiler-visible.

## Frameworks Introduced
- **Rich enum pattern**: Put data and behavior on enum constants rather than scattering parallel constants, arrays, and switches.
  - When to use: A finite set of values is known at compile time, especially when each value has properties or behavior.
  - How: Give constants constructor arguments, store immutable instance fields, expose focused methods, and use `values()` for enumeration.
  - Failure mode: A switch inside the enum silently becomes stale when a constant is added; prefer constant-specific implementations or a strategy enum when behavior differs.
- **Constant-specific method implementation**: Declare an abstract enum method and implement it beside every constant.
  - When to use: Each constant has materially different, short behavior.
  - How: Make the operation abstract, then override it in every constant-specific class body so adding a constant requires an implementation.
  - Failure mode: Large or duplicated bodies become unreadable; extract shared helpers or use a private strategy enum.
- **Strategy enum pattern**: Associate each public enum constant with a private enum strategy that supplies shared algorithm families.
  - When to use: Constants share a main algorithm but fall into a few behavior categories, such as weekday versus weekend pay.
  - How: Store a strategy field, delegate the public operation to it, and make the strategy operation abstract so every strategy is explicit.
  - Failure mode: A default strategy can hide a forgotten case; use defaults only when the domain genuinely has one.
- **Enum-backed collections**: Use `EnumSet` for sets and `EnumMap` for maps keyed by one enum type.
  - When to use: A set or lookup table is indexed by enum values.
  - How: Accept `Set<E>` or `Map<E, V>` in APIs, construct `EnumSet` or `EnumMap` internally, and use nested `EnumMap`s for multidimensional relationships.
  - Failure mode: Ordinal-indexed arrays lose type safety and break when constants are reordered or inserted.
- **Interface-emulated extensible enum**: Define an operation interface, supply a standard enum implementation, and let clients add other enums implementing the interface.
  - When to use: The operation set must be extensible, especially for opcodes or plug-in operations.
  - How: Write APIs against the interface; accept `Collection<? extends Operation>` or a bounded enum type token when iterating a complete extension enum.
  - Failure mode: Implementations cannot inherit enum code, and enum-wide operations such as `EnumSet` cannot span unrelated extension enums.
- **Annotation contract**: Prefer compiler-checked metadata over naming conventions.
  - When to use: A tool or framework must identify declarations, attach parameters, or enforce placement and retention rules.
  - How: Define `@Retention`, `@Target`, and annotation members; process with reflection or annotation processing; validate constraints not expressible in the annotation declaration at the processing boundary.
  - Failure mode: Runtime-only constraints, missing retention, and incorrect repeatable-annotation processing produce silent omissions.

## Key Concepts
- **Enum type**: A class with a fixed set of instance-controlled constants and a namespace of its own.
- **Ordinal**: Declaration position of an enum constant, intended for generic enum data structures, not application values.
- **EnumSet**: A type-safe `Set` implementation optimized internally as a bit vector for one enum type.
- **EnumMap**: A map optimized for enum keys while preserving map abstractions and avoiding unsafe index arithmetic.
- **Constant-specific class body**: An enum constant-local implementation of methods or fields.
- **Meta-annotation**: An annotation applied to an annotation declaration, such as `@Target` or `@Retention`.
- **Retention policy**: The stage at which annotation metadata remains available: source, class file, or runtime.
- **Marker annotation**: An annotation with no members that marks a declaration for a tool or framework.
- **Marker interface**: A methodless interface that defines a type and can enable compile-time restriction of API parameters.
- **Repeatable annotation**: An annotation that can appear multiple times through a compiler-generated containing annotation.

## Mental Models
- Think of an enum as a closed polymorphic class hierarchy with singleton instances, not as an integer alias.
- Treat `ordinal()` as an implementation detail belonging to `EnumSet` and `EnumMap`; never use it as persisted or domain data.
- Ask whether a marker defines a type or merely supplies metadata: use an interface for the former and an annotation for the latter.
- Treat annotations as an API contract with a reader, retention policy, target, and processor, not as decorative comments.

## Anti-patterns
- **Int or string enum constants**: They permit cross-domain mixing, lack useful iteration and diagnostics, and can bake values into clients.
- **Ordinal-derived business values**: Reordering constants changes behavior and prevents duplicate or sparse associated values.
- **Bit fields for enum sets**: Manual shifts obscure intent, cap the number of values, and invite bit-manipulation errors.
- **Ordinal-indexed arrays**: The compiler cannot verify the index-to-enum relationship, so edits can cause silent corruption.
- **Enum constructor access to static maps**: Enum constants initialize before ordinary static fields, so this can fail during initialization.
- **Naming patterns for tools**: Typos and invalid placement become silent runtime omissions instead of compile-time errors.
- **Checking only `isAnnotationPresent` for repeatable annotations**: It can miss repeated or non-repeated forms; use `getAnnotationsByType` or account for both forms.
- **Unannotated intended overrides**: A wrong signature can overload rather than override, leaving inherited behavior active.

## Code Examples
```java
public enum Operation {
    PLUS("+", (x, y) -> x + y),
    MINUS("-", (x, y) -> x - y);

    private final String symbol;
    private final DoubleBinaryOperator implementation;

    Operation(String symbol, DoubleBinaryOperator implementation) {
        this.symbol = symbol;
        this.implementation = implementation;
    }

    public double apply(double x, double y) {
        return implementation.applyAsDouble(x, y);
    }
}
```
- **What it demonstrates**: Enum fields can carry immutable data and small, constant-specific function objects without a fragile switch.

```java
public enum Style { BOLD, ITALIC, UNDERLINE }

void applyStyles(Set<Style> styles) { /* ... */ }

applyStyles(EnumSet.of(Style.BOLD, Style.ITALIC));
```
- **What it demonstrates**: Expose the collection interface while using the efficient, readable enum implementation.

```java
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface ExceptionTest {
    Class<? extends Throwable> value();
}
```
- **What it demonstrates**: Annotation members can carry typed parameters, while meta-annotations define where and when processing is possible.

## Reference Tables
| Need | Prefer | Why |
|---|---|---|
| Closed named values | `enum` | Type safety, namespace, evolution, behavior |
| Set of one enum type | `EnumSet` | Set API with compact bit-vector implementation |
| Map keyed by an enum | `EnumMap` | Type-safe keying and array-like performance |
| Tool metadata on declarations | Annotation | Targeting, parameters, retention, processing |
| A compile-time type property | Marker interface | Can constrain method parameters |
| Extensible operation set | Interface plus enums | Client implementations can participate |

| Annotation concern | Decision |
|---|---|
| Need runtime reflection | `RetentionPolicy.RUNTIME` |
| Restrict legal locations | `@Target` |
| One or more values | Array member or `@Repeatable`; process repeated forms carefully |
| Intended override | Always add `@Override` |

## Worked Example
Suppose a report formatter initially accepts `int` flags such as `STYLE_BOLD | STYLE_ITALIC`.
Replace them with a `Style` enum and accept `Set<Style>`.
The caller now writes `EnumSet.of(Style.BOLD, Style.ITALIC)`, receives compile-time checking, and can iterate or log values meaningfully.
If formatting behavior differs by style, attach a strategy or constant-specific method to `Style` rather than switching on an integer.
If a test runner needs to discover test methods, define a runtime-retained, method-targeted `@Test` annotation and reject invalid instance or parameterized methods when invoking them.

## Key Takeaways
1. Use enums for every compile-time-known set of constants, not just traditional enumerations.
2. Store domain values in final fields; never derive them from `ordinal()`.
3. Prefer `EnumSet` and `EnumMap` over manual bit fields and ordinal-indexed arrays.
4. Use interfaces to emulate extensible enums only when extensibility is a real requirement.
5. Prefer annotations to naming conventions, and specify retention and target deliberately.
6. Put `@Override` on every declaration intended to override a supertype method.
7. Choose marker interfaces when clients may need a parameter type; choose marker annotations for metadata and framework integration.

## Connects To
- **Chapter 6: Lambdas and Streams**: Lambdas simplify enum behavior and streams frequently consume enum collections.
- **Chapter 7: Methods**: `Optional`, defensive copying, and interface-typed parameters reinforce explicit API contracts.
- **Chapter 8: General Programming**: Enums replace strings and primitives, while `EnumMap` supports interface-oriented implementation choices.
- **Java Language Specification**: Enum declarations, annotation targets, retention, and override checking define the compiler/runtime boundaries.
