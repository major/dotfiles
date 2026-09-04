# Chapter 7: Writing and Running Your Code

## Core Idea

TypeScript is most reliable when it describes standard JavaScript runtime behavior rather than introducing a parallel language model.

Write with ECMAScript features, understand the actual runtime object and DOM hierarchies, use real runtime privacy when confidentiality matters, and debug original source through correctly chained source maps.

The type checker catches static mismatches, but correct execution still depends on JavaScript semantics and a debuggable build pipeline.

## Frameworks Introduced

### Item 53: Prefer ECMAScript Features to TypeScript Features

Favor standardized ECMAScript constructs because TypeScript mostly erases types and should leave ordinary JavaScript semantics visible.

Avoid historical TypeScript runtime features such as enums, parameter properties, namespaces/triple-slash imports outside declarations, and experimental decorators unless a framework requires them.

### Item 54: Know How to Iterate Over Objects

Choose object iteration based on whether keys are exactly known or merely constrained by an assignable interface.

Use `let k: keyof T` only when that precision is truthful; use `Object.entries` for general runtime enumeration.

### Item 55: Understand the DOM hierarchy

Match DOM APIs and event handlers to the most specific truthful DOM and event types.

Handle nullable lookups at the boundary, and let contextual typing from specific APIs infer where possible.

### Item 56: Don’t Rely on Private to Hide Information

TypeScript `private` is compile-time access control that can be erased or bypassed.

Use closures or ECMAScript `#private` fields when data must be inaccessible at runtime.

### Item 57: Use Source Maps to Debug TypeScript

Configure source maps so debugger locations and variable views map through every transformation back to `.ts` source.

Review whether production maps expose original source code.

## Key Concepts

The default mental rule is that compiling TypeScript to JavaScript should look like deleting annotations.

The notable historical exceptions emit or substantially transform runtime code, which increases the semantic surface a team must understand.

Numeric enums accept arbitrary numbers, string enums are nominal rather than structural, and `const enum` has different emit behavior depending on `preserveConstEnums`.

Prefer a literal union for a closed set of values that should behave like ordinary strings.

```ts
// Avoid coupling TypeScript users to a runtime enum object.
type Flavor = "vanilla" | "chocolate" | "strawberry";

function scoop(flavor: Flavor) {}
scoop("vanilla");
```

Parameter properties blend a constructor parameter declaration with an emitted instance-property assignment.

```ts
// Compact, but the `name` property is less visible in the class design.
class Person {
  constructor(public name: string) {}
}

// Explicit fields make the class state apparent.
class ExplicitPerson {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}
```

If a class is only a data carrier, an interface and object literal may say more clearly that no class behavior or identity is required.

Use ECMAScript `import` and `export` rather than namespaces and `/// <reference path="..."/>` in application code.

Older decorator implementations depend on compiler flags and can diverge from the standard language model, so framework-required use should be isolated and consciously versioned.

Object iteration has a tension between declared shape and possible runtime properties.

```ts
const labels = { one: "uno", two: "dos", three: "tres" };

let key: keyof typeof labels;
for (key in labels) {
  labels[key]; // string
}
```

This is safe when `labels` is a closed value under your control.

It is not automatically safe for a parameter typed as an interface because structural typing allows callers to provide extra properties.

```ts
interface ABC {
  a: string;
  b: string;
  c: number;
}

function inspect(abc: ABC) {
  for (const [key, value] of Object.entries(abc)) {
    key;   // string
    value; // any in the standard declaration described here
  }
}
```

The less precise `Object.entries` types are honest about runtime enumeration, including properties beyond `keyof ABC` and enumerable prototype properties visible to `for...in`.

The browser DOM is a hierarchy, not one uniform element type.

| Type | What it can represent | Important consequence |
| --- | --- | --- |
| `EventTarget` | `window`, `XMLHttpRequest`, nodes | Events can be added or removed, but no `classList` |
| `Node` | `document`, text, comments, elements | `childNodes` can contain non-elements |
| `Element` | HTML and SVG elements | Geometry and element operations, not only HTML APIs |
| `HTMLElement` | HTML elements such as `<i>` and `<button>` | HTML-specific APIs such as `classList` |
| `HTMLInputElement` | `<input>` | Has `value` |
| `MouseEvent` | Pointer/mouse event | Has `clientX` and `clientY` |
| `Event` | Any event | Does not promise mouse or keyboard fields |

