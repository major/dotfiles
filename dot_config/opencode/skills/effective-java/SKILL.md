---
name: effective-java
description: "Java writing and code-review guidance from Effective Java, Third Edition by Joshua Bloch, covering APIs, generics, concurrency, exceptions, streams, and serialization."
---

<!-- argument-hint: [topic, framework name, or chapter number] -->

# Effective Java, Third Edition
**Author**: Joshua Bloch | **Pages**: 901 | **Chapters**: 12 | **Generated**: 2026-08-27

## How to Use This Skill

- **Without arguments**: Load the core frameworks below as implementation and review defaults.
- **With a topic**: Ask about `PECS`, `builders`, `failure atomicity`, or another indexed concept; the relevant chapter can be loaded on demand.
- **With a chapter**: Ask for `ch05` or a chapter title to inspect the detailed rules, examples, and anti-patterns.
- **For code review**: Apply the core checklist first, then read the chapter linked to the questionable API, state transition, or Java facility.
- **Browse**: Ask what chapters, topics, or supporting files are available.

When a question is not covered below, read the relevant chapter file before answering.

## Core Frameworks & Mental Models

### Design the smallest honest API

- Treat every public or protected class, constructor, method, field, interface, and serialized form as a long-term client promise.
- Start with package-private or private visibility, expose interfaces where clients need capabilities, and hide representation and mutable state.
- Prefer composition and forwarding over inheritance unless the relationship is a genuine, documented `is-a` relationship and the class was designed for extension.
- Make immutable value types final or effectively final, validate constructor inputs, keep fields private and final, and defensively copy mutable components at ownership boundaries.
- Use builders for several optional or same-typed parameters; use static factories when naming, caching, subtype selection, or instance control matters.
- Inject replaceable resources and policies rather than reading global mutable state.

### Make invalid states difficult to express

- Validate preconditions at public method and constructor boundaries, before mutation or storage.
- Prefer enums, value classes, capability objects, and parameterized types over strings, integers, booleans, and delimiter-encoded aggregates.
- Return empty collections or arrays for empty sequences, and return `Optional<T>` when scalar absence is a normal result; do not return null `Optional`s or wrap containers by default.
- Keep signatures short and semantically explicit, put required arguments before varargs, and remember that overload selection is compile-time while overriding is dynamic.
- Document preconditions, postconditions, exceptions, side effects, thread-safety obligations, and serialized behavior in Javadoc.

### Make type safety do the work

- Never introduce raw types in new code; distinguish `List<?>` (unknown element type) from `List<Object>` (deliberately accepts any object).
- Apply **PECS**: use `? extends T` for producers and `? super T` for consumers, while returning concrete, usable types.
- Eliminate unchecked warnings; if an unsafe boundary is proven safe, suppress only the smallest declaration and document the proof.
- Remember that arrays are covariant and reified, while generics are invariant and erased; prefer lists when the rules conflict.
- Use a typed key such as `Class<T>` for a typesafe heterogeneous container, and isolate the unavoidable unchecked operation.

### Keep object protocols coherent

- Override `equals` only for a clear logical value model, and preserve reflexivity, symmetry, transitivity, consistency, and non-null behavior.
- Override `hashCode` with exactly the fields used by equality; use safe comparison APIs rather than subtraction.
- Implement `Comparable` only when one natural ordering is obvious, and keep ordering consistent with equality when sorted collections should agree with hash collections.
- Give `toString` useful diagnostics without accidentally promising a parseable format; prefer copy constructors or factories over `Cloneable`.

### Choose the right abstraction for computation

- Use lambdas for short, obvious functional objects, standard `java.util.function` interfaces when their contract fits, and named methods or interfaces when behavior needs explanation or domain semantics.
- Read streams as source, lazy transformations, and one terminal operation; use them for transformations, grouping, filtering, and reduction, not for every loop.
- Keep stream functions stateless and non-interfering; prefer collectors over external mutable accumulators, and use primitive streams/interfaces for numeric bulk work.
- Prefer enhanced `for` for ordinary traversal and explicit iterators only for specialized removal or lockstep control.
- Search the standard library before implementing common behavior, especially collection, I/O, randomness, concurrency, and parsing facilities.

### Design failure and resource boundaries

- Use exceptions for exceptional conditions, not ordinary branching; choose checked exceptions only when callers can usefully recover.
- Translate lower-layer failures into the vocabulary of the current abstraction and chain the cause; never expose irrelevant implementation details.
- Preserve failure atomicity by validating first, staging failure-prone work, committing last, or explicitly documenting a changed state.
- Acquire owned `AutoCloseable` resources in try-with-resources; garbage collection is not deterministic cleanup, and cleaners are only safety nets.
- Treat `readObject` as a public constructor receiving hostile bytes: copy mutable data, validate all invariants, avoid overridable calls, and reject invalid state.
- For new interchange, prefer structured formats such as JSON or Protocol Buffers; never deserialize untrusted data, and use filters only as defense in depth.

