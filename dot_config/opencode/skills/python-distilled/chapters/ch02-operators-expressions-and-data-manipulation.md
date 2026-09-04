# Chapter 2: Operators, Expressions, and Data Manipulation

## Core Idea
Expressions compute values while assignments store references in locations; operators are syntax mapped to object behavior.

## Frameworks Introduced
- **Applicative-order evaluation**: function arguments and operands are evaluated before the operation or call proceeds.
  - When to use: reasoning about side effects and evaluation order.
  - How: inspect left-to-right argument evaluation and operator precedence.
- **Locations versus values**: the left side of assignment is a location, while the right side is an expression.
  - When to use: understanding attributes, subscripts, unpacking, and `:=`.

## Key Concepts
- **Truth value**: the Boolean interpretation used by conditionals and `all()`/`any()`.
- **Iterable operation**: an operation consuming any object that can produce values.
- **Comprehension**: compact construction of a list, set, or dictionary from an iterable.
- **Walrus operator**: `:=`, which assigns while producing a value.
- **Extended slicing**: slicing with start, stop, and stride.

## Mental Models
Read `a + b` as a protocol request that may dispatch to `a.__add__(b)`.
Treat chained comparisons and boolean operators as control-flow expressions with short-circuiting.

## Anti-patterns
- **Relying on remembered precedence**: use parentheses when grouping is not obvious.
- **Mixing mutation into dense comprehensions**: it obscures the expression's data transformation.

## Code Examples
```python
while (line := file.readline()):
    print(line)
```
- **What it demonstrates**: assignment expression used as a loop condition.

## Worked Example
Transform records with a comprehension when the mapping is direct, use a normal loop when validation or multiple side effects are required, and use a generator expression when the result need not be materialized.
For a nested record, unpack with `for name, *scores in rows` when the tail is variable-length, and use extended slicing when a stride is part of the data operation.

## Source-Named Sections
- **Literals**: integer bases are presentation syntax; floating point uses IEEE 754 double precision.
- **Boolean Expressions and Truth Values**: `and` and `or` short-circuit and return an operand, not necessarily a Boolean.
- **Operations on Iterables, Sequences, Sets, and Mappings**: select the operation according to the protocol and mutability contract.
- **Order of Evaluation**: function arguments are evaluated left to right, so side effects in expressions have observable ordering.

## Decision Rules
- Use `:=` only when binding and testing the same value improves a loop or conditional.
- Parenthesize expressions when precedence is not instantly readable.
- Materialize a comprehension only when later code needs a concrete container.

## Key Takeaways
1. Distinguish expression evaluation from assignment.
2. Use comprehensions for transparent transformations, not arbitrary control flow.
3. Remember that operators depend on operand protocols.

## Connects To
- **Ch 4**: protocol methods customize operator behavior.
- **Ch 5**: call signatures and argument evaluation extend these rules.
