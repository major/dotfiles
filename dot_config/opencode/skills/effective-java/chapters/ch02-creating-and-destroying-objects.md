# Chapter 2: Creating and Destroying Objects

## Core Idea
Choose construction mechanisms that make valid objects easy to create, dependencies explicit, and ownership of resources unambiguous.
Prefer immutable, reusable values and deterministic cleanup; garbage collection manages memory, not external resources or accidental reachability.

## Frameworks Introduced
- **Static factory methods**: Named creation operations that may cache, control instances, return subtypes, or hide implementation classes.
  - When to use: When construction has meaningful modes, caching may help, or callers should depend on an interface.
  - How: Use names such as `of`, `from`, `valueOf`, `getInstance`, `newInstance`, and `getType` according to whether identity or freshness is promised.
  - Failure modes: Factories are harder to discover and, without accessible constructors, prevent subclassing.
- **Builder pattern**: Collect required parameters in a builder, set optional parameters fluently, then validate and produce an immutable result in `build()`.
  - When to use: More than a handful of parameters, especially optional or same-typed parameters.
  - How: Keep required values final in the builder, defaults in one place, validate individual setters early and cross-field invariants during build.
  - Failure modes: Extra allocation and verbosity; a builder that exposes mutable inputs without copying leaks state.
- **Dependency injection**: Pass resources or resource factories into constructors, factories, or builders instead of hardwiring them.
  - When to use: Behavior depends on dictionaries, clocks, clients, repositories, or any replaceable resource.
  - How: Store validated dependencies in final fields; accept `Supplier<? extends T>` when repeated creation is required.
  - Failure modes: Global singletons and static utilities make configuration, substitution, and tests rigid.
- **Ownership-based cleanup**: `AutoCloseable` plus try-with-resources gives deterministic release and preserves primary exceptions with suppressed close failures.
  - When to use: Files, sockets, database connections, locks, or native resources.
  - How: Make `close()` idempotent where practical, track closed state, and use try-with-resources at the ownership boundary.
  - Failure modes: Finalizers and cleaners are nondeterministic safety nets, not destructors; they are slow and may never run.

## Key Concepts
- **Instance-controlled class**: A class that controls which instances exist, enabling caching, singleton guarantees, or canonical values.
- **Telescoping constructor**: A sequence of constructors adding optional parameters, readable poorly and vulnerable to argument swaps.
- **JavaBeans pattern**: No-argument construction followed by setters; readable but permits partially initialized mutable state.
- **Immutability**: Object state cannot undergo externally visible change after construction.
- **Obsolete reference**: A reference retained by a data structure even though it will never be dereferenced again.
- **WeakHashMap**: A cache whose entries can disappear when keys are no longer strongly referenced elsewhere.
- **Finalizer/cleaner**: GC-triggered cleanup mechanisms that provide no promptness or execution guarantee.
- **Suppressed exception**: A close-time exception retained on the primary exception by try-with-resources.

## Mental Models
- Think of a constructor as a validity boundary: if an object can exist in an invalid state, the boundary is in the wrong place.
- Treat factories as policy points, not merely shorter constructors: they can select representation, identity, and implementation.
- Think of memory leaks in Java as unintended retention: inspect owners of references, not only allocation sites.
- Make resource ownership lexical: acquire in the try header and release automatically at scope exit.

## Anti-patterns
- **Hardwired resource singleton**: Assumes one configuration forever and blocks isolated tests.
- **`new String("...")` or repeated expensive compilation**: Creates equivalent immutable objects instead of reusing literals, factories, or cached compiled values.
- **Manual object pools for lightweight objects**: Usually add memory and synchronization costs that optimized collectors avoid.
- **Nulling every local**: Adds noise; null references only when a class manages storage or a long-lived field retains an obsolete value.
- **Finalizer as destructor**: Can exhaust file descriptors, hide failures, or expose finalizer attacks.
- **Nested try-finally cleanup**: Can lose the original failure when `close()` also throws.

## Code Examples
```java
public final class SpellChecker {
    private final Lexicon dictionary;

    public SpellChecker(Lexicon dictionary) {
        this.dictionary = Objects.requireNonNull(dictionary);
    }
}

static String firstLine(String path) throws IOException {
    try (BufferedReader reader = Files.newBufferedReader(Path.of(path))) {
        return reader.readLine();
    }
}
```
- **What it demonstrates**: Explicit dependency ownership and deterministic cleanup with preserved diagnostics.

## Reference Tables
| Situation | Prefer | Reason |
|---|---|---|
| Named creation mode or hidden implementation | Static factory | Readability and representation freedom |
| Many optional parameters | Builder | Validity plus readable call sites |
| Replaceable behavior/resource | Constructor injection | Testability and immutability |
| External resource lifetime | Try-with-resources | Prompt release and suppressed exceptions |
| GC fallback for noncritical native peer | Cleaner safety net | Best effort only, never primary cleanup |

## Worked Example
For a configurable HTTP report client, use `new ReportClient.Builder(baseUri, transport)` with optional timeout and retry policy methods.
`build()` copies mutable policy data, validates that timeout is positive and retries are nonnegative, and creates an immutable client.
The transport is injected, so tests supply a fake; each request uses try-with-resources for response bodies.
No singleton is needed, because two tenants may use different endpoints and credentials.

## Key Takeaways
1. Prefer named factories or builders when constructor arguments do not explain themselves.
2. Establish invariants before publishing an object and copy mutable inputs at ownership boundaries.
3. Inject resources; do not let static global state decide behavior.
4. Reuse immutable values and cache only after measuring meaningful cost.
5. Use try-with-resources for every owned `AutoCloseable`; never depend on finalization.

## Connects To
- **Chapter 3**: Immutable construction makes `equals`, `hashCode`, and ordering stable.
- **Chapter 4**: Private constructors and factories enforce encapsulation and can make immutable classes effectively final.
- **Item 50**: Defensive copying is the companion rule to safe reuse.
