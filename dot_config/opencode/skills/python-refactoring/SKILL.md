---
name: python-refactoring
description: "Python code review, refactoring, and code smell analysis for Python source code (not for studying Fowler books). Use when reviewing Python code, tackling hard-to-change code, preparing to add a feature, refactoring, finding code smells, looking to clean up, or make more Pythonic."
---

# Python Refactoring

This skill guides detection, classification, selection, and planning of refactorings for Python source code.
It provides a repeatable workflow grounded in evidence of harm and idiomatic Python practices.

## Workflow

1. Read project conventions.
Inspect target project configuration to identify supported Python version, configured linters, type checkers, and test runners.
If no Python version is declared, state the assumed version.
Use only features the target version supports.
List feature floors: X | Y runtime, match statements, and dataclass slots or kw_only in Python 3.10; StrEnum and Self in Python 3.11; TypedDict ReadOnly in Python 3.13.
Card examples assume Python 3.10+, adapt down for older runtimes.

2. Scan and discover candidate locations.
Search the codebase and read target files to understand current structure.
Run configured ruff, type checker, and radon read-only as hints when available.
Never pass --fix, ruff format, or write commands.
Explicitly report when hints are skipped.
Never install tools in the target project.

3. Classify findings into three categories.
Design smell: architectural or structural concern suitable for refactoring.
Correctness defect: behavior problem such as broad exception swallowing (bare except:, except Exception: pass; hints E722, BLE001, S110), resource leaks (SIM115), or shared mutable defaults mutated across calls.
A mutable default is a defect only when mutated, returned, or shared across calls; a read-only mutable default is not a defect.
A mutable class attribute is a defect when instances share state by accident, and a smell otherwise.
Typing or style issue: superficial issue such as missing type hints with clear contracts.
Only design smells enter the refactoring flow.
Report defects and style issues separately as follow-up work.

4. Confirm smells with evidence of harm.
Verify concrete harm such as change coupling, duplicated domain rules, or fragile code.
Treat linter warnings and metrics as hints rather than proof.
If evidence is insufficient, report outcome "insufficient evidence".
If code has no justified smell, report outcome "no justified smell".

5. Check look-alikes and deliberate exceptions.
Consult the smell card to rule out look-alike smells and confirm the pattern is not a deliberate design exception.

6. Choose a refactoring.
Consult the smell card decision table.
Prefer module-level functions and frozen records over unnecessary classes.
Keeping the current design is always a valid choice.
When multiple smells co-occur, order fixes by dependency and explain the sequence (for example, introduce a record for Data Clumps before Move Function for Feature Envy).
Must not introduce a class, protocol, registry, or wrapper only to fit a card.
Before freezing a record, check weakrefs, positional construction, and match usage.

7. Run baseline verification.
Run the project test command now, and record the output as the Step 0 executed result.
If baseline tests fail, report outcome "review blocked" and stop immediately.

8. Create a small-step plan.
Build a numbered plan where each code-changing step preserves behavior and ends with verification.

9. Stop for user approval.
Present findings and plan to user.
Wait for explicit approval before editing any files.

### Finding Block Template

Report confirmed findings or outcomes using these exact fields:

- Smell: Name of the smell or outcome ("no justified smell", "insufficient evidence", "review blocked")
- Class: Finding classification (smell, defect, or style)
- Location: Target file and line reference (path:line)
- Evidence: Concrete code pattern observed in the source
- Harm: Specific maintenance difficulty or coupling harm caused
- Look-alike ruled out: Similar smell considered and why it was rejected (smells only)
- Deliberate exception checked: Valid pattern checked and why it does not apply (smells only)
- Chosen refactoring: Selected refactoring name or "keep the current design" (smells only)
- Alternative: At least one alternative considered (smells only)
- Why: Reason why chosen refactoring is superior (smells only)
- Fix: Recommended fix or remediation (defects and style only)

### Plan Block Template

Format refactoring plans using this structure:

