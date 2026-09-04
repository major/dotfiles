# Chapter 9: General Programming

## Core Idea
Small language and library choices accumulate into correctness and maintainability.
Keep state scopes narrow, use library and type-system guarantees, avoid lossy representations, isolate unsafe facilities, and optimize only from measurements.

## Frameworks Introduced
- **Scope minimization**: Declare locals at first use, initialize them promptly, and keep them inside the smallest block.
  - When to use: Every method, especially code with multiple loops or phases.
  - How: Prefer `for` loop declarations, split multi-activity methods, and cache a stable expensive loop bound locally.
  - Failure mode: Broad scope permits copy-paste references to stale iterators and makes accidental use compile successfully.
- **For-each default**: Prefer enhanced `for` for collections, arrays, and `Iterable` implementations.
  - When to use: Ordinary traversal where removal, replacement, or lockstep traversal is not required.
  - How: Hide indices and iterators; use `removeIf`, a list iterator, or explicit indices only for the exceptional cases.
  - Failure mode: Explicit nested iterators invite advancing the wrong iterator and can silently produce incomplete combinations.
- **Library-before-invention rule**: Search the standard library and reputable dependencies before implementing common functionality.
  - When to use: Randomness, collections, I/O, concurrency, parsing, and other recurring problems.
  - How: Know the core packages, read current API documentation, use facilities such as `Random.nextInt`, `ThreadLocalRandom`, `SplittableRandom`, and `InputStream.transferTo` appropriately.
  - Failure mode: Ad hoc code often gets edge cases, distribution, exceptions, or performance wrong and misses later library improvements.
- **Exact-arithmetic representation rule**: Use a representation that preserves required precision.
  - When to use: Money, counts, legally rounded quantities, or any exact result.
  - How: Use `BigDecimal` for scale and rounding control, or `int`/`long` minor units when range and manual decimal placement are acceptable.
  - Failure mode: Binary floating point cannot exactly represent many decimal fractions; `BigDecimal(double)` imports the same error.
- **Primitive-over-boxed rule**: Prefer primitives except where generics, collections, reflection, or nullability require references.
  - When to use: Numeric loops, calculations, and hot paths.
  - How: Avoid `==` on boxed values, guard against null unboxing, and use primitive functional/stream variants.
  - Failure mode: Identity comparison, accidental `NullPointerException`, and repeated boxing can create incorrect results or severe overhead.
- **Type-over-string rule**: Model data with the most specific appropriate primitive, enum, value class, aggregate, or capability object.
  - When to use: Parsed numbers, modes, compound keys, and access control tokens.
  - How: Parse at boundaries, define value objects for aggregates, and use unforgeable typed capabilities instead of global string names.
  - Failure mode: Strings create parsing ambiguity, weak typing, shared namespaces, and accidental authority.
- **Measured optimization rule**: Preserve architecture and correctness, then profile, change the relevant algorithm or code, and measure again.
  - When to use: Only after a clear performance requirement exists.
  - How: Consider performance during API/protocol/data-format design, profile production-like workloads, use JMH for microbenchmarks, and compare before/after on target platforms.
  - Failure mode: Premature low-level tuning can warp APIs, hide algorithmic problems, and make code slower or incorrect.
- **Unsafe-boundary rule**: Prefer interfaces to reflection and minimize native code.
  - When to use: Dynamic providers, optional runtime dependencies, platform APIs, or unavoidable native libraries.
  - How: Use reflection mainly for instantiation, then access objects through a compile-time interface; isolate and thoroughly test JNI boundaries.
  - Failure mode: Reflection loses compile-time checking and is verbose/slower; native code adds memory corruption, portability, debugging, and transition costs.

## Key Concepts
- **Enhanced for statement**: A traversal syntax that hides iterator/index mechanics.
- **Library facility**: Tested, maintained platform or third-party implementation of a recurring capability.
- **Binary floating point**: Approximate representation used by `float` and `double`.
- **Boxed primitive**: Reference wrapper such as `Integer`, `Long`, or `Double`.
- **Autoboxing/unboxing**: Implicit conversion between primitive and wrapper values.
- **Capability**: An unforgeable object reference that grants access to an operation or resource.
- **StringBuilder**: Mutable buffer for efficient repeated string construction.
- **Reflection**: Runtime inspection and manipulation of classes, methods, fields, and constructors.
- **JNI/native method**: Java entry point implemented in a native language such as C or C++.
- **Profiler/JMH**: Runtime hotspot tool and Java microbenchmark harness, respectively.
- **Naming convention**: Shared lexical and grammatical rules that make APIs discoverable and less error-prone.

## Mental Models
- Scope is a safety boundary: if a variable cannot be named outside its loop, an entire class of mistakes is impossible.
- Representation determines guarantees: a string or double may carry data, but a type can carry valid operations and invariants.
- Library reuse buys accumulated testing and future maintenance; reimplementation spends your own correctness budget.
- Performance claims are hypotheses until measured on the real JVM, hardware, workload, and algorithm.

