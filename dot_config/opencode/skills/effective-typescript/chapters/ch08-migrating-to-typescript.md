# Chapter 8: Migrating to TypeScript

## Core Idea

Successful TypeScript migration is an incremental delivery program, not a one-time file-renaming exercise.

Modernize JavaScript first, introduce the compiler without breaking the build, convert leaves upward through the dependency graph, preserve existing tests as a behavioral safety net, and declare victory only after `noImplicitAny` is enabled.

The migration's near-term goal is type conversion with continuous working software; design refactors discovered along the way are valuable evidence for later work, but should not derail the conversion path.

## Frameworks Introduced

### Item 58: Write Modern JavaScript

Use modern ECMAScript syntax before and during conversion because TypeScript understands it well and can transpile it for older targets.

Prioritize ES modules and ES2015 classes, then adopt block-scoped bindings, `for...of`, arrow functions, concise object syntax, destructuring, default parameters, and `async`/`await`.

### Item 59: Use @ts-check and JSDoc to Experiment with TypeScript

Add `// @ts-check` to a JavaScript file for a low-commitment diagnostic pass.

Use declaration files, `@types` packages, and JSDoc annotations to make experiments useful, but do not turn JSDoc into the permanent destination.

### Item 60: Use allowJs to Mix TypeScript and JavaScript

Enable `allowJs` so `.js` and `.ts` modules import each other while a large codebase transitions gradually.

Integrate compilation, tests, bundling, and output compatibility before broad source conversion.

### Item 61: Convert Module by Module Up Your Dependency Graph

Migrate external declarations and leaf modules first, then work upward toward application roots; convert tests last.

Track the dependency graph and keep each module conversion focused on types rather than opportunistic redesign.

### Item 62: Don’t Consider Migration Complete Until You Enable noImplicitAny

`.ts` extensions alone can preserve unchecked implicit `any` behavior.

Fix errors progressively and make `noImplicitAny` the explicit completion gate before considering additional strictness options.

## Key Concepts

Modern JavaScript is a migration enabler because TypeScript is a superset of current JavaScript and can emit an older configured target.

ES modules are especially important because independently imported modules permit independent conversion.

```ts
// Before: CommonJS
const b = require("./b");
console.log(b.name);

// After: ECMAScript module
import * as b from "./b";
console.log(b.name);
```

Move prototype-style pseudo-classes to ES2015 classes when their design is straightforward.

```ts
// Before
function Person(first, last) {
  this.first = first;
  this.last = last;
}
Person.prototype.getName = function () {
  return this.first + " " + this.last;
};

// After
class Person {
  first: string;
  last: string;

  constructor(first: string, last: string) {
    this.first = first;
    this.last = last;
  }

  getName() {
    return this.first + " " + this.last;
  }
}
```

The class form exposes instance members and gives TypeScript direct places to infer or declare their types.

Replace `var` with `const` by default and `let` only for reassigned bindings.

Block scope surfaces accidental hoisting dependencies early, which is an improvement rather than a migration obstacle.

Avoid nested function declarations whose hoisting resembles `var`; use a `const` function expression where ordering should be explicit.

Use `for...of` for element iteration and array methods when an index is needed or a transformation is clearer.

```ts
for (const element of array) {
  process(element);
}

array.forEach((element, index) => processIndexed(element, index));
```

Do not use `for...in` for arrays: it iterates property names rather than expressing sequence traversal.

Arrow functions lexically capture `this`, preventing a common callback bug.

```ts
class Counter {
  count = 0;

  start() {
    setInterval(() => {
      this.count++;
    }, 1_000);
  }
}
```

Compact object literals and destructuring make property names consistent across producers and consumers, which makes types more readable and inference more effective.

```ts
const point = { x, y, z };
const { props: { a, b } } = object;
const { timeout = 5_000 } = options;
const [x, y, z] = point3d;
```

Default parameters document optionality in code and supply a type inference signal.

```ts
function parseNum(text: string, base = 10) {
  return parseInt(text, base);
}
```

