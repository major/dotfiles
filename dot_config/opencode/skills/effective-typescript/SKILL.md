---
name: effective-typescript
description: Apply Effective TypeScript's 62-item guidance to TypeScript implementation and review, with decision-oriented mental models and chapter references.
---

# Effective TypeScript

Use this skill to choose safer, clearer TypeScript designs, review type-level changes, diagnose unsoundness, or plan incremental adoption.
It synthesizes Dan Vanderkam's *Effective TypeScript* (2020), not a general TypeScript reference.

## Usage

1. Identify the decision: runtime boundary, inference, API shape, escape hatch, declaration, build behavior, or migration.
2. Start with **Core Frameworks & Mental Models**, then follow the relevant decision path in [cheatsheet.md](cheatsheet.md).
3. Apply a technique from [patterns.md](patterns.md), checking its trade-offs rather than treating it as an absolute rule.
4. Use the chapter index and topic index to open the linked chapter for the underlying item rationale.
5. During review, prioritize mismatch between runtime behavior and claimed types over stylistic annotations.

## Core Frameworks & Mental Models

### Types describe values, not runtime behavior

- Treat a type as a set of possible runtime values: unions widen the set, intersections require membership in both sets, and `never` has none.
- Remember that TypeScript erases types and generally preserves JavaScript behavior, so type correctness does not validate input or alter emitted code.
- Check the JavaScript semantics first when a type-level construction feels surprising.
- Prefer JavaScript and ECMAScript facilities when they express the runtime behavior directly.

### Type checking is useful, intentionally unsound evidence

- Structural typing accepts compatible shapes, including values with more properties than a target type expects.
- Excess-property checking is a targeted object-literal check, not a general exact-object guarantee.
- Use the editor to inspect inferred types, declaration sources, and errors before adding annotations, assertions, or overloads.
- Enable strict compiler options and understand each enabled option because configuration changes the evidence TypeScript provides.

### Preserve information through the program

- Let inference work where names and literals communicate intent, then annotate boundaries, public APIs, and ambiguity.
- Avoid widening when literal precision matters by controlling context, using explicit intent, and building objects as a whole.
- Narrow unknown values with runtime checks and discriminants instead of asserting what they are.
- Model invalid states out of the domain, move `null` to boundaries, and make producer output precise.

### Keep one source of truth

- Derive related types with `keyof`, indexed access, `typeof`, mapped types, generics, and API or schema generation.
- Keep documentation descriptive rather than duplicating type facts that can drift.
- Export every type exposed by a public API and keep declaration versions aligned with runtime versions.

### Make unsafety visible and local

- Default untrusted values to `unknown`, not `any`.
- Prefer the narrowest accurate escape hatch, such as `unknown`, `unknown[]`, or a constrained assertion, over broad `any`.
- Encapsulate necessary assertions behind a small, well-typed function whose runtime contract is clear.
- Treat a type assertion as a proof obligation owned by the local code, not a compiler fix.

### Design APIs around the caller and runtime

- Accept flexible input where safe, but return a specific, trustworthy result.
- Prefer discriminated unions of valid object variants to one object with loosely related optional fields.
- Use domain names, precise string alternatives, and brands when structural compatibility would permit a meaningful mistake.
- Use conditional types when a single relationship expresses overload behavior better than a list of signatures.

## Chapter Index

| Chapter | Items | Focus | Reference |
| --- | --- | --- | --- |
| 1. Getting to Know TypeScript | 1-5 | JavaScript relationship, configuration, erasure, structural typing, `any` | [chapter 1](chapters/ch01-getting-to-know-typescript.md) |
| 2. TypeScript's Type System | 6-18 | type/value spaces, declarations, operations, indexing, immutability, mapped types | [chapter 2](chapters/ch02-typescripts-type-system.md) |
| 3. Type Inference | 19-27 | annotations, widening, narrowing, aliases, async, context, type flow | [chapter 3](chapters/ch03-type-inference.md) |
| 4. Type Design | 28-37 | valid states, input/output, nulls, unions, precision, generated and branded types | [chapter 4](chapters/ch04-type-design.md) |
| 5. Working with `any` | 38-44 | containment, precision, assertions, evolving `any`, `unknown`, monkey patches, coverage | [chapter 5](chapters/ch05-working-with-any.md) |
| 6. Type Declarations and `@types` | 45-52 | dependency versions, public types, TSDoc, callback `this`, conditional declarations, type tests | [chapter 6](chapters/ch06-type-declarations-and-at-types.md) |
| 7. Writing and Running Your Code | 53-57 | ECMAScript features, object iteration, DOM hierarchy, privacy, source maps | [chapter 7](chapters/ch07-writing-and-running-your-code.md) |
| 8. Migrating to TypeScript | 58-62 | modern JavaScript, checking JS, mixed codebases, dependency-order migration, `noImplicitAny` | [chapter 8](chapters/ch08-migrating-to-typescript.md) |

## Topic Index

- **`any`, assertions, and unknown**: Items 5, 9, 38-44, [chapter 5](chapters/ch05-working-with-any.md).
- **API and library declarations**: Items 45-52, [chapter 6](chapters/ch06-type-declarations-and-at-types.md).
- **Async and callbacks**: Items 25, 49, [chapters 3](chapters/ch03-type-inference.md), [6](chapters/ch06-type-declarations-and-at-types.md).
- **Compiler configuration and migration**: Items 2, 44, 58-62, [chapters 1](chapters/ch01-getting-to-know-typescript.md), [8](chapters/ch08-migrating-to-typescript.md).
- **Domain modeling and validity**: Items 28-37, [chapter 4](chapters/ch04-type-design.md).
- **Inference, narrowing, and literals**: Items 19-27, [chapter 3](chapters/ch03-type-inference.md).
- **JavaScript runtime and emitted code**: Items 1, 3, 53-57, [chapters 1](chapters/ch01-getting-to-know-typescript.md), [7](chapters/ch07-writing-and-running-your-code.md).
- **Objects, indexing, and mutation**: Items 4, 11, 15-18, 24, 54, [chapters 2](chapters/ch02-typescripts-type-system.md), [3](chapters/ch03-type-inference.md), [7](chapters/ch07-writing-and-running-your-code.md).
- **Reusable type relationships**: Items 12-14, 18, 35, 50-51, [chapters 2](chapters/ch02-typescripts-type-system.md), [4](chapters/ch04-type-design.md), [6](chapters/ch06-type-declarations-and-at-types.md).
- **Type-system foundations**: Items 6-10, 13, [chapter 2](chapters/ch02-typescripts-type-system.md).

## Supporting Files

- [Glossary](glossary.md): concise terms and item locations.
- [Patterns](patterns.md): techniques with use conditions and costs.
- [Cheatsheet](cheatsheet.md): implementation and review decision aid.

## Scope Limits

- This skill is source-only guidance from the 2020 first edition and its 62 items.
- Verify modern compiler, library, and framework behavior against the project's installed TypeScript and official documentation.
- It does not replace runtime validation, security review, project conventions, compiler diagnostics, or framework-specific guidance.
