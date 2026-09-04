# Effective Java Patterns

Each entry gives the pattern, when to use it, how to apply it, and its trade-offs.

## Named construction

**Pattern:** Static factory. **When:** Construction has meaningful modes, caching, subtype selection, or hidden implementations. **How:** Expose names such as `of`, `from`, `valueOf`, `newInstance`, or `getInstance`; return an interface where possible. **Trade-offs:** Factories are harder to discover and prevent subclassing when constructors are not exposed.

**Pattern:** Builder. **When:** A type has several required or optional parameters, especially same-typed parameters. **How:** Validate required values in the builder, set optional values fluently, and make `build()` create an immutable object. **Trade-offs:** More code and usually a builder allocation; avoids telescoping constructors and invalid intermediate configurations.

**Pattern:** Dependency injection. **When:** A class needs replaceable resources, policies, clocks, or collaborators. **How:** Accept them in a constructor or factory and retain validated references. **Trade-offs:** More explicit wiring, much better testability and separation of concerns.

**Pattern:** Enum singleton. **When:** Exactly one stateless or stateful instance is required. **How:** Use a single-element enum; put behavior on it. **Trade-offs:** Cannot extend another class, but handles serialization and reflection attacks more reliably than a conventional singleton.

## State and ownership

**Pattern:** Immutable value type. **When:** State is a value, safe sharing matters, or concurrency is involved. **How:** Make the class final (or tightly control extension), fields private/final, no mutators, validate in construction, and defensively copy mutable inputs and outputs. **Trade-offs:** New objects for changes; simpler reasoning, caching, and thread safety.

**Pattern:** Composition wrapper. **When:** Reusing or augmenting an existing implementation without inheriting its fragile internals. **How:** Hold the wrapped object, forward required operations, and add behavior around delegation. **Trade-offs:** Forwarding methods take work; avoids superclass coupling and broken substitutability.

**Pattern:** Static member class. **When:** A nested helper does not need an enclosing instance. **How:** Declare it `static`; use a nonstatic inner class only when it genuinely needs the outer object. **Trade-offs:** Static nesting is explicit and avoids a hidden outer reference and accidental retention.

**Pattern:** Ownership boundary. **When:** An API accepts or returns mutable arrays, collections, dates, or other mutable objects. **How:** Copy incoming values before storing; copy outgoing values or expose immutable/unmodifiable views according to ownership semantics. **Trade-offs:** Copy cost; prevents representation exposure and time-of-check/time-of-use mutation.

## Types and APIs

**Pattern:** PECS wildcard. **When:** Designing flexible generic methods. **How:** Use `? extends T` for values only read as `T`, `? super T` for values written with `T`; avoid wildcards in return types. **Trade-offs:** Call sites and inference can be less obvious; clients support more subtype relationships.

**Pattern:** Typesafe heterogeneous container. **When:** One container must hold values of unrelated types. **How:** Key storage by `Class<T>` or a type token and retrieve with the key’s type parameter; check casts at the boundary. **Trade-offs:** Type tokens are limited by erasure and can be subverted by raw types.

**Pattern:** Enum-driven strategy. **When:** A fixed set of operations varies by enum constant. **How:** Put fields or abstract behavior on each constant instead of switching on `ordinal()` or an integer tag. Use `EnumSet` for flags and `EnumMap` for mappings. **Trade-offs:** Adding behavior to an enum can make the enum large; preserves type safety and supports future reordering.

**Pattern:** Interface-based API. **When:** Clients need a capability, not a representation. **How:** Program to interfaces, return the narrowest useful interface, and use default methods cautiously because future interface evolution can conflict with implementations. **Trade-offs:** Less direct access to implementation-specific features; enables substitution and smaller commitments.

## Resource, functional, and failure patterns

**Pattern:** Try-with-resources. **When:** Any `AutoCloseable` resource must be closed. **How:** Acquire resources in the try header, use each once, and inspect suppressed exceptions when diagnosing close failures. **Trade-offs:** Requires Java 7+; reliably preserves the primary failure unlike hand-written `finally` cleanup.

**Pattern:** Pure stream pipeline. **When:** Transforming or aggregating data as a readable bulk operation. **How:** Keep lambdas side-effect-free, name complex lambdas, choose a collection return type when callers need repeated traversal, and use primitive streams for numeric work. **Trade-offs:** Pipelines can obscure control flow and allocate; ordinary loops are often clearer for complex stateful logic.

**Pattern:** Failure-atomic operation. **When:** A mutating method can reject input or fail midway. **How:** Validate first, compute in temporary state, then commit once; alternatively make rollback or immutable replacement explicit. **Trade-offs:** Extra storage or work; callers never observe a partially updated object.

**Pattern:** Exception translation. **When:** A lower abstraction leaks an implementation-specific failure. **How:** Throw an exception meaningful at the current abstraction and chain the original cause. Include parameters and relevant state in the detail message, but never secrets. **Trade-offs:** Adds API decisions; preserves abstraction and diagnostics.

## Concurrency and persistence

**Pattern:** Executor task submission. **When:** Work must be scheduled, bounded, cancelled, or awaited. **How:** Submit `Runnable`/`Callable` to an appropriately configured executor and manage its lifecycle. Prefer `java.util.concurrent` synchronizers and concurrent collections over `wait`/`notify`. **Trade-offs:** Pool sizing and shutdown become responsibilities; avoids ad hoc thread management.

**Pattern:** Safe publication. **When:** Sharing mutable state across threads. **How:** Guard every access with the same lock, or use `volatile`, atomic variables, concurrent collections, or immutable objects with final fields as appropriate. Document the thread-safety policy. **Trade-offs:** Synchronization costs and design constraints; prevents visibility and atomicity bugs.

**Pattern:** Serialization proxy. **When:** A serializable class has invariants or instance-control requirements. **How:** Serialize a private proxy in `writeReplace`, reconstruct through the normal constructor in `readResolve`, and reject direct deserialization. Prefer non-serialization formats for new designs. **Trade-offs:** More machinery and proxy compatibility concerns; protects invariants from hostile streams.