Prefer `async`/`await` to raw promise chains or callback APIs when it makes sequential asynchronous control flow direct and keeps result types flowing through local variables.

Use compiler configuration such as `alwaysStrict` or `strict` to control strict-mode output; do not retain a handwritten `'use strict'` directive in TypeScript sources.

`// @ts-check` asks TypeScript to analyze a single JavaScript file without renaming it.

```js
// @ts-check
const person = { first: "Grace", last: "Hopper" };
2 * person.first; // Error: string is not arithmetic input.
```

This quickly finds undeclared globals, incorrect third-party usage, DOM-capability mistakes, and inaccurate existing JSDoc.

For genuine ambient values, declare an intentional type boundary rather than suppressing the missing name.

```ts
// types.d.ts
interface UserData {
  firstName: string;
  lastName: string;
}
declare let user: UserData;
```

For external libraries, install the corresponding `@types` package so checks model the actual API.

That can turn “cannot find `$`” into the much more useful diagnosis that the selected jQuery object has `.css`, not `.style`.

In a JavaScript file, a JSDoc type assertion has a precise syntax.

```js
// @ts-check
const ageEl = /** @type {HTMLInputElement} */(
  document.getElementById("age"),
);
ageEl.value = "12";
```

The parentheses after the comment are part of the assertion form.

Treat inferred JSDoc quick fixes as drafts, not authoritative domain design.

For example, a structural quick fix may type a `files` property only as something with a `forEach` method when the true requirement is `{files: string[]}`.

`allowJs` makes mixed imports possible and is deliberately permissive for ordinary `.js` files not opted into `@ts-check`.

This permits a safe sequence: first prove the compiler can produce output compatible with the existing bundler and tests, then convert source files while keeping the application runnable.

If direct tool integration is unavailable, `outDir` can emit a parallel JavaScript tree that the existing downstream build consumes.

Choose `target` and `module` so emitted JavaScript matches the runtime and current build-chain expectations.

Migration order follows dependency direction.

Start with libraries and external APIs that your code consumes, then leaf modules that have no project dependencies, and continue upward until application entry points.

When a foundational module gains types, its dependents receive the resulting errors promptly; working bottom-up means a converted module is less likely to be revisited just because a dependency was typed later.

Generate or visualize the graph when it is not obvious, and identify cycles as a planning concern because the lowest layer may be a strongly connected component rather than one isolated file.

Convert tests after production code because tests depend on the code but production code should not depend on test modules.

Common conversion diagnostics are useful classification signals:

```ts
class Greeting {
  constructor(name: string) {
    this.greeting = "Hello";
    this.name = name;
  }
}
```

The class needs declared members.

```ts
class Greeting {
  greeting: string;
  name: string;

  constructor(name: string) {
    this.greeting = "Hello";
    this.name = name;
  }
}
```

Editor quick fixes can add these members, but every inferred `any` they introduce needs follow-up.

Code that grows an empty object is another expected friction point.

```ts
// Before: inferred as {}, so properties cannot be added.
const state = {};
state.name = "New York";

// Best when practical: create complete object at once.
const completeState = { name: "New York", capital: "Albany" };

// Transitional option when incremental construction is inherent.
interface State {
  name: string;
  capital: string;
}
const incrementalState = {} as State;
incrementalState.name = "New York";
incrementalState.capital = "Albany";
```

The assertion is acceptable migration debt when it maintains momentum, but it should be distinguished from the better all-at-once construction.

Renaming a `@ts-check` JavaScript file to `.ts` does not automatically preserve JSDoc typing.

Move usable JSDoc annotations into TypeScript syntax, then remove redundant type tags.

```ts
// Before conversion, JSDoc checks `num`.
/** @param {number} num */
function double(num) {
  return 2 * num;
}

// After conversion, make the type real TypeScript syntax.
function doubleTyped(num: number) {
  return 2 * num;
}
```

Without `noImplicitAny`, an unannotated TypeScript parameter may regain `any` and accidentally permit `double("trouble")`.

`noImplicitAny` finds such holes and exposes inaccurate provisional types.

