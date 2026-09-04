# Chapter 2: TypeScript’s Type System

## Core Idea

Use the type system as a language for describing sets of JavaScript values and the relationships among them.
Editor inspection turns that model into a daily feedback loop.
Good TypeScript avoids unverified assertions and duplicated declarations, accurately distinguishes type space from value space, chooses precision appropriate to the data, and makes mutation and synchronization obligations explicit.

## Frameworks Introduced

* **Item 6: Use Your Editor to Interrogate and Explore the Type System**: hover, go-to-definition, autocomplete, and Playground emission are tools for learning inferred types and library contracts.
* **Item 7: Think of Types as Sets of Values**: assignability and `extends` mean subset; unions and intersections operate on domains, not on matching property names.
* **Item 8: Know How to Tell Whether a Symbol Is in the Type Space or Value Space**: types are erased, values execute; `class` and `enum` introduce both.
* **Item 9: Prefer Type Declarations to Type Assertions**: `: T` checks a value; `as T` overrides the checker when external knowledge is genuinely stronger.
* **Item 10: Avoid Object Wrapper Types (String, Number, Boolean, Symbol, BigInt)**: annotate primitives with lowercase types.
* **Item 11: Recognize the Limits of Excess Property Checking**: object literals get an extra typo-catching check distinct from structural assignability.
* **Item 12: Apply Types to Entire Function Expressions When Possible**: reuse a function type or `typeof fn` to check parameters and result together.
* **Item 13: Know the Differences Between type and interface**: favor local convention; aliases express unions, tuples, mapped, and conditional types, while interfaces support declaration merging.
* **Item 14: Use Type Operations and Generics to Avoid Repeating Yourself**: use `keyof`, indexed access, mapped types, `Pick`, `Partial`, `ReturnType`, and constrained generics.
* **Item 15: Use Index Signatures for Dynamic Data** and **Item 16: Prefer Arrays, Tuples, and ArrayLike to number Index Signatures**: do not turn known structure into an unhelpfully broad dictionary.
* **Item 17: Use readonly to Avoid Errors Associated with Mutation** and **Item 18: Use Mapped Types to Keep Values in Sync**: encode non-mutation and future maintenance decisions as checked contracts.

## Key Concepts

`never` is the empty set; literal types are singleton sets; `unknown` is the universal set.
For ordinary static reasoning, a value is assignable to `T` when it belongs to `T`, while `T1` is assignable to `T2` when `T1` is a subset of `T2`.
That explains both counterintuitive rules and generic constraints.

Object intersections combine requirements because the intersection contains values satisfying *both* domains.
Accordingly:

```ts
keyof (A & B) = (keyof A) | (keyof B)
keyof (A | B) = (keyof A) & (keyof B)
```

In type contexts, `typeof value` produces the static type of a value, and `T[K]` queries a property type.
In value contexts, `typeof` produces a runtime string and `obj[key]` reads a property.
Read punctuation by context: names after `:` or `as` are types; names after `=` are values.

An annotation produces a checked claim at the definition site and enables excess-property checking for literals.
An assertion says the author knows more than the checker and therefore bypasses those checks.
The non-null form `value!` is the same category of claim, not a null test.

Index signatures model keys unavailable until runtime, such as arbitrary CSV headers.
They permit misspelled keys, require no keys, impose one value type, and weaken completion.
Use an interface, `Record<Keys, Value>`, or a mapped type whenever the key domain is known.

`readonly` is a shallow capability restriction.
It prevents mutation through that reference, but does not recursively freeze nested objects and does not make the original value immutable.
A mutable `T[]` is assignable to `readonly T[]`; the reverse is unsafe.

## Mental Models

| Type-system question | Set-based answer | Practical effect |
| --- | --- | --- |
| Is `A & B` empty if their declared fields differ? | No, values can contain both field sets | Use intersections to add requirements. |
| What does `K extends keyof T` mean? | `K` is a subset of valid keys of `T` | It blocks invalid property lookups. |
| Why does `number[]` not fit `[number, number]`? | Arrays include invalid lengths | Tuples encode length as well as elements. |
| Why can an extra-field variable assign while a literal fails? | Both are structural; only the literal gets excess checking | Preserve literal checks at construction sites. |
| What is `readonly`? | A smaller set of allowed operations | Publish the least capability a function needs. |

## Anti-patterns

| Anti-pattern | Failure | Better decision |
| --- | --- | --- |
| `const x = {} as Person` | Required fields are never checked | `const x: Person = { ... }`. |
| `String`, `Number`, or `Boolean` in public types | Wrapper objects and primitives are distinct | `string`, `number`, `boolean`, `symbol`, `bigint`. |
| Assuming excess-property checking seals a type | It applies only in selected literal contexts | Understand normal structural assignment. |
| Copying signatures across functions | Contracts drift | Apply `type Fn = ...` to whole expressions. |
| Creating interfaces with `I` prefixes | Definition syntax is not a useful domain distinction | Use the problem-domain name. |
| `[n: number]: T` for a sequence | JavaScript keys are strings at runtime | `T[]`, tuples, or `ArrayLike<T>`. |
| Mutable input where mutation is not part of the contract | Callees can accidentally alter caller state | `readonly T[]` or `Readonly<T>`. |
| Parallel type and decision lists | New fields silently choose a wrong default | A mapped object that must cover every field. |