## Anti-patterns
- **Declarations at method top**: They enlarge scope, obscure first use, and permit stale-variable mistakes.
- **Manual iterator/index boilerplate**: It multiplies opportunities for wrong-variable and boundary errors when no special control is needed.
- **Home-grown random modulo**: Modulo bias and `Math.abs(Integer.MIN_VALUE)` can produce unfair or invalid results.
- **Floating point for currency**: Approximation accumulates and rounding at output cannot repair every calculation.
- **Boxed numeric accumulators**: Implicit allocation and unboxing make simple loops unexpectedly slow.
- **Compound data encoded with delimiters**: Delimiter collisions and parsing logic replace value semantics.
- **Repeated `String` concatenation in loops**: Immutable strings cause repeated copying and quadratic growth.
- **Implementation-typed variables everywhere**: They couple surrounding code to replaceable implementations and capabilities.
- **Reflection as ordinary dispatch**: It shifts compile-time failures to verbose, slower runtime paths.
- **JNI for speculative speed**: Native transitions and unsafe memory may cost more than optimized Java.
- **Premature optimization**: It sacrifices information hiding and may tune the wrong bottleneck.
- **Convention violations**: Unusual names force readers to guess and tools to work harder.

## Code Examples
```java
for (Iterator<Element> i = collection.iterator(); i.hasNext(); ) {
    Element element = i.next();
    if (shouldRemove(element)) i.remove();
}

for (Element element : collection) {
    process(element);
}
```
- **What it demonstrates**: Use explicit iteration only for destructive filtering; use for-each for normal traversal.

```java
int itemsBought = 0;
int cents = 100;
for (int price = 10; cents >= price; price += 10) {
    cents -= price;
    itemsBought++;
}
```
- **What it demonstrates**: Minor-unit integer arithmetic gives exact monetary results when the range permits it.

```java
StringBuilder statement = new StringBuilder(expectedLength);
for (Line line : lines) statement.append(line.text());
return statement.toString();
```
- **What it demonstrates**: Mutable accumulation avoids repeated copying from loop concatenation.

```java
Set<Son> sons = new LinkedHashSet<>();
```
- **What it demonstrates**: Refer to objects through the least specific interface that supplies required behavior, while selecting implementation at construction.

## Reference Tables
| Requirement | Representation or tool |
|---|---|
| Exact decimal and legal rounding | `BigDecimal` |
| Exact bounded monetary quantity | `int` or `long` minor units |
| General random integer | `ThreadLocalRandom` |
| Parallel random source | `SplittableRandom` |
| Repeated string assembly | `StringBuilder` |
| Dynamic implementation choice | Reflection for creation, interface for use |
| Platform/native library with no Java equivalent | Small isolated JNI boundary |

| Identifier | Convention |
|---|---|
| Package/module | Lowercase hierarchical components, organization domain prefix |
| Class/interface/enum | Capitalized words, e.g. `HttpUrl` |
| Method/field | Lower camel case, e.g. `getCrc` |
| Constant field | Uppercase words with underscores |
| Local variable | Contextual short names allowed |
| Type parameter | `T`, `E`, `K`, `V`, `X`, `R` |
| Boolean method | `is...` or `has...` |

## Worked Example
Implement a billing statement for an unknown number of lines.
Repeated `result += line` copies the accumulated immutable string on every iteration, so growth becomes quadratic.
Use a `StringBuilder`, optionally sized from an estimate, append each line, and convert once at the end.
If the statement is monetary, calculate prices in cents or with `BigDecimal` constructed from decimal strings, never `double`.
Keep the loop variable scoped to the loop, and expose the result through an interface or value type rather than a mutable implementation detail.
Profile only after the clear implementation works, and replace an algorithm before attempting micro-tuning.

## Key Takeaways
1. Declare locals at first use and prefer for-each unless specialized traversal is required.
2. Use mature libraries for common operations and keep current with platform additions.
3. Match numeric representation to precision and range requirements.
4. Prefer primitives for computation and treat boxing, identity, and null unboxing as hazards.
5. Replace stringly typed values, aggregates, and capabilities with explicit types.
6. Use `StringBuilder` for repeated concatenation and interfaces for object references.
7. Isolate reflection/native code and optimize from profiler and benchmark evidence.
8. Follow established Java naming conventions unless strong conventional usage says otherwise.

## Connects To
- **Chapter 5: Enums and Annotations**: Enums replace string/int modes, and enum constants follow constant-field naming conventions.
- **Chapter 6: Lambdas and Streams**: Primitive streams, stream performance, interface return types, and library collectors depend on these rules.
- **Chapter 7: Methods**: Interface-typed parameters, exact values, defensive API design, and Javadoc naming reinforce general programming discipline.
- **Java APIs and JLS**: The standard library, reflection contracts, JNI boundaries, and naming conventions are practical correctness tools.
