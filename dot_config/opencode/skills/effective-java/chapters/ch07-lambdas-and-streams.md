# Chapter 7: Lambdas and Streams

## Core Idea
Use lambdas and streams to express small functions and bulk transformations, but preserve readability, purity, and an honest API contract.
Streams are a paradigm of lazy, functional transformations, not a syntax for rewriting every loop.

## Frameworks Introduced
- **Function-object progression**: Prefer lambdas to anonymous classes for small functional-interface instances.
  - When to use: A behavior is short, local, and targets exactly one abstract method.
  - How: Let generic target typing infer parameter types, keep the body near one line and rarely beyond three, and use a named method/class when behavior needs explanation or serialization.
  - Failure mode: Long lambdas have no useful name or documentation; anonymous classes remain appropriate for abstract classes, multi-method interfaces, self-reference, or serializable function objects.
- **Method-reference rule**: Prefer a method reference when it is shorter and clearer than the equivalent lambda, not mechanically in every case.
  - When to use: The referenced method name communicates the operation better than parameter names and lambda syntax.
  - How: Extract complex lambda logic into a well-named method, then reference it; retain the lambda when it is more readable, especially for a same-class method with a long class name.
  - Failure mode: An opaque method reference can hide important parameter meaning.
- **Standard functional interface selection**: Choose the smallest matching interface from `java.util.function` before inventing one.
  - When to use: An API accepts or returns a function object.
  - How: Classify it as `UnaryOperator`, `BinaryOperator`, `Predicate`, `Function`, `Supplier`, or `Consumer`; use primitive specializations to avoid boxing.
  - Failure mode: A custom interface is still warranted for a strong domain contract, a frequent descriptive name, custom defaults, checked exceptions, or a nonstandard arity.
- **Stream pipeline model**: Compose source, zero or more lazy intermediate operations, and one terminal operation.
  - When to use: The computation naturally transforms, filters, combines, groups, searches, or reduces a sequence.
  - How: Name helper operations, use meaningful lambda parameters, choose collectors deliberately, and combine iteration with streams when that improves clarity.
  - Failure mode: A pipeline without a terminal operation does nothing; excessive chaining obscures control flow and makes stateful work awkward.
- **Side-effect-free stream paradigm**: Make pipeline functions stateless, non-interfering, and as close to pure as practical.
  - When to use: Any intermediate operation, reduction, or collector composition.
  - How: Return computed values through `map`, `filter`, `collect`, `reduce`, `groupingBy`, or `toMap`; reserve `forEach` chiefly for reporting results.
  - Failure mode: Mutating an external accumulator works sequentially but harms clarity and can fail under parallel execution.
- **Parallel-stream decision rule**: Parallelize only after correctness and realistic measurement establish a gain.
  - When to use: Large, splittable sources with expensive independent per-element work and a parallel-friendly terminal reduction.
  - How: Favor arrays, ranges, `ArrayList`, `HashMap`, `HashSet`, or `ConcurrentHashMap`; require associative/stateless functions; measure before and after.
  - Failure mode: `Stream.iterate`, `limit`, ordered output, costly collection combining, poor locality, or insufficient work can cause slowdown, liveness failure, or wrong results.

## Key Concepts
- **Functional interface**: An interface with one abstract method that can receive a lambda.
- **Target typing**: Compiler inference of a lambda’s type from its context.
- **Method reference**: A compact function-object expression referring to an existing method or constructor.
- **Stream**: A finite or infinite sequence of values, distinct from a collection that stores them.
- **Intermediate operation**: A lazy stream transformation such as `map`, `filter`, or `flatMap`.
- **Terminal operation**: An operation that evaluates a pipeline, such as `collect`, `reduce`, `count`, or `forEach`.
- **Collector**: A reduction strategy packaged for stream accumulation, grouping, mapping, or joining.
- **Non-interference**: A stream function does not modify the source or shared state during traversal.
- **Spliterator**: The abstraction used to split a source for parallel processing.

## Mental Models
- Read a pipeline as a data-flow sentence: source, transformations, reduction, result.
- Use iteration when the algorithm needs mutable local state, early `break`/`continue`, checked exceptions, or multiple synchronized cursors.
- Treat a collector as a declarative destination policy, especially when collisions, grouping, map type, or downstream aggregation matter.
- Parallelism is a measured optimization layered onto a correct sequential design, never a semantic shortcut.