DOM declarations often infer a specialized result from literal tag names, such as `document.createElement("button")` becoming `HTMLButtonElement`.

`document.getElementById` cannot infer an element's tag from an arbitrary ID, so it returns the broader nullable `HTMLElement | null`.

Use a checked branch if absence is possible; use `!` or a narrow assertion only when an invariant outside the type system proves it.

```ts
const input = document.getElementById("age");
if (input instanceof HTMLInputElement) {
  input.value = "12";
}
```

Contextual typing can eliminate broad manual annotations.

```ts
function addDragHandler(element: HTMLElement) {
  element.addEventListener("mousedown", (down) => {
    const start = [down.clientX, down.clientY];
    const up = (event: MouseEvent) => {
      element.classList.remove("dragging");
      element.removeEventListener("mouseup", up);
      console.log(event.clientX - start[0], event.clientY - start[1]);
    };
    element.addEventListener("mouseup", up);
  });
}
```

The listener context tells TypeScript that `down` is a `MouseEvent`; accepting `HTMLElement` puts null handling outside the function and gives the body a durable non-null invariant.

TypeScript's `private` modifier communicates API intent and blocks ordinary typed access, but its protection is not a security boundary because emitted JavaScript historically contains the property and an `as any` bypasses the checker.

Closures protect constructor-local data at runtime, with the trade-off that closure methods are allocated per instance and cannot access one another's captured variables.

Modern ECMAScript private fields offer runtime privacy while remaining usable by prototype methods.

```ts
class PasswordChecker {
  #passwordHash: number;

  constructor(passwordHash: number) {
    this.#passwordHash = passwordHash;
  }

  checkPassword(password: string) {
    return hash(password) === this.#passwordHash;
  }
}
```

Source maps map generated JavaScript positions and names back to original TypeScript.

```json
{
  "compilerOptions": {
    "sourceMap": true
  }
}
```

The compiler emits `.js` plus `.js.map` files.

The important operational requirement is map composition: if TypeScript output then passes through a bundler or minifier, its final map must reach original `.ts` files rather than stop at intermediate generated JavaScript.

## Mental Models

- **TypeScript is a type layer over JavaScript.** The more code behaves like standard ECMAScript, the less compiler-specific runtime knowledge a reader needs.
- **Precision must match evidence.** `keyof T` is a claim that runtime keys are limited to declared keys, not merely that an object is assignable to `T`.
- **DOM types describe capability.** An error like “no `classList` on `EventTarget`” says the current type has not proved the element capability needed.
- **Null is boundary state.** Resolve absent DOM lookups before passing elements into behavior-heavy functions.
- **Compile-time privacy is social/API control; runtime privacy is an enforcement mechanism.** Select based on threat model, not naming convention.
- **Debugging should follow author intent.** Generated async state machines are valid execution artifacts but poor primary debugging surfaces.

## Anti-patterns

| Anti-pattern | What goes wrong | Prefer |
| --- | --- | --- |
| Numeric `enum` for a closed domain | Arbitrary numbers can be assignable | Literal union or carefully chosen runtime object |
| String `enum` in a public API | JavaScript callers pass strings while TS callers must import enum values | String literal union |
| Mixed parameter and declared properties | Readers cannot readily see full instance state | Explicit fields, or consistently choose one style |
| `namespace` and triple-slash app imports | Uses obsolete module plumbing | ES modules |
| `for (const key in obj) obj[key]` | `key` is `string`, not necessarily an object key | Closed-value `keyof` loop or `Object.entries` |
| Casting `currentTarget as HTMLElement` reflexively | Hides null and incorrect target assumptions | Start from a typed `HTMLElement` parameter or narrow |
| `Event` for mouse coordinates | `clientX` and `clientY` are not promised | `MouseEvent` or contextual listener type |
| Secret in TypeScript `private` | Property may be readable in JavaScript | Closure or `#field` |
| Debug generated/minified JS directly | State-machine and bundler artifacts obscure logic | Correctly chained source maps |
| Publishing inline source maps blindly | Original comments and internal implementation may become visible | Review map content and delivery policy |

## Code Examples

### Make state and modules visible

```ts
// Before: custom module machinery and implicit generated property.
namespace user {
  export class Person {
    constructor(public name: string) {}
  }
}

// After: standard runtime module and legible state.
export class Person {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}
```

