# Chapter 5: Generics

## Core Idea
Generics move type errors from distant runtime casts to compile time, but erasure and invariance require deliberate API design.
Make generic types and methods usable without casts, eliminate unchecked warnings, and use wildcards to express producer/consumer variance.

## Frameworks Introduced
- **Parameterized types over raw types**: `List<String>` carries an enforceable element type; raw `List` opts out of generic safety.
  - When to use: Always use parameterized or wildcard types in new code; raw types remain only for legacy interoperation, class literals, and some `instanceof` syntax.
  - How: Use `List<?>` when the element type is unknown, `List<Object>` when arbitrary objects are intentionally accepted, and diamond inference at construction.
  - Failure modes: Raw insertion creates heap pollution and delayed `ClassCastException`.
- **Unchecked-warning discipline**: Treat every unchecked warning as a possible type-safety defect.
  - When to use: Any cast, conversion, generic varargs declaration, or legacy boundary producing a warning.
  - How: Eliminate it first; if safety is proven, suppress only the smallest declaration and document the proof.
  - Failure modes: Class-wide suppression hides future defects and converts a useful signal into false confidence.
- **PECS (Producer-Extends, Consumer-Super)**: Use `? extends T` for inputs that produce T values and `? super T` for inputs that consume T values.
  - When to use: Public methods accepting generic collections, iterables, comparators, or factories.
  - How: `pushAll(Iterable<? extends E>)`, `popAll(Collection<? super E>)`; keep concrete generic return types rather than wildcard returns.
  - Failure modes: Wildcards on a parameter that both produces and consumes do not solve the exact-type requirement.
- **Typesafe heterogeneous container**: Parameterize keys, commonly `Class<T>`, rather than a fixed container, to store values of many types safely.
  - When to use: Registries, configuration/favorites, or rows with an open-ended set of typed attributes.
  - How: Store `Map<Class<?>, Object>`, accept `<T> void put(Class<T>, T)`, and recover with `type.cast(value)`.
  - Failure modes: Raw keys bypass compile-time linkage; `Class<T>` cannot represent non-reifiable types such as `List<String>`.

## Key Concepts
- **Generic type**: Class/interface declaration with formal type parameters.
- **Parameterized type**: Generic type applied to actual arguments, such as `List<String>`.
- **Raw type**: Generic type used without arguments, disabling most checks.
- **Unbounded wildcard**: `?`, representing an unknown but fixed type.
- **Invariance**: `List<Sub>` is neither a subtype nor supertype of `List<Super>`.
- **Erasure**: Generic type information is mainly removed from runtime representation.
- **Reifiable type**: Runtime representation retains enough type information for reliable checks.
- **Heap pollution**: A parameterized variable refers to an object not matching its parameterized type.
- **Type token**: A class literal used to carry compile-time and runtime type information.
- **Recursive type bound**: A bound involving its parameter, such as `E extends Comparable<E>`.

## Mental Models
- Arrays are covariant and reified; generics are invariant and erased. Prefer the compile-time safety of lists when the two collide.
- A wildcard describes permitted variance at an API boundary; a type parameter names a relationship that must be preserved.
- Keep unsafe operations at one small, audited boundary, then expose a fully typed API.
- A `Class<T>` key reestablishes the type relationship at retrieval time through `Class.cast`.

## Anti-patterns
- **Raw collection or raw generic method**: Defers type errors to runtime and loses expressive contracts.
- **Generic array creation**: Non-reifiable component types cannot be safely checked by the JVM.
- **Broad `@SuppressWarnings`**: Masks unsafe changes and makes new warnings invisible.
- **Difference comparator**: Use `Integer.compare`, not subtraction.
- **Unsafe generic varargs**: Storing into or exposing the varargs array causes heap pollution.
- **Wildcard return type**: Forces callers to handle unnecessary capture; return a concrete type parameter instead.

## Code Examples
```java
public void pushAll(Iterable<? extends E> source) {
    for (E value : source) push(value);
}

public void popAll(Collection<? super E> destination) {
    while (!isEmpty()) destination.add(pop());
}

@SafeVarargs
static <T> List<T> flatten(List<? extends T>... lists) {
    List<T> result = new ArrayList<>();
    for (List<? extends T> list : lists) result.addAll(list);
    return result;
}
```
- **What it demonstrates**: PECS and a safe generic varargs method that neither writes to nor exposes its array.

## Reference Tables
| Need | Declaration | Meaning |
|---|---|---|
| Exact relationship | `List<E>` | Reads/writes the same E |
| Unknown type | `List<?>` | Safe to read as Object; cannot add non-null |
| Produces T | `Iterable<? extends T>` | Accept T or any subtype |
| Consumes T | `Collection<? super T>` | Accept T or any supertype |
| Arbitrary values intentionally | `List<Object>` | Explicitly accepts every reference type |
| Runtime typed key | `Class<T>` | Carries a reifiable type token |

## Worked Example
Design `Registry` for plugins keyed by their interface class.
`put(PluginType<T>, T)` or `put(Class<T>, T)` validates the key/value pairing, stores behind `Map<Class<?>, Object>`, and retrieves with `type.cast`.
For a batch API, accept `Collection<? extends Plugin>` as input and return `List<Plugin>` rather than `List<? extends Plugin>`.
If the registry must support `List<String>` as a key, a plain class token is insufficient; introduce a richer type-token abstraction instead of pretending erasure preserves that parameter.

## Key Takeaways
1. Never use raw types in new code; distinguish `<?>` from `Object` deliberately.
2. Compile with warnings visible, eliminate unchecked warnings, and document narrow proven suppressions.
3. Prefer lists to arrays when generic and runtime type rules conflict.
4. Apply PECS to input parameters and keep return types concrete and usable.
5. Use generic types/methods so clients do not write casts; use type tokens for open-ended typed registries.

## Connects To
- **Chapter 2**: Builder hierarchies use recursive bounds and generic self types.
- **Chapter 3**: `Comparable<T>` and comparator contracts depend on correct generic signatures.
- **Chapter 4**: Interface-based composition becomes more reusable with wildcard-flexible APIs.