## Anti-patterns
- **Streamified loop**: A `forEach` lambda mutates an external map or list, retaining iteration’s statefulness without its clarity.
- **One giant pipeline**: Nested lambdas and clever collectors hide domain operations and make review difficult.
- **Boxed primitive bulk processing**: `Function<Integer, Integer>` and similar types add allocation and unboxing costs; use primitive interfaces/streams.
- **Blind method-reference conversion**: Shorter syntax is not automatically clearer.
- **Ambiguous functional-interface overloads**: Overloads accepting different functional interfaces in the same position can make lambdas fail to compile or require casts.
- **Parallel by default**: `parallel()` can create CPU saturation, ordering changes, nondeterminism, or liveness failures.
- **Character stream assumption**: `String.chars()` yields `IntStream`; it is often clearer and safer not to process characters as streams.

## Code Examples
```java
words.sort(Comparator.comparingInt(String::length));

Map<String, Long> frequencies = words.stream()
        .collect(Collectors.groupingBy(String::toLowerCase,
                                       Collectors.counting()));
```
- **What it demonstrates**: Method references and a side-effect-free collector replace verbose function objects and external mutation.

```java
Map<String, Integer> counts = new HashMap<>();
counts.merge(word, 1, Integer::sum);
```
- **What it demonstrates**: `Integer::sum` is clearer than a two-parameter addition lambda when parameter names add no meaning.

```java
static <E> Iterable<E> iterableOf(Stream<E> stream) {
    return stream::iterator;
}

static <E> Stream<E> streamOf(Iterable<E> iterable) {
    return StreamSupport.stream(iterable.spliterator(), false);
}
```
- **What it demonstrates**: Public sequence APIs may need adapters because `Stream` does not extend `Iterable`.

## Reference Tables
| Shape | Standard interface | Example |
|---|---|---|
| `T -> T` | `UnaryOperator<T>` | `String::toLowerCase` |
| `(T,T) -> T` | `BinaryOperator<T>` | `BigInteger::add` |
| `T -> boolean` | `Predicate<T>` | `Collection::isEmpty` |
| `T -> R` | `Function<T,R>` | `Arrays::asList` |
| `() -> T` | `Supplier<T>` | `Instant::now` |
| `T -> void` | `Consumer<T>` | `System.out::println` |

| Requirement | Prefer |
|---|---|
| Transform/filter/reduce/group | Stream pipeline |
| Mutable local state or control flow | Iteration |
| Both concerns | Hybrid stream plus helper/loop |
| Public reusable sequence | `Collection` when feasible |
| Huge or lazily generated sequence | `Stream` or `Iterable`, based on client use |

## Worked Example
To print large anagram groups, first define a named `alphabetize(String)` helper that sorts a word’s characters.
Collect dictionary words with `groupingBy(word -> alphabetize(word))`, then stream the groups, filter by minimum size, and print them.
This split keeps the domain operation named and testable while streams express grouping and selection.
Do not replace the helper with a deeply nested character pipeline merely to eliminate one method.
If the API returns the groups publicly, prefer a collection when the result fits memory so both stream clients and for-each clients are supported.

## Key Takeaways
1. Use lambdas for small, obvious function objects and method references when they improve clarity.
2. Prefer standard functional interfaces, but preserve domain contracts with named interfaces when needed.
3. Use streams for transformations, filtering, grouping, reduction, and search, not for every loop.
4. Keep stream functions stateless and side-effect-free; `forEach` should normally report a result.
5. Use primitive functional interfaces and streams for bulk numeric work.
6. Design sequence-returning APIs for both iteration and stream consumption.
7. Parallelize only splittable, sufficiently expensive, correct pipelines validated by measurement.

## Connects To
- **Chapter 5: Enums and Annotations**: Enum constant behavior can be stored as lambdas, and `EnumMap` collectors require explicit map factories when performance matters.
- **Chapter 7: Methods**: Functional-interface overloads, return-type choices, and `Optional` handling are API signature decisions.
- **Chapter 8: General Programming**: Library knowledge, primitive use, interface references, and measured optimization apply directly to stream code.
