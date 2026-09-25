# Message Chains

Background reference: skill `fowler-refactoring`, ch03 and ch07.

## Symptom

A client navigates deep chains of attribute lookups or method calls (e.g. `order.customer.contract.billing.address.zip_code`).
The client becomes tightly coupled to the internal navigation topology and structure of the entire object graph.

## Python forms

- Deep attribute traversal: Chains of dot lookups spanning three or more distinct domain entities to fetch a remote value.
- Chained dictionary key lookups: Deeply nested dictionary subscripting (`data["user"]["profile"]["settings"]["theme"]`) traversing domain layers.
- Law of Demeter violations: Methods invoking methods on objects returned by earlier method calls across multiple unrelated layers.

## Detect

### Evidence of harm

Do not treat fluent builder interfaces, pipeline methods, or standard library APIs (like `Path.resolve().parent`) as message chains.
Confirm Message Chains only when concrete harm exists:
- Fragile navigation coupling: Any intermediate change in object relationships breaks client code far away.
- Null navigation fragility: Intermediate `None` or missing values in the chain cause unexpected `AttributeError` or `KeyError` crashes.
- Testing friction: Unit testing a client requires constructing large mock object graphs mimicking the entire relationship hierarchy.

### Ruff hints

- `C901` (complex-structure): Deep chains of expressions within a single statement often trigger complexity alerts.

### Look-alikes

- Feature Envy: Accessing many attributes or methods of a single collaborator.
  Message Chains navigates across a long series of different collaborators to reach a distant value.
- Fluent APIs: Method chaining returning `self` for configuration is a deliberate pattern, not a message chain.

### Deliberate exceptions

- Fluent APIs and query builders: Method chaining in SQL query builders (like SQLAlchemy) or string builders.
- Standard library traversals: Path object manipulation (`Path.cwd().parents[1]`) where the domain abstraction is explicitly a tree.

## Choose

| Situation | Chosen refactoring | Alternative | Why |
| --- | --- | --- | --- |
| Client navigates chain to read a value from a distant object | [Hide Delegate](../refactorings/hide-delegate.md) | Keep navigation chain | Direct collaborator provides forwarding method, insulating caller from topology |
| Client performs a calculation on the end of the chain | [Extract Function](../refactorings/extract-function.md) then [Move Function](../refactorings/move-function.md) | Hide Delegate | Relocates logic to the target object holding the data, resolving envy and chaining |
| Fluent builder or query chain | Keep the current design | Hide Delegate | Fluent interfaces are designed for sequential chaining and should be preserved |

## Verify

- Run the full test suite after introducing delegating methods.
- Run project linter and type checker across client modules.
- Ensure test fixtures no longer require instantiating deep mock hierarchies.
