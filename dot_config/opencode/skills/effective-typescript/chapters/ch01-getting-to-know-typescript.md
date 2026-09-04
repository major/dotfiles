# Chapter 1: Getting to Know TypeScript

## Core Idea

TypeScript is JavaScript plus a static, erasable type system.
JavaScript is what executes, while TypeScript checks intent before execution and emits JavaScript independently of whether checking succeeds.
Treat the checker as a powerful bug-finding and communication tool, not as a proof that no runtime failure is possible.
The chapter establishes five operating facts: JavaScript is valid TypeScript, compiler options define much of the practical language, types do not exist at runtime, compatibility is structural, and `any` is a deliberate escape hatch with a large blast radius.

## Frameworks Introduced

### Item 1: Understand the Relationship Between TypeScript and JavaScript

* TypeScript is a syntactic superset of JavaScript: valid JavaScript can be renamed from `.js` to `.ts` without a rewrite.
* Type annotations introduce syntax that JavaScript engines cannot parse, so TypeScript source must be transformed before it runs.
* TypeScript models JavaScript behavior but intentionally rejects some legal JavaScript that is likely mistaken.
* The type system is unsound by design: passing the checker does not establish runtime safety.

### Item 2: Know Which TypeScript Options You’re Using

`noImplicitAny` and `strictNullChecks` are semantic choices, not incidental compiler switches.
Use a shared `tsconfig.json`, then work toward `"strict": true`.

### Item 3: Understand That Code Generation Is Independent of Types

Checking and emission are separate activities.
Types, interfaces, assertions, and parameter annotations are erased, so runtime tests must use runtime values and runtime validation.

### Item 4: Get Comfortable with Structural Typing

Assignability asks whether the provided value has the required structure, not whether it was constructed by a particular declaration or class.
Types are open: a value may have properties beyond those mentioned by the receiving type.

### Item 5: Limit Use of the any Type

`any` opts a value out of meaningful static checking and substantially weakens editor assistance, refactoring safety, contracts, and team confidence.

## Key Concepts

**Superset and gradual adoption.** A migration can begin with JavaScript-shaped `.ts` files and add useful contracts at boundaries.
That convenience does not mean a rename creates type safety: inference still exposes the actual assumptions already in the program.

**Type checking is not execution.** This is a useful vocabulary distinction in reviews and CI.
Say “does not type check” for diagnostics and “does not emit” only when the build is configured with `noEmitOnError` or its tooling equivalent.
Aim to commit zero type errors even though `tsc` may still emit output.

**Configuration establishes the null and unknown-input policy.** With `noImplicitAny` off, unannotated parameters silently become `any`.
With `strictNullChecks` off, `null` and `undefined` leak into ordinary types such as `number`, hiding absent-value paths.
Configuration divergence explains many “works on my machine” type disagreements, so reproduce an issue with the same project config rather than a one-off command.

**Erasure dictates runtime design.** `interface`, `type`, and a type assertion cannot be observed by Node or a browser.
Use `typeof`, `instanceof` with a real class, property-presence checks, discriminant fields, or a schema validator when an untrusted runtime value needs validation.

**Structural compatibility is capability-oriented.** A function accepting `{ runQuery(sql: string): unknown[] }` can accept a production database and a small test fake.
This reduces dependencies and tests the required behavior rather than an irrelevant concrete implementation.
The reverse implication is important: declaring `Vector2D` does not prohibit a `Vector3D` from being accepted.
Do not mistake an interface for a closed-object or nominal contract.

**`any` contaminates inference.** It permits invalid assignments, lets callers violate a callee’s input contract, and permits refactors to silently lose alignment.
It also removes autocomplete and safe rename references because the language service no longer knows what the value represents.

## Mental Models

| Question | Productive model | Review consequence |
| --- | --- | --- |
| Is TypeScript a separate runtime? | A source language that emits JavaScript | Put runtime checks in JavaScript constructs. |
| Does a clean typecheck prove no exception? | Static type knowledge can diverge from values | Validate I/O, array bounds, and external data. |
| What changes when `strictNullChecks` changes? | The possible-value domain of ordinary types | Treat enabling it as an API and control-flow migration. |
| Does `interface C` require `new C()`? | Interfaces describe shape only | Do not rely on constructors or hidden invariants without runtime evidence. |
| What does `any` mean? | “Suspend checking across this boundary” | Localize, justify, and replace it with a safer boundary type. |

TypeScript is neither a compiler-enforced runtime contract system nor a purely decorative annotation language.
It is a pragmatic static approximation of JavaScript, optimized for usable migration and tooling.

## Anti-patterns

| Anti-pattern | Why it fails | Prefer |
| --- | --- | --- |
| Treating a successful typecheck as runtime validation | Out-of-range access and untrusted values can still fail | Runtime checks at data and environment boundaries. |
| Passing compiler flags ad hoc | Editors, CI, and coworkers can check different programs | Version a project `tsconfig.json`. |
| Enabling types by annotating values as `any` | The annotation silences exactly the checks sought | A concrete type, `unknown`, or a validated conversion. |
| `shape instanceof Rectangle` when `Rectangle` is an interface | An interface is erased and has no runtime value | `'height' in shape`, a discriminant, or a class constructor. |
| Assuming object types are sealed | Extra properties and structurally compatible classes remain assignable | Model required capabilities, or use explicit brands when identity matters. |
| Sharing a broad production interface solely to test one method | Tests inherit unnecessary implementation details | Depend on a narrow local interface. |

