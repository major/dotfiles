# Chapter 8: Methods

## Core Idea
A method is a contract boundary: validate inputs early, preserve encapsulation, choose signatures that are hard to misuse, return absence explicitly, and document observable behavior.
Good method design improves correctness, evolvability, and caller experience before implementation details matter.

## Frameworks Introduced
- **Fail-fast validation**: Check parameter restrictions at the start of public methods and constructors.
  - When to use: Inputs have domain, nullability, range, or state preconditions.
  - How: Document restrictions with `@param` and `@throws`, use `Objects.requireNonNull`, range checks, or the appropriate standard exception, and validate values that will be stored.
  - Failure mode: Delayed or implicit checks produce confusing exceptions, corrupted invariants, and loss of failure atomicity.
- **TOCTOU-safe defensive copying**: Copy mutable inputs before validating and storing them, and copy mutable internals before returning them.
  - When to use: A class accepts or exposes mutable arrays, dates, collections, or client-owned objects.
  - How: Make the copy first, validate the copy, store private state, and return a fresh copy or immutable view.
  - Failure mode: Checking an original before copying leaves a time-of-check/time-of-use race; using `clone()` on subclassable untrusted types can leak hostile subclasses.
- **Power-to-weight signature design**: Prefer short, orthogonal signatures and avoid convenience methods that do not pull their weight.
  - When to use: Designing public APIs, especially interfaces.
  - How: Aim for four or fewer parameters, split operations, introduce a parameter object, or adapt a builder for optional groups; accept interface types and use descriptive two-value enums instead of opaque booleans.
  - Failure mode: Long same-typed parameter lists compile after transposition but do the wrong thing.
- **Static overload resolution model**: Overloading is selected from compile-time parameter types, while overriding is selected dynamically.
  - When to use: Reviewing overload sets, autoboxing, generics, or functional-interface APIs.
  - How: Avoid same-arity overloads unless parameter types are radically different or behavior is identical; use distinct names or explicit casts when necessary.
  - Failure mode: `list.remove(1)` removes an index while `list.remove((Integer) 1)` removes a value; lambda and method-reference overloads can be ambiguous.
- **Required-plus-varargs pattern**: Put mandatory values in ordinary parameters before a varargs tail.
  - When to use: A variable-arity operation is undefined for zero arguments.
  - How: Use `min(first, remaining...)` rather than accepting an empty varargs array and failing at runtime.
  - Failure mode: Every varargs call may allocate an array; measured hot paths can use common-arity overloads plus a varargs fallback.
- **Empty-result rule**: Return empty collections or arrays, never `null`, for empty sequences.
  - When to use: A method conceptually returns a container that may have no elements.
  - How: Return a correctly typed empty result, optionally shared immutable empties after measurement.
  - Failure mode: `null` forces repetitive checks and creates delayed `NullPointerException`s without meaningful performance benefit.
- **Judicious Optional**: Return `Optional<T>` when absence is a normal result that callers must confront.
  - When to use: A method may legitimately have no single result and special absence handling matters.
  - How: Return `Optional.empty()` or `Optional.of(value)`, use `orElse`, `orElseGet`, `orElseThrow`, `map`, and `flatMap`, and use `OptionalInt`, `OptionalLong`, or `OptionalDouble` for primitives.
  - Failure mode: Never return null Optional; avoid Optional in collections, map values, parameters, fields by default, or as a wrapper around containers.
- **API contract documentation**: Document every exposed element’s purpose, parameters, result, exceptions, side effects, thread safety, and serialized form as applicable.
  - When to use: Any public or protected API.
  - How: Use complete Javadoc, `@implSpec` for subclass obligations, `@code`/`@literal` for source fragments, and distinct first-sentence summaries.
  - Failure mode: Describing implementation instead of contract, omitting preconditions, or leaving HTML/Javadoc syntax unchecked makes the API difficult to use.

## Key Concepts
- **Precondition**: A condition that must hold before a successful invocation.
- **Postcondition**: A condition guaranteed after successful completion.
- **Failure atomicity**: A failed operation leaves the object as it was before the call.
- **Defensive copy**: An independent copy that prevents aliasing with mutable client data.
- **TOCTOU**: A time-of-check/time-of-use race between validation and later use.
- **Varargs**: A variable-arity parameter implemented through an array at the call site.
- **Overloading**: Same method name with different parameter signatures, selected statically.
- **Overriding**: A subtype implementation of a supertype method, selected dynamically.
- **Optional**: An immutable container holding zero or one non-null value.
- **`@implSpec`**: Documentation of implementation obligations visible to subclasses.

