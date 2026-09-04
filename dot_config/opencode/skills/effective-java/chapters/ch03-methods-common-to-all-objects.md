# Chapter 3: Methods Common to All Objects

## Core Idea
The `Object` methods are protocols used by collections, diagnostics, copying code, and sorted structures.
Override them only with a precise value model, and preserve their contracts across inheritance, mutation, and representation changes.

## Frameworks Introduced
- **`equals` equivalence relation**: Equality must be reflexive, symmetric, transitive, consistent, and non-null.
  - When to use: Override for value classes when identity is not logical equality and the superclass is unsuitable.
  - How: Check identity, use `instanceof` for the intended type, compare every significant field, and test symmetry, transitivity, and consistency.
  - Failure modes: Cross-type cooperation often breaks symmetry; subclass value additions break transitivity. Prefer composition or an abstract root.
- **`hashCode` contract**: Equal objects must have equal hashes; unchanged equality state must yield a stable hash during an execution.
  - When to use: Always alongside an `equals` override.
  - How: Hash exactly the significant fields, combining with `31 * result + fieldHash`; use `Arrays.hashCode` for complete arrays and `Objects.hashCode` for nullable references.
  - Failure modes: A constant hash is legal but collapses hash tables; hashing fields excluded from equality violates the contract.
- **Diagnostic `toString`**: Return a concise, informative human-readable representation.
  - When to use: Every instantiable class unless inherited behavior is already appropriate.
  - How: Include interesting state; specify a stable format only when it is deliberately an API and provide accessors or a parser.
  - Failure modes: Exposing an accidental format makes future changes breaking; omitting fields encourages fragile string parsing.
- **Natural ordering**: `Comparable<T>` supplies an order for sorting and sorted collections.
  - When to use: Value types with one obvious ordering.
  - How: Compare most-significant fields first with `Integer.compare`, `Comparator.comparing`, and `thenComparing`.
  - Failure modes: Difference-based comparisons overflow; order inconsistent with `equals` makes `TreeSet` disagree with `HashSet`.

## Key Concepts
- **Logical equality**: Equality based on value rather than object identity.
- **Significant field**: A field that participates in the logical equality state.
- **Canonical form**: Normalized representation enabling cheap deterministic comparisons.
- **Liskov substitution principle**: A subtype must preserve important properties expected of its supertype.
- **Consistency with equals**: `compareTo(x) == 0` generally agrees with `equals`.
- **Covariant return type**: An override may return a more specific type, useful for `clone()`.
- **Deep copy**: Copying mutable reachable structure so original and copy do not share mutable internals.

## Mental Models
- Equality defines interchangeable equivalence classes; every collection using equality assumes those classes are coherent.
- Hashing is a two-stage lookup: equal hashes are required, but good dispersion protects performance.
- Treat `clone()` as a constructor with a weak, unenforced protocol, not as ordinary method reuse.
- A sorted collection uses ordering as its notion of sameness, so ordering is part of collection semantics.

## Anti-patterns
- **Overloaded `equals(MyType)`**: Does not override `equals(Object)`; `@Override` catches the mistake.
- **Equality with unrelated types**: One-way interoperability violates symmetry.
- **`getClass()` equality in an instantiable base value class**: Breaks substitutability for harmless subclasses; composition is safer.
- **Hashing only an easy field**: Clusters unequal objects and can turn expected linear hash operations quadratic.
- **`return o1.hashCode() - o2.hashCode()`**: Integer overflow can reverse ordering.
- **Shallow clone of mutable structure**: Original and clone corrupt one another.

## Code Examples
```java
@Override public boolean equals(Object o) {
    if (o == this) return true;
    if (!(o instanceof PhoneNumber)) return false;
    PhoneNumber p = (PhoneNumber) o;
    return areaCode == p.areaCode && prefix == p.prefix && line == p.line;
}

@Override public int hashCode() {
    int result = Short.hashCode(areaCode);
    result = 31 * result + Short.hashCode(prefix);
    return 31 * result + Short.hashCode(line);
}

@Override public String toString() {
    return String.format("%03d-%03d-%04d", areaCode, prefix, line);
}
```
- **What it demonstrates**: One stable logical state drives equality, hashing, and useful diagnostics.

## Reference Tables
| Method | Must preserve | Review check |
|---|---|---|
| `equals` | Five equivalence properties | Significant fields, type boundary, mutation |
| `hashCode` | Equal implies equal hash | Same fields and stable state |
| `toString` | Concise, informative output | No accidental parse contract |
| `compareTo` | Antisymmetric sign, transitive order | Overflow and equality consistency |
| `clone` | Independent copy where promised | Mutable graph and superclass behavior |

## Worked Example
Suppose `Money` has immutable `currency` and `minorUnits` fields.
Define equality on both, hash both in the same order, and compare currency then amount with a comparator.
Use `Money` as a `HashMap` key and in a `TreeSet`: both collections now agree on value identity.
Do not subclass `Money` to add a tax category; wrap it in `TaxedMoney` with a view method, preserving the base equivalence relation.

## Key Takeaways
1. Do not override `equals` unless the class has a well-defined logical value.
2. Use `@Override`, compare all significant state, and test the three difficult properties explicitly.
3. Override `hashCode` whenever `equals` is overridden, using the same logical fields.
4. Prefer copy constructors or factories to `Cloneable`; arrays are the main compelling clone use.
5. Implement `Comparable` for an obvious natural ordering and use safe compare APIs.

## Connects To
- **Chapter 2**: Immutability and canonical construction stabilize equality and cached hashes.
- **Chapter 4**: Encapsulation determines which state is significant and whether subclassing can preserve contracts.
- **Collections Framework**: `HashMap`, `HashSet`, `TreeMap`, and `TreeSet` are practical contract tests.
