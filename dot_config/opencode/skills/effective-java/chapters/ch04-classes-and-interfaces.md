# Chapter 4: Classes and Interfaces

## Core Idea
Good Java APIs expose abstractions while hiding representation, minimizing commitments that future releases must preserve.
Favor immutability, composition, and interfaces; permit inheritance only when the class has been deliberately designed and tested for it.

## Frameworks Introduced
- **Information hiding**: Make every class and member as inaccessible as correct operation permits.
  - When to use: Always, especially in exported APIs.
  - How: Start with a minimal public API, make fields private, keep helpers package-private or nested, and treat `protected` as an API commitment.
  - Failure modes: Public mutable fields leak invariants; public arrays permit mutation even when the reference is final.
- **Immutable class recipe**: No mutators, no extension, final fields, private fields, and exclusive access to mutable components.
  - When to use: Value objects, keys, configuration, and components shared between threads.
  - How: Validate in constructors, return new values from operations, defensively copy mutable inputs/outputs, and use factories for effective finality and caching.
  - Failure modes: Mutable companions introduced before profiling can add complexity; mutable internals accidentally returned defeat the recipe.
- **Composition and forwarding**: Wrap an existing object and forward selected operations through a new API.
  - When to use: Augmenting behavior without depending on undocumented superclass self-use or propagating a flawed API.
  - How: Implement the relevant interface, hold a private delegate, and forward methods; decorate only the operations whose policy you add.
  - Failure modes: Callbacks can bypass the wrapper (the SELF problem); forwarding is tedious but usually cheap.
- **Skeletal implementation**: Pair an interface with default methods and/or an `AbstractInterface` class built from primitive operations.
  - When to use: Interfaces with many related operations and multiple implementors.
  - How: Identify primitive methods, implement derived behavior atop them, document self-use with `@implSpec`, and test diverse implementations.
  - Failure modes: New default methods can violate invariants of old implementations; constant interfaces pollute APIs.

## Key Concepts
- **Encapsulation**: Separating API from implementation so components evolve independently.
- **Effective finality**: A class with no accessible constructors outside its package, despite not being declared `final`.
- **Functional approach**: Operations return new values instead of mutating the receiver.
- **Decorator/wrapper**: Composition-based augmentation that preserves an interface while adding behavior.
- **Self-use**: A class method invoking another overridable method internally.
- **`@implSpec`**: Javadoc tag documenting implementation requirements relevant to subclasses.
- **Mixin**: Optional behavior added through an interface alongside a primary type.
- **Tagged class**: One class with a flavor field, irrelevant fields, and switches for variant behavior.
- **Static member class**: Nested class independent of an enclosing instance.

## Mental Models
- Every public/protected member is a long-term compatibility promise; default to private.
- Ask “is every B really an A?” before inheritance. If not, B should usually contain A.
- Interfaces define capability and type; abstract classes provide optional implementation assistance.
- A nonstatic nested class carries a hidden owner reference, which is both a memory and lifetime dependency.

## Anti-patterns
- **Public mutable field or array**: Clients can violate invariants and freeze the representation forever.
- **Inheritance from an ordinary foreign class**: Depends on undocumented self-use and inherits future API flaws.
- **Constructor calling an overridable method**: Runs subclass code before subclass state is initialized.
- **Unreviewed default method on an existing interface**: May compile yet break synchronization or other implementation invariants.
- **Constant interface**: Leaks implementation details and forces binary compatibility commitments.
- **Tagged class**: Duplicates variants, wastes fields, and turns missing cases into runtime failures.
- **Unneeded nonstatic member class**: Retains the outer object invisibly.

## Code Examples
```java
public final class Complex {
    private final double re, im;

    public Complex plus(Complex other) {
        return new Complex(re + other.re, im + other.im);
    }
}

public final class InstrumentedSet<E> extends ForwardingSet<E> {
    private int additions;

    @Override public boolean add(E element) {
        additions++;
        return super.add(element);
    }
}
```
- **What it demonstrates**: Functional immutability and composition-based augmentation without superclass implementation coupling.

## Reference Tables
| Design question | Default | Exception |
|---|---|---|
| Export a class? | Package-private | Clients need the type |
| Expose state? | Private fields/accessors | Private/package-private helper |
| Need a subtype? | Composition | Genuine, documented `is-a` relationship |
| Multiple implementations? | Interface | Shared state/invariants justify skeletal abstract class |
| Nested class needs outer instance? | Static member class | Adapter/view requires owner |
| Add interface method later? | Avoid | Critical need after diverse implementation testing |

## Worked Example
Replace a `Figure` class with `Shape` plus `Circle` and `Rectangle` subclasses, each owning only its fields and implementing `area()`.
If the public API needs extension, prefer `Shape` as an interface and provide `AbstractShape` for common assistance.
If instrumentation is needed, wrap a `Set` rather than subclassing `HashSet`; the wrapper can accept `TreeSet`, `HashSet`, or any future implementation.

## Key Takeaways
1. Minimize accessibility before adding tests or convenience APIs; package-private tests are preferable to public leakage.
2. Make value objects immutable and defensively isolate mutable components.
3. Use composition and forwarding unless inheritance is a genuine, documented subtype relationship.
4. Test extendable classes with several diverse subclasses before release, or prohibit extension.
5. Design interfaces as permanent contracts and use skeletal implementations for reusable assistance.

## Connects To
- **Chapter 2**: Private constructors, factories, builders, and dependency injection support these boundaries.
- **Chapter 3**: Encapsulation and immutability make equality and ordering contracts enforceable.
- **Chapter 5**: Generic interfaces and wildcards make composition-based APIs flexible without casts.