## Mental Models
- Design every public method as a protocol: preconditions in, postconditions out, side effects disclosed.
- Validate at the boundary, before state escapes or is stored; failure location should be near the mistake.
- Assume client references are hostile aliases unless the API explicitly documents ownership transfer.
- Optimize API ergonomics for the caller’s common path, not for the implementer’s shortest body.

## Anti-patterns
- **Late validation**: Invalid inputs travel into unrelated code and fail with misleading exceptions.
- **Aliasing mutable state**: Constructor parameters and accessors expose the object’s invariants to external mutation.
- **Boolean mode parameters**: `newInstance(true)` hides intent and makes future modes awkward.
- **Same-arity confusing overloads**: Compile-time selection surprises callers, especially with boxing and lambdas.
- **Zero-argument varargs for required input**: Invalid calls compile and fail only at runtime.
- **`null` for empty containers**: Every caller must branch and may forget.
- **Eager `orElse` for expensive defaults**: The default is computed even when a value is present; use `orElseGet`.
- **Optional containers and boxed numeric optionals**: They add needless representation and allocation overhead.
- **Undocumented public contract**: Callers cannot safely depend on behavior, exceptions, or side effects.

## Code Examples
```java
public Period(Date start, Date end) {
    Date startCopy = new Date(Objects.requireNonNull(start).getTime());
    Date endCopy = new Date(Objects.requireNonNull(end).getTime());
    if (startCopy.after(endCopy)) {
        throw new IllegalArgumentException("start after end");
    }
    this.start = startCopy;
    this.end = endCopy;
}

public Date start() { return new Date(start.getTime()); }
```
- **What it demonstrates**: Copy before validation and copy again on output to preserve invariants across mutable aliases.

```java
static int min(int first, int... rest) {
    int result = first;
    for (int value : rest) result = Math.min(result, value);
    return result;
}

static <E extends Comparable<E>> Optional<E> max(Collection<E> values) {
    return values.stream().max(Comparator.naturalOrder());
}
```
- **What it demonstrates**: Required-plus-varargs and explicit absence avoid invalid empty calls and exception/null conventions.

## Reference Tables
| Problem | Preferred design |
|---|---|
| Null required | `Objects.requireNonNull(value, "name")` |
| Index/range restriction | Explicit documented check or `Objects.checkIndex` family |
| Mutable input retained | Defensive copy before validation/storage |
| Mutable field exposed | Defensive copy or immutable view |
| Optional mode | Two-value enum with a meaningful name |
| Empty sequence | Empty collection/array |
| Missing scalar result | `Optional<T>` or primitive Optional |
| Many optional parameters | Builder-style parameter object |

| Situation | Resolution |
|---|---|
| Same-arity overloads with unrelated types | Prefer distinct method names |
| Overload unavoidable | Ensure radically different types or identical behavior |
| Need remove by list value | Cast or convert to `Integer`, not `int` |
| Expensive Optional default | `orElseGet(factory)` |
| Public method | `@param`, `@return`, `@throws`, side effects, and relevant thread/serialization contract |

## Worked Example
Design `findBest(Collection<E>)` for an empty collection.
Throwing an unchecked exception permits callers to ignore absence, while returning null moves the failure to an arbitrary later dereference.
Return `Optional<E>` instead, so a caller chooses `orElse`, `orElseGet`, `orElseThrow`, or a mapping operation.
For a sequence result, return `List<E>` or another empty collection rather than `Optional<List<E>>`.
If the implementation accepts mutable dates or arrays, copy at entry and exit so the result remains valid even when the caller mutates its original objects.

## Key Takeaways
1. Document and enforce parameter restrictions at the boundary.
2. Preserve failure atomicity by validating before mutation and copying mutable aliases.
3. Keep signatures short, interface-oriented, and semantically explicit.
4. Treat overload resolution as compile-time dispatch, especially around boxing and lambdas.
5. Use varargs for genuine variable arity and put required arguments first.
6. Return empty containers for empty sequences and Optional for meaningful scalar absence.
7. Make Javadoc a complete contract, not a restatement of the method name.

## Connects To
- **Chapter 5: Enums and Annotations**: Enums improve signatures, while annotations and `@Override` protect contracts.
- **Chapter 6: Lambdas and Streams**: Functional-interface overloads, collectors, stream return types, and Optional pipelines depend on these method rules.
- **Chapter 8: General Programming**: Interface references, primitive choices, and measured optimization are consequences of API design.
