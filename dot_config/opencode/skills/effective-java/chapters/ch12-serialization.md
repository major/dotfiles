# Chapter 12: Serialization

## Core Idea
Java serialization creates objects through an extralinguistic path that bypasses ordinary constructors and exposes a durable, security-sensitive representation.
Prefer structured data formats, avoid untrusted deserialization, and if legacy compatibility requires `Serializable`, explicitly design the form and defend every deserialization path.

## Frameworks Introduced
- **Prefer alternatives to Java serialization**: Use JSON or Protocol Buffers for cross-platform structured data and schema-oriented interchange.
  - When to use: New persistence, RPC, messaging, or cache formats.
  - How: Serialize logical attribute-value data rather than arbitrary object graphs, and validate at the application boundary.
  - Failure mode: Native deserialization can execute gadget chains, consume unbounded resources, or trigger deserialization bombs.
- **Serialization as a public API commitment**: Treat a serialized form like an exported method signature.
  - How: Decide compatibility requirements, declare `serialVersionUID`, and avoid serializing implementation details.
  - Failure mode: Default serialization freezes private fields, damages information hiding, and makes representation changes expensive.
- **Custom serialized form**: Encode logical state rather than the physical object graph.
  - How: Mark derived and run-specific fields `transient`, implement `writeObject` and `readObject`, invoke `defaultWriteObject`/`defaultReadObject` as required, and document `@serialData`.
  - Failure mode: Linked structures, caches, native handles, and hash buckets produce large, slow, fragile, or invalid forms.
- **Defensive `readObject`**: Treat deserialization as a public constructor receiving hostile input.
  - How: Read fields, defensively copy mutable references, validate invariants, throw `InvalidObjectException`, and never call overridable methods.
  - Failure mode: A valid-looking stream can create impossible state or leak references to private mutable components.
- **Serialization proxy pattern**: Serialize a private static proxy containing logical state, reject direct instance deserialization, and reconstruct through the public API.
  - How: Add `writeReplace`, an enclosing-class `readObject` that throws, and proxy `readResolve` that calls a constructor or factory.
  - Failure mode: It does not suit user-extendable classes or some circular object graphs, and adds modest overhead.
- **Enum instance control**: Prefer a single-element enum for serializable singleton identity.
  - Failure mode: `readResolve` is fragile if nontransient references let an attacker capture the temporary deserialized instance before resolution.

## Key Concepts
- **Serialization**: Encoding an object graph as a byte stream.
- **Deserialization**: Reconstructing objects from a byte stream without normal constructors.
- **Serialized form**: The externally visible byte representation that compatibility may preserve.
- **`serialVersionUID`**: Explicit class identifier used to govern serialized compatibility.
- **Logical state**: Data that defines what an object means to clients.
- **Physical representation**: Internal fields and topology used to implement that meaning.
- **Transient field**: State omitted from the default serialized form and restored or recomputed later.
- **Gadget chain**: A sequence of deserialization-triggered methods that enables unintended behavior.
- **Deserialization bomb**: Small input whose object graph causes excessive CPU, memory, or recursion.
- **Serialization proxy**: A private serializable representation reconstructed through the enclosing type’s normal API.

## Mental Models
- Regard `readObject` as a constructor whose parameter is attacker-controlled bytes.
- Regard every nontransient field in the default form as a permanent API promise.
- Serialize logical state, not data-structure topology.
- A filter reduces accepted classes and resource abuse; it does not make untrusted deserialization intrinsically safe.

## Anti-patterns
- **Deserializing untrusted bytes**: It expands the attack surface to every serializable class reachable from the class path.
- **Adding `implements Serializable` casually**: The apparent one-line change creates long-term compatibility, security, and testing obligations.
- **Default form for linked structures or hash tables**: It persists implementation topology and may preserve invalid assumptions.
- **Trusting default `readObject` for invariants**: Crafted streams can bypass constructor validation and defensive copies.
- **Serializable inner classes**: Compiler-generated enclosing references and unstable synthetic fields make the form ill-defined.
- **Using `readResolve` with nontransient object references**: Temporary instances or internal references can be stolen before resolution.

## Code Examples
```java
private static class SerializationProxy implements Serializable {
    private final Instant start;
    private final Instant end;

    SerializationProxy(Period period) {
        this.start = period.start();
        this.end = period.end();
    }

    private Object readResolve() {
        return new Period(start, end); // Constructor rechecks invariants
    }
}

private Object writeReplace() {
    return new SerializationProxy(this);
}

private void readObject(ObjectInputStream stream)
        throws InvalidObjectException {
    throw new InvalidObjectException("Proxy required");
}
```
- **What it demonstrates**: The stream contains logical state, direct instance construction is rejected, and the ordinary constructor owns validation.

```java
private static final long serialVersionUID = 1L;

private void readObject(ObjectInputStream stream)
        throws IOException, ClassNotFoundException {
    stream.defaultReadObject();
    start = new Date(start.getTime());
    end = new Date(end.getTime());
    if (start.after(end)) {
        throw new InvalidObjectException("start after end");
    }
}
```
- **What it demonstrates**: Defensive copying must precede invariant checking when a serializable immutable type contains mutable components.

## Reference Tables

| Design choice | Prefer when | Principal risk |
|---|---|---|
| JSON | Human-readable, browser, or loosely coupled interchange | Schema discipline and text overhead |
| Protocol Buffers | Typed, compact, evolution-friendly binary interchange | Tooling and schema workflow |
| Default serialized form | Physical fields closely equal logical state | Representation becomes public API |
| Custom `writeObject` form | Logical and physical state differ | More code and compatibility testing |
| Serialization proxy | Final/nonextendable type with nontrivial invariants | Not suited to arbitrary circular graphs |
| Enum singleton | Instance-controlled type known at compile time | Cannot represent runtime-created instances |

| `readObject` defense | Why |
|---|---|
| Call `defaultReadObject` when using default fields | Preserves forward/backward field evolution behavior |
| Copy mutable referenced fields | Prevents private-state exposure |
| Validate all invariants | Rejects impossible crafted objects |
| Avoid overridable calls | Subclass state may not exist yet |
| Throw `InvalidObjectException` | Stops construction of invalid instances |

## Worked Example
Consider an immutable `StringList` implemented internally as a doubly linked list.
Default serialization would persist every node and both link directions, coupling the API to the representation and risking large streams or stack overflow.
A custom form writes only the element count and strings in logical order, marks `size` and `head` transient, then reconstructs the list through `add`.
The result is smaller, faster, independent of the linked-list topology, and able to change its internal representation later.

## Key Takeaways
1. Do not deserialize untrusted data; migrate new systems to JSON, protobuf, or another structured format.
2. Use `ObjectInputFilter` as defense in depth, preferably with a whitelist, not as a complete security guarantee.
3. Decide deliberately whether `Serializable` belongs in the API and declare an explicit `serialVersionUID`.
4. Design a custom form around logical state and mark derived or run-specific state transient.
5. Defend `readObject` exactly as you would a public constructor receiving hostile input.
6. Prefer enum singletons and serialization proxies for instance control and invariant-heavy final classes.
7. Test cross-version serialization and deserialization whenever compatibility is promised.

## Connects To
- **Chapter 4: Classes and Interfaces**: Encapsulation and inheritance decisions determine whether serialization can safely evolve.
- **Chapter 6: Enums and Annotations**: Enum instance control is the safest built-in singleton mechanism.
- **Chapter 10: Exceptions**: Deserialization should report invalid streams with precise, abstraction-appropriate exceptions.
- **Threat modeling**: A byte stream is untrusted input with code-execution and resource-exhaustion consequences, not merely persisted data.