If `indices` was guessed as `number[]` but code indexes each `r` as `r[0]` and `r[1]`, the correct declaration is likely `number[][]` or `[number, number][]`.

## Mental Models

- **Migration is a staircase, not a leap.** Every step must preserve a buildable, testable product.
- **Modern JS reduces translation ambiguity.** Standard modules, classes, lexical bindings, and async functions give the checker clearer program structure.
- **`@ts-check` is reconnaissance.** It reveals likely error categories and declaration needs without committing the project to file conversion.
- **`allowJs` is an interoperability bridge.** It enables a mixed graph but should not be mistaken for meaningful checking of all JavaScript.
- **Dependencies carry type information upward.** Convert leaves first so type facts stabilize before dependents consume them.
- **Conversion and redesign are separate backlogs.** Log architectural discoveries; avoid multiplying risk in the same change.
- **`noImplicitAny` is the quality gate.** A fully `.ts` repository without it is still carrying unbounded holes in its contracts.

## Anti-patterns

| Anti-pattern | Failure mode | Prefer |
| --- | --- | --- |
| Stop-the-world rename of a large project | Huge untestable diff and blocked delivery | Mixed graph with incremental modules |
| Convert files before build/test integration | Failures cannot be separated into toolchain versus type issues | Establish compiler output and tests first |
| Keep CommonJS/concatenated global architecture indefinitely | Harder per-module conversion and dependency visibility | ES modules |
| `var`, prototype pseudo-classes, raw callbacks | Weak scope/type signals and `this` bugs | `const`/`let`, classes, arrows, `async`/`await` |
| Perfect every JSDoc annotation | Migration stalls in comment boilerplate | Use it for reconnaissance, then convert to `.ts` |
| Trust JSDoc quick-fix structural types blindly | Inferred shape may be technically sufficient but semantically wrong | Replace with intended domain type |
| Refactor architecture while typing each module | Coupled behavioral and typing regressions | Track refactor ideas separately |
| Convert tests first | Safety net changes while production behavior is uncertain | Convert production graph, tests last |
| Rename `.js` to `.ts` and retain JSDoc type tags | Annotations can stop enforcing parameter checks | Copy to TypeScript annotations, remove redundancy |
| Declare success before `noImplicitAny` | Implicit `any` masks bad properties and operations | Burn down errors then enable it |

## Code Examples

### Modernize a callback and defaults before typing

```ts
// Before
function parseNum(text, base) {
  base = base || 10;
  return parseInt(text, base);
}

// After: declared optional behavior, inferred/defaulted number.
function parseNum(text: string, base = 10) {
  return parseInt(text, base);
}
```

### Turn a `@ts-check` diagnosis into a declaration fix

```js
// @ts-check
console.log(user.firstName); // Cannot find name 'user'.
```

```ts
// types.d.ts
declare let user: {
  firstName: string;
  lastName: string;
};
```

The correct outcome is an explicit ambient boundary, not an untyped global workaround.

### Convert a class without preserving inferred `any`

```ts
// Weak quick-fix outcome: name may be any.
class GreetingWeak {
  greeting: string;
  name: any;
  constructor(name) {
    this.greeting = "Hello";
    this.name = name;
  }
}

class Greeting {
  greeting: string;
  name: string;
  constructor(name: string) {
    this.greeting = "Hello";
    this.name = name;
  }
}
```

## Reference Tables

| Phase | Primary action | Evidence to require before moving on |
| --- | --- | --- |
| Modernize | ES modules, classes, modern syntax | Existing behavior and tests still pass |
| Reconnaissance | Add `@ts-check` to selected JS | Error categories and missing declarations known |
| Toolchain bridge | Enable `allowJs`; configure compiler/bundler/tests | Mixed JS/TS build produces compatible output |
| Foundation | Install `@types`; model external APIs | Types flow from dependencies without broad stubs |
| Convert | Rename/type leaves upward | Converted module and existing suite remain green |
| Harden | Burn down implicit-any diagnostics | `noImplicitAny` enabled project-wide |
| Expand strictness | Consider remaining strict options | Team can interpret and act on diagnostics |