## Code Examples

### Configure semantics once

```json
{
  "compilerOptions": {
    "strict": true,
    "noEmitOnError": true
  }
}
```

The code below is not a meaningful contract under implicit `any`:

```ts
function add(a, b) {
  return a + b
}
```

With a strict project, declare the boundary instead:

```ts
function add(a: number, b: number) {
  return a + b
}
```

### Replace a type-only runtime test

```ts
interface Square {
  width: number
}

interface Rectangle extends Square {
  height: number
}

type Shape = Square | Rectangle

function calculateArea(shape: Shape) {
  if ("height" in shape) return shape.width * shape.height
  return shape.width * shape.width
}
```

The property check is executable JavaScript and also narrows `Shape` for the checker.

### Design for structural tests

```ts
interface DB {
  runQuery: (sql: string) => unknown[][]
}

function getAuthors(database: DB) {
  return database.runQuery("SELECT FIRST, LAST FROM AUTHORS")
    .map(([first, last]) => ({ first, last }))
}

const authors = getAuthors({
  runQuery: () => [["Toni", "Morrison"]],
})
```

The application may pass a richer database object, while the test passes only the capability used by `getAuthors`.

### Keep `any` from hiding a callback migration

```ts
interface ComponentProps {
  onSelectItem: (id: number) => void
}

function handleSelectItem(item: { id: number }) {
  selectedId = item.id
}

declare let selectedId: number
declare function renderSelector(props: ComponentProps): void

renderSelector({ onSelectItem: handleSelectItem })
// Error: the component supplies a number, not an item.
```

Had `item` been `any`, a contract change would compile and fail only when invoked.

## Reference Tables

| Construct | Available at runtime? | Primary use | Caution |
| --- | --- | --- | --- |
| `interface` | No | Describe object shape | Cannot be used with `instanceof`. |
| `type` | No | Compose and name static types | Cannot validate input. |
| `class` | Yes | Constructor plus instance shape | Assignability of instances is still structural. |
| `as T` | No | Assert knowledge unavailable to TypeScript | Does not convert or validate a value. |
| `typeof value` | Yes | Coarse runtime classification | Runtime results are strings, not static types. |
| `'key' in value` | Yes | Presence test and narrowing | Establishes presence, not a full domain invariant. |
| `any` | No | Last-resort gradual-typing escape hatch | Disables safety and language services downstream. |

| Option | When disabled | When enabled | Default policy |
| --- | --- | --- | --- |
| `noImplicitAny` | Unannotated unknown parameters become `any` | Missing type knowledge is diagnosed | Enable except during controlled migration. |
| `strictNullChecks` | `null`/`undefined` fit ordinary types | Absence is explicit in unions | Enable after or alongside a deliberate strictness rollout. |
| `strict` | Individual strictness decisions drift | Enables the family of strong checks | Target setting for maintained projects. |

## Worked Example

Review a small DOM utility that claims types will protect it:

```ts
interface StatusElement {
  textContent: string
}

function setReady() {
  const el = document.getElementById("status") as StatusElement
  el.textContent = "Ready"
}
```

The assertion is erased, and an absent element still throws.
It also invents a static type instead of using the platform’s runtime result.
Make absence explicit at the boundary and let control flow establish the non-null case:

```ts
function setReady() {
  const el = document.getElementById("status")
  if (!el) throw new Error("Missing #status element")
  el.textContent = "Ready"
}
```

This revision depends on `strictNullChecks`, uses a value that exists at runtime, makes the operational failure legible, and gives all later code an `HTMLElement` rather than a fictional asserted shape.
If the API needs to tolerate a missing element, return a status or take an optional callback rather than hiding the choice behind `as`.

## Key Takeaways

* JavaScript runs; TypeScript checks and erases its types before runtime.
* Keep the project compiler configuration explicit and shared, targeting `strict`.
* Use `noImplicitAny` to force missing type knowledge into the open.
* Use `strictNullChecks` to make absence a visible part of contracts and control flow.
* Separate runtime validation from static declarations.
* Write interfaces as minimum capabilities and expect extra fields under structural typing.
* Let narrow interfaces make tests simpler.
* Regard every `any` as a local suspension of safety, tooling, and refactor guarantees.

## Connects To

Chapter 2 explains the mechanics behind structural assignability, type/value space, declarations versus assertions, `readonly`, and type-level DRY.
Chapter 3 explains how inference, widening, narrowing, aliases, and functional APIs make the chapter’s contracts practical.
Chapter 4 turns these foundations into API and state design: valid-state unions, null boundaries, canonical outputs, precise strings, generated schemas, domain vocabulary, and nominal brands.