- Preservation risks: State applicable risks (aliasing, shallow freeze, exceptions raised, missing key vs None, iteration order, eager vs lazy, equality, hashing, serialization)
- Dynamic references checked: For moves or renames, list checked dynamic references (mock.patch, __all__, __init__ re-exports, getattr, pickle, circular imports)
- Step 0 (Baseline): Executed result of running project test command (if red, report review blocked and stop)
- Step 1 (Characterization tests): When coverage is missing, add tests asserting observable behavior (parametrize, pytest.raises, capsys/caplog; no mocks of internal calls)
- Step 2..N: Numbered small behavior-preserving transformation steps
  - Action: Specific code change to perform
  - Status: Initial status (unverified, verified, or blocked)
  - Verification: Exact test, linter, and type checker command to run after the step
Executed results must be clearly separated from planned-not-run commands.

## Card Loading Instructions

opencode v2 injects the skill base directory at load time with the label "Base directory for this skill:".
Build absolute file paths by joining the skill base directory with the relative card path.
Example path format: <skill_base_dir>/smells/<name>.md or <skill_base_dir>/refactorings/<name>.md.
Read a file only when needed for the current decision.
Do not load unneeded cards into context.

## Guardrails

- Baseline step 0: Run project tests before planning or modifying code; halt immediately if baseline fails.
- Characterization tests: When tests lack coverage, add characterization tests on unchanged code using observable assertions before refactoring.
- Step-by-step execution: Execute approved plans one step at a time.
- Read-only tooling: Run project-configured ruff, type checker, and radon read-only as hints when available; never use --fix, ruff format, or write commands.
- Never install tools: Never install linters, checkers, or packages in the target project; report when hints are skipped.
- Radon complexity: When radon is available in target environment, verify that no function grade gets worse and radon cc grades new functions B or better.
- Verification after each step: Run tests, project ruff, and type checker after every code modification.
- Stop and rollback on failure: If a verification command fails, halt execution, mark step blocked, and revise or rollback without weakening assertions.
- Separate results: Distinguish executed verification results from planned-not-run commands.
- Behavior preservation: Never introduce behavior changes into a refactoring plan; report defects as separate follow-up items.
- No compatibility layers: Update all callers across the repository in a single atomic step without backward-compatibility shims or aliases.
- Preserve comments: Keep existing comments, inline notes, and linter directives (# noqa, # type: ignore, # pragma) on their respective statements.
- Quality standards: Add Google-style docstrings and type annotations to all newly created functions.
- Selection limits: Must not introduce a class, protocol, registry, or wrapper only to fit a card; before freezing a record check weakrefs, positional construction, and match usage.
- Version gate: Use only features supported by the target Python version; TypedDict ReadOnly requires 3.13+.
- Approval gate: Never edit files before receiving explicit user approval.

## Python Adaptation Summary

- Frozen records: Represent domain data with frozen dataclasses updated using dataclasses.replace; check weakrefs, positional construction, and match usage before freezing.
- Target version gate: Restrict syntax to target Python version; TypedDict ReadOnly requires Python 3.13+.
- Minimal abstractions: Never introduce a class, protocol, registry, or wrapper only to match a card.
- Modules as targets: Prefer module-level functions and pure data transforms over artificial classes.
- Public attributes: Use plain public attributes, adding @property only when access logic is already needed.
- Context-based dispatch: Prefer dictionaries of functions, functools.singledispatch, or match statements over deep class inheritance hierarchies.
- Boundary mapping: Convert incoming boundary dictionaries to frozen records at the system edge.
- Pure transformations: Use list and dict comprehensions for pure calculations, keeping side effects in the outer shell.
- Closures over commands: Prefer functions, closures, or partial application over single-method command classes.
- Explicit absence: Use Optional for expected missing values in pure logic rather than catching exceptions.

## Smell Index

| Smell | Observable Python signal | Python forms | Card path |
| --- | --- | --- | --- |
| Feature Envy | Method accesses collaborator data more than its host | Dict envy, module envy, external attribute access | [smells/feature-envy.md](smells/feature-envy.md) |
| Data Clumps | Same groups of parameters or fields recurring together | Repeated parameter lists, repeated dict keys, clustered fields | [smells/data-clumps.md](smells/data-clumps.md) |
| Mysterious Name | Identifier fails to communicate its purpose or role | Cryptic abbreviations, non-standard casing, misleading nouns | [smells/mysterious-name.md](smells/mysterious-name.md) |
| Duplicated Code | Identical or near-identical logic repeated across places | Repeated code fragments, parallel branches, cloned helpers | [smells/duplicated-code.md](smells/duplicated-code.md) |
| Long Function | Multi-concern routine spanning dozens of statements | Procedural scripts, tangled locals, deep nested blocks | [smells/long-function.md](smells/long-function.md) |
| Long Parameter List | Excessive parameter count causing cognitive fatigue | Clustered arguments, boolean flags, **kwargs pass-through | [smells/long-parameter-list.md](smells/long-parameter-list.md) |
| Global Data | Unscoped mutable state accessible across modules | Module-level mutable containers, import side effects, global flags | [smells/global-data.md](smells/global-data.md) |
| Mutable Data | In-place mutations obscuring state transitions | In-place container mutations, shared mutable class attributes | [smells/mutable-data.md](smells/mutable-data.md) |
| Repeated Switches | Same branching condition repeated across functions | isinstance cascades, string/enum branching, parallel returns | [smells/repeated-switches.md](smells/repeated-switches.md) |
| Primitive Obsession | Raw primitives used for structured domain concepts | Dicts used as records, missing Enums, positional tuples, Any | [smells/primitive-obsession.md](smells/primitive-obsession.md) |
| Shotgun Surgery | Single change forces edits across many files | Scattered calculation logic, fragmented transforms, leaked invariants | [smells/shotgun-surgery.md](smells/shotgun-surgery.md) |
| Divergent Change | Single module modified for disparate business reasons | Mixed sequential phases, clustered unrelated methods | [smells/divergent-change.md](smells/divergent-change.md) |
| Loops | Imperative loops obscuring collection transformations | Imperative accumulators, manual predicate checks, mixed I/O | [smells/loops.md](smells/loops.md) |
| Lazy Element | Trivial passthrough or wrapper not pulling its weight | Single-method classes, trivial wrappers, anemic modules | [smells/lazy-element.md](smells/lazy-element.md) |
| Speculative Generality | Unused hooks or abstract structures for future cases | Unused parameters, single-child abstract classes, dead hooks | [smells/speculative-generality.md](smells/speculative-generality.md) |
| Temporary Field | Attributes valid only during specific operation phases | Attributes set outside __init__, optional calculation fields | [smells/temporary-field.md](smells/temporary-field.md) |
| Message Chains | Client navigating deep chains of attribute lookups | Deep dot traversals, chained dict keys, Demeter violations | [smells/message-chains.md](smells/message-chains.md) |
| Middle Man | Class mostly forwarding calls to internal delegate | Passthrough delegation, wrapper facade bloat, forwarding stubs | [smells/middle-man.md](smells/middle-man.md) |
| Insider Trading | Excessive private coupling between modules | Access to _private names, intimate internal structures | [smells/insider-trading.md](smells/insider-trading.md) |
| Large Class | Class or module attempting to do far too much | God modules, kitchen-sink classes, prefixed attribute clusters | [smells/large-class.md](smells/large-class.md) |
| Alternative Classes with Different Interfaces | Similar services unable to be used interchangeably | Mismatched method names, mismatched argument order | [smells/alternative-classes-with-different-interfaces.md](smells/alternative-classes-with-different-interfaces.md) |
| Data Class | Anemic record with rules enforced by external callers | Caller-enforced invariants, uncontrolled field mutations | [smells/data-class.md](smells/data-class.md) |
| Refused Bequest | Subclass refusing superclass interface or methods | Stubbed override methods, Liskov violations, empty passes | [smells/refused-bequest.md](smells/refused-bequest.md) |
| Comments | Explanatory comments masking convoluted logic | Block comments above procedural chunks, dead code comments | [smells/comments.md](smells/comments.md) |
| Repeated Resource Cleanup | Repeated try/finally setup without leaks | Repeated try/finally blocks, manual acquire/release pairs | [smells/repeated-resource-cleanup.md](smells/repeated-resource-cleanup.md) |

## Refactoring Index

| Refactoring | Description | Card path |
| --- | --- | --- |
| Move Function | Move a function to the module or class that holds its data | [refactorings/move-function.md](refactorings/move-function.md) |
| Extract Function | Turn a fragment of code into an independent function | [refactorings/extract-function.md](refactorings/extract-function.md) |
| Extract Class | Split a class by moving cohesive fields and methods to a new class | [refactorings/extract-class.md](refactorings/extract-class.md) |
| Introduce Parameter Object | Replace a group of recurring parameters with a frozen record | [refactorings/introduce-parameter-object.md](refactorings/introduce-parameter-object.md) |
| Change Function Declaration | Rename function or adjust parameters across callers atomically | [refactorings/change-function-declaration.md](refactorings/change-function-declaration.md) |
| Replace Function with Command | Convert complex function into a closure or command class | [refactorings/replace-function-with-command.md](refactorings/replace-function-with-command.md) |
| Remove Flag Argument | Split boolean flag branching into separate explicit functions | [refactorings/remove-flag-argument.md](refactorings/remove-flag-argument.md) |
| Encapsulate Variable | Manage variable access via properties or explicit records | [refactorings/encapsulate-variable.md](refactorings/encapsulate-variable.md) |
| Separate Query from Modifier | Decouple pure calculations from state-modifying actions | [refactorings/separate-query-from-modifier.md](refactorings/separate-query-from-modifier.md) |
| Replace Conditional with Polymorphism | Replace repeated branches with value tables or type dispatch | [refactorings/replace-conditional-with-polymorphism.md](refactorings/replace-conditional-with-polymorphism.md) |
| Replace Primitive with Object | Map boundary dicts or primitives to typed frozen records | [refactorings/replace-primitive-with-object.md](refactorings/replace-primitive-with-object.md) |
| Combine Functions into Transform | Enrich records via pure functions and comprehensions | [refactorings/combine-functions-into-transform.md](refactorings/combine-functions-into-transform.md) |
| Combine Functions into Class | Group functions operating on shared mutable state into a class | [refactorings/combine-functions-into-class.md](refactorings/combine-functions-into-class.md) |
| Split Phase | Separate sequential processing into distinct phases with record | [refactorings/split-phase.md](refactorings/split-phase.md) |
| Replace Loop with Pipeline | Transform collections with comprehensions or built-in functions | [refactorings/replace-loop-with-pipeline.md](refactorings/replace-loop-with-pipeline.md) |
| Inline Function | Replace call with function body when indirection adds no value | [refactorings/inline-function.md](refactorings/inline-function.md) |
| Inline Class | Absorb minor or passthrough class into calling context | [refactorings/inline-class.md](refactorings/inline-class.md) |
| Collapse Hierarchy | Merge superclass and subclass when distinction is redundant | [refactorings/collapse-hierarchy.md](refactorings/collapse-hierarchy.md) |
| Hide Delegate | Encapsulate navigation by adding delegating accessor on server | [refactorings/hide-delegate.md](refactorings/hide-delegate.md) |
| Remove Middle Man | Expose delegate directly when forwarding methods add no value | [refactorings/remove-middle-man.md](refactorings/remove-middle-man.md) |
| Replace Subclass with Delegate | Replace inheritance with composition or Protocol contract | [refactorings/replace-subclass-with-delegate.md](refactorings/replace-subclass-with-delegate.md) |
| Introduce Context Manager | Encapsulate resource setup and teardown inside with statement | [refactorings/introduce-context-manager.md](refactorings/introduce-context-manager.md) |