### Iterate according to the actual contract

```ts
function updateLabels(labels: Record<"one" | "two", string>) {
  let key: keyof typeof labels;
  for (key in labels) labels[key] = labels[key].toUpperCase();
}

function logUnknownObject(value: object) {
  for (const [key, item] of Object.entries(value)) {
    console.log(key, item);
  }
}
```

The first function owns a closed record and can exploit exact keys.

The second accepts arbitrary structural values and chooses an API that represents that fact.

## Reference Tables

| Feature | Runtime behavior | Primary concern | Practical default |
| --- | --- | --- | --- |
| Literal union | Erases to strings/numbers | No runtime enumeration object | Use for closed scalar domains |
| `enum` | Emits object unless `const enum` rules alter it | Numeric unsafety, nominal string typing, emit complexity | Avoid unless required |
| Parameter property | Emits assignment | State declaration is hidden in constructor | Prefer explicit field for clarity |
| Namespace/triple slash | Custom legacy module pattern | Nonstandard composition | ES `import`/`export` |
| Decorator | Compiler/framework transformation | Standardization and emitted behavior | Use only where ecosystem requires it |
| TypeScript `private` | Type-checker constraint | No runtime secrecy | Encapsulation only |
| `#private` field | Runtime-enforced private slot | Target/toolchain compatibility | Confidential instance state |

| DOM task | Most suitable strategy |
| --- | --- |
| Read `.value` | Obtain/narrow `HTMLInputElement` |
| Toggle CSS class | Work with non-null `HTMLElement` |
| Read mouse position | `MouseEvent` or a contextually typed mouse listener |
| Traverse child elements only | `children` |
| Traverse text/comments too | `childNodes` |
| ID lookup could be absent | `if (element)` at the edge |
| ID/tag invariant is guaranteed externally | Narrow assertion or `!`, recorded close to lookup |

## Worked Example

An initial drag implementation uses generic event types and nullable targets.

```ts
function handleDrag(down: Event) {
  const target = down.currentTarget;
  target.classList.add("dragging");
  const start = [down.clientX, down.clientY];
}
```

This asks `EventTarget | null` to provide `HTMLElement` behavior and asks `Event` to provide mouse coordinates.

The smallest durable correction is to establish the element at a boundary and make the handler context specific.

```ts
function addDragHandler(element: HTMLElement) {
  element.addEventListener("mousedown", (down) => {
    element.classList.add("dragging");
    const start = [down.clientX, down.clientY];
    const onUp = (up: MouseEvent) => {
      element.classList.remove("dragging");
      element.removeEventListener("mouseup", onUp);
      console.log([up.clientX - start[0], up.clientY - start[1]]);
    };
    element.addEventListener("mouseup", onUp);
  });
}

const surface = document.getElementById("surface");
if (surface) addDragHandler(surface);
```

No broad assertions are needed because the code is reorganized to supply the facts each operation needs.

When debugging a downlevel build of this code, enable `sourceMap` and verify the bundler consumes input maps, especially if `async` event logic introduces transformed state-machine code.

## Key Takeaways

- Prefer ECMAScript features and minimize TypeScript-specific runtime constructs.
- Use literal unions instead of enums when ordinary string interoperability is valuable.
- Do not claim exact object keys for interface-typed input that can carry extra runtime properties.
- Learn DOM capability and event hierarchies so narrowing and assertions are evidence-based.
- Push nullable DOM lookups to the perimeter and give internal functions concrete element types.
- Use `private` for typed encapsulation, not secrecy; choose closures or `#private` for runtime hiding.
- Debug TypeScript through source maps that compose all the way through the build.

## Connects To

- Item 3's type erasure rule motivates preferring standard runtime constructs and explains why TypeScript `private` is not security.
- Item 4's structural typing explains why `ABC` parameters may have keys outside `keyof ABC`.
- Item 9's assertion guidance applies to DOM ID-to-tag assumptions.
- Item 26's contextual typing explains why inline DOM handlers infer useful event types.
- Item 31's boundary treatment of `null` supports passing non-null `HTMLElement` values inward.
- Item 43 covers type-safe alternatives when legacy code monkey-patches DOM objects.
- Chapter 8's migration guidance recommends modern ES modules and classes before converting files to `.ts`.