## Code Examples

### Let a declaration check the literal

```ts
interface Person {
  name: string
}

const alice: Person = { name: "Alice" }
const invalid: Person = {}
// Error: Property 'name' is missing.

const unchecked = {} as Person
// Compiles, but does not create a Person at runtime.
```

For a mapping callback, annotate the return boundary rather than asserting its result:

```ts
const people = ["alice", "bob"].map(
  (name): Person => ({ name }),
)
```

### Reuse a complete function contract

```ts
const checkedFetch: typeof fetch = async (input, init) => {
  const response = await fetch(input, init)
  if (!response.ok) throw new Error(`Request failed: ${response.status}`)
  return response
}
```

`typeof fetch` supplies both parameter context and the required `Promise<Response>` result.

### Derive related types instead of copying fields

```ts
interface State {
  userId: string
  pageTitle: string
  recentFiles: string[]
  pageContents: string
}

type TopNavState = Pick<State, "userId" | "pageTitle" | "recentFiles">
type StateUpdate = Partial<State>

function sortBy<T, K extends keyof T>(values: T[], key: K): T[] {
  return values.slice().sort((a, b) => String(a[key]).localeCompare(String(b[key])))
}
```

### Publish non-mutation in the type

```ts
function arraySum(values: readonly number[]) {
  return values.reduce((sum, value) => sum + value, 0)
}
```

Calling `pop`, assigning an element, or assigning `length` is rejected in this implementation.

### Force a choice for every property

```ts
interface ScatterProps {
  xs: number[]
  ys: number[]
  color: string
  onClick: (x: number, y: number) => void
}

const REQUIRES_UPDATE: { [K in keyof ScatterProps]: boolean } = {
  xs: true,
  ys: true,
  color: true,
  onClick: false,
}
```

Adding a `ScatterProps` field now fails here until its update policy is selected.

## Reference Tables

| TypeScript notation | Set interpretation | Example |
| --- | --- | --- |
| `never` | Empty set | No value can be assigned. |
| `'ok'` | One value | Literal discriminant. |
| `T1 \| T2` | Union | A value in either domain. |
| `T1 & T2` | Intersection | A value satisfying both contracts. |
| `T1 extends T2` | Subset | Constraint or subtype relationship. |
| `unknown` | Universal set | Safe top type before validation. |

| Need | Prefer | Avoid |
| --- | --- | --- |
| Internal object shape | `type` or established project convention | Syntax-driven `IName` conventions. |
| Extensible declaration surface | `interface` | An alias when consumers must augment it. |
| Union, tuple, mapped, conditional type | `type` | Forcing awkward interfaces. |
| Known keys and one value type | `Record<'x' | 'y', number>` | `[key: string]: number`. |
| Any runtime keys | Index signature, perhaps `string | undefined` values | Pretending unknown keys are known. |
| Read-only indexed sequence | `readonly T[]` or `ArrayLike<T>` | A hand-written numeric index signature. |

## Worked Example

An options update type was copied from its initializer and is drifting:

```ts
interface Options {
  width: number
  height: number
  color: string
  label: string
}

interface OptionsUpdate {
  width?: number
  height?: number
  color?: string
  // label was forgotten
}
```

The intended relationship is mechanical: every `Options` key is permitted on an update, but each is optional.
Express that relationship rather than relying on review vigilance:

```ts
type OptionsUpdate = Partial<Options>

class UIWidget {
  constructor(init: Options) {}

  update(options: OptionsUpdate) {}
}
```

`Partial<Options>` is a mapped type over `keyof Options`, so additions, removals, and renames remain synchronized.
If updates must exclude immutable keys, derive them deliberately with `Omit<Options, "id">` before applying `Partial`.
This makes the exception visible while retaining a single source of truth.

## Key Takeaways

* Inspect inferred and library types in the editor instead of guessing.
* Read assignability, subtyping, and `extends` as subset relationships.
* Keep type-space constructs separate from executable values.
* Prefer declarations to assertions, including at arrow-function return boundaries.
* Use lowercase primitive types.
* Treat excess-property checking as an extra literal check, not normal assignability.
* Apply function types to whole expressions and use `typeof` to match an existing API.
* Eliminate type duplication with indexed access, mapped types, and constrained generics.
* Use precise object and collection types before reaching for index signatures.
* Use shallow `readonly` to state and enforce non-mutation.
* Use mapped records to turn maintenance choices into compile errors.

## Connects To

Chapter 1 provides the runtime-erasure and structural-typing assumptions that make these rules coherent.
Chapter 3 shows how the checker infers, widens, and narrows the types described here.
Chapter 4 applies discriminated unions, `keyof`, `Partial`, precise domains, and branded intersections to robust API and state design.