### Make concurrency and performance evidence-based

- Prefer immutability or thread confinement; otherwise synchronize every access to shared mutable state or use a deliberate visibility/atomicity mechanism.
- `volatile` provides visibility, not compound-operation atomicity; atomics solve suitable single-variable updates, not multi-object transactions.
- Keep locks narrow and make open calls: snapshot protected state, unlock, then invoke client or alien code.
- Prefer executors, concurrent collections, blocking queues, and synchronizers over new `wait`/`notify` code; document whether a type is immutable, thread-safe, conditionally thread-safe, not thread-safe, or thread-hostile.
- Match representation to guarantees: use `BigDecimal` or minor units for exact money, primitives for computation unless references are required, and interfaces for replaceable implementations.
- Profile realistic workloads and use JMH for microbenchmarks before accepting complexity for speed; replace a poor algorithm before micro-tuning.

## Chapter Index

| # | Title | Key Frameworks |
|---|---|---|
| [ch01](chapters/ch01-introduction.md) | Introduction | clarity, simplicity, API commitments |
| [ch02](chapters/ch02-creating-and-destroying-objects.md) | Creating and Destroying Objects | factories, builders, dependency injection, cleanup |
| [ch03](chapters/ch03-methods-common-to-all-objects.md) | Methods Common to All Objects | `equals`, `hashCode`, `toString`, `Comparable` |
| [ch04](chapters/ch04-classes-and-interfaces.md) | Classes and Interfaces | information hiding, immutability, composition, skeletal implementations |
| [ch05](chapters/ch05-generics.md) | Generics | parameterized types, unchecked warnings, PECS, heterogeneous containers |
| [ch06](chapters/ch06-enums-and-annotations.md) | Enums and Annotations | rich enums, `EnumSet`, `EnumMap`, annotation contracts |
| [ch07](chapters/ch07-lambdas-and-streams.md) | Lambdas and Streams | functional interfaces, pipelines, collectors, parallelism |
| [ch08](chapters/ch08-methods.md) | Methods | validation, defensive copying, overloads, `Optional`, Javadoc |
| [ch09](chapters/ch09-general-programming.md) | General Programming | library reuse, representations, primitives, measurement |
| [ch10](chapters/ch10-exceptions.md) | Exceptions | recoverability, translation, chaining, failure atomicity |
| [ch11](chapters/ch11-concurrency.md) | Concurrency | visibility, synchronization, executors, thread-safety taxonomy |
| [ch12](chapters/ch12-serialization.md) | Serialization | logical forms, defensive deserialization, proxies, security |

## Topic Index

- **Annotations** -> ch06
- **API design** -> ch01, ch04, ch08
- **Builders** -> ch02, ch08
- **Checked exceptions** -> ch10
- **Cleaning resources** -> ch02
- **Concurrency** -> ch11
- **Defensive copying** -> ch02, ch08, ch12
- **Dependency injection** -> ch02
- **Enums** -> ch06, ch09
- **Equality and hashing** -> ch03
- **Exceptions** -> ch08, ch10, ch12
- **Failure atomicity** -> ch08, ch10, ch11
- **Factories** -> ch02, ch04
- **Generics** -> ch05
- **Immutability** -> ch02, ch03, ch04
- **Javadoc and contracts** -> ch08
- **Lambdas** -> ch06, ch07
- **Method overloads** -> ch08
- **Optional** -> ch08
- **PECS and wildcards** -> ch05
- **Performance and profiling** -> ch01, ch07, ch09, ch11
- **Serialization** -> ch04, ch10, ch12
- **Streams and collectors** -> ch07
- **Thread safety** -> ch11
- **Try-with-resources** -> ch02
- **Typesafe heterogeneous containers** -> ch05
- **Validation and preconditions** -> ch08, ch10, ch12
- **Visibility and `volatile`** -> ch11

## Supporting Files

- [glossary.md](glossary.md) - alphabetical definitions of significant terms.
- [patterns.md](patterns.md) - concrete techniques, algorithms, and design patterns.
- [cheatsheet.md](cheatsheet.md) - compact decision rules, trade-offs, and review heuristics.

## Scope & Limits

This skill synthesizes Joshua Bloch's Java design and implementation guidance from *Effective Java, Third Edition*.
It is a decision aid for writing and reviewing Java code, not a replacement for the Java Language Specification, standard-library documentation, security guidance, or project conventions.
It does not guarantee suitability for a particular Java release, runtime, workload, compatibility promise, or threat model; verify those constraints and measure performance in the target environment.
For codebase-specific changes, combine this skill with repository tests, build rules, API compatibility checks, and the project's concurrency and security practices.