| JavaScript pattern | Modern form | TypeScript migration benefit |
| --- | --- | --- |
| `require`, `module.exports` | `import`, `export` | Clear dependency graph and module-at-a-time conversion |
| Constructor + prototype assignment | `class` | Visible instance members and methods |
| `var` | `const` / `let` | Block scope identifies accidental coupling |
| C-style array loop | `for...of` / array methods | Fewer index and bounds distractions |
| Callback `function` using outer `this` | Arrow function | Lexical receiver is preserved |
| Manual defaulting | Default parameter | Optionality and type inference are explicit |
| Promise chains/callback API | `async` / `await` | Sequential result types flow locally |

| Error observed during conversion | Interpret it as | Productive next move |
| --- | --- | --- |
| Unknown global | Missing local declaration or intentional ambient boundary | Declare it in `.d.ts` |
| Unknown library symbol | Missing type package | Install matching `@types` |
| DOM property absent | Element type too broad | Narrow, assert with evidence, or correct API |
| Class property absent | JavaScript instance state was implicit | Declare member and its intended type |
| Cannot add property to `{}` | Incremental object construction | Build all at once or assert a transitional interface |
| JSDoc check disappears after rename | Type moved from enforced comments to non-enforced prose | Copy annotation into `.ts` signature |
| Index/property operation silently works | Likely implicit `any` | Enable/fix `noImplicitAny` |

## Worked Example

A small legacy package has CommonJS modules, untyped input, and an application root that consumes its utility.

```js
// format.js
module.exports = function format(user) {
  return user.first + " " + user.last;
};

// app.js
const format = require("./format");
console.log(format({ first: "Grace", last: "Hopper" }));
```

First convert the module boundary to ES modules and place TypeScript in the toolchain with `allowJs`; keep `app.js` runnable while the leaf changes.

```ts
// format.ts
export interface User {
  first: string;
  last: string;
}

export function format(user: User) {
  return `${user.first} ${user.last}`;
}
```

Then convert the dependent root.

```ts
// app.ts
import { format } from "./format";

console.log(format({ first: "Grace", last: "Hopper" }));
// format({ first: "Grace" }); // rejected: `last` is absent
```

If the original module had accumulated dynamic state, avoid mixing its redesign into this conversion.

Add the smallest accurate interface or local transitional assertion, record the refactor candidate, and continue upward.

Finally enable `noImplicitAny` locally, correct all remaining parameters and quick-fix-generated members, commit those corrections, then commit the project-wide `tsconfig` switch when the error count is zero.

## Key Takeaways

- Modernize JavaScript before conversion, especially ES modules and classes.
- Use `@ts-check` and JSDoc as a low-friction diagnostic experiment, not as the target architecture.
- Enable `allowJs` and prove build/test integration before a large rename campaign.
- Install declarations for third-party modules and external APIs early.
- Convert leaves upward through the dependency graph and keep tests unchanged until production code is stable.
- Expect implicit class members, growing object literals, DOM specificity, and lost JSDoc enforcement as normal conversion work.
- Keep refactoring ideas separate from the conversion backlog.
- Migration is incomplete until `noImplicitAny` is on and its diagnostic backlog is empty.

## Connects To

- Item 2 defines `noImplicitAny` and the progressive strictness model that supplies the final migration gate.
- Item 19's guidance on inference helps distinguish useful inferred types from missing parameter and member annotations.
- Item 25 supports choosing `async`/`await` as part of JavaScript modernization.
- Item 35 recommends generating types from API specifications, which is valuable before converting modules that consume external services.
- Chapter 5 explains why `any` remains a risk even during gradual conversion and why type coverage can track remaining debt.
- Chapter 6 explains how accurate `@types` packages, TypeScript versions, and declaration quality determine whether early dependency typing is trustworthy.
- Chapter 7's DOM hierarchy and ECMAScript-first advice clarify common errors encountered once `@ts-check` or `.ts` conversion starts.
