# AGENTS.md

- Do not preserve backward compatibility. Remove obsolete paths instead of adding compatibility layers, fallbacks, or migrations.
- Choose the simplest implementation that fully meets the current requirements. Avoid speculative abstractions, configuration, and indirection.
- Grow the system in layers. Start from the smallest version that works end to end, and add each new capability on top of a product that already works. Never trade a working product for unfinished complexity.
- Keep components modular and concerns clearly separated.
- Prefer established, well-maintained libraries when they reduce overall complexity or improve reliability. Do not reimplement common functionality without a clear reason.
- Lean on the dependencies already in the project before writing your own implementation or adding packages. Do not assume a library lacks a capability without checking its documentation and types.
- Make architectural decisions for the long term. Do not accept a stopgap that only works for now and is meant to be replaced later.
- Study how established products solve the problem before designing a solution. Adopt their proven patterns and conventions rather than inventing an approach from scratch.
- Minimize model steps by batching independent tool calls, searching before reading, avoiding repeated inspection of unchanged files, and constraining command output at the source.
- Delegate self-contained, low-risk implementation, repository maintenance, test fixes, triage, and straightforward reviews to `economy` by default; keep architecture, ambiguous requirements, security-sensitive changes, and final decisions in the parent session.
- Delegate broad read-only exploration to the `explore` subagent before loading many files into the parent context; request concise findings with file and line references, and do not duplicate the same exploration in the parent.
- Delegate independent multi-step research to `general`; run independent subagents concurrently when possible and keep implementation and final decisions in the parent session.
- After a non-trivial workflow, mention one concrete process improvement only when it would materially reduce future work; otherwise omit retrospectives.
- Write one sentence per line when writing markdown so that it's easier for a human to read. Markdown ignores these newlines anyway.
- Never run `find` against my entire filesystem. Only search specific directories as required.
- You are running in opencode v2: <https://opencode.ai/v2/docs>
- Use the Exa MCP server for web research and fetching current external documentation.
- In Code Mode, use global `search(...)` to discover tools. Use `tools.<path>(input)` only to invoke a discovered tool. Never call `tools.search(...)`.
- Do not invoke a dotted tool path returned by `search()` as `tools[result.path](...)`. Split it into namespace and tool name, then call it as `tools["namespace"]["tool_name"](...)`. For example, use `tools["opencode"]["session_rename"](...)`, not `tools["opencode.session_rename"](...)`.
- Never use emdashes when adding content to any project.
- Write comments and PR/MR titles/descriptions using language that is easy to understand even for people who speak English as a second language.
- Prefer spawning multiple @fixer subagents, each with small sets of tasks assigned, rather than having a single fixer subagent with large/complex tasks.

## Skills
- When you hand off to a subagent like @fixer or @oracle, these agents do not have access to skills. Provide direct paths to skills that these agents need when handing off work, such as the "glab" and "commit" skills.
- Use the most narrow edits possible whenever editing a skill file.

## Communication Style
- When you talk to me in opencode sessions, use emojis REALLY OFTEN.
- Use emojis to convey emotion, humor, or to highlight information.
- Every response to me should have three emojis at a minimum.
- I love getting responses in bulleted lists that are highly actionable and contain emojis.

## Functional Programming Principles

- **Pure functions:** Functions return the same output for the same input and cause no side effects (no I/O, no mutation of external state, no reliance on globals). Keep pure logic separate from impure code so it's easy to test and reason about.
- **Immutability:** Don't mutate data after it's created; return new values instead. Prefer `tuple`, `frozenset`, `@dataclass(frozen=True)`, and `NamedTuple` over mutable containers.
- **First-class and higher-order functions:** Treat functions as values that can be passed as arguments, returned, and stored. Use `map`, `filter`, `functools.reduce`, and callables as parameters to abstract behavior.
- **Function composition:** Build complex behavior by chaining small, single-purpose functions. Favor pipelines of transformations over long procedural blocks.
- **Declarative style:** Describe *what* to compute rather than *how* to step through it. Prefer comprehensions and generator expressions over manual loops with accumulators.
- **Isolate side effects:** Push I/O, network calls, logging, and state changes to the edges of the system ("functional core, imperative shell"). The core logic should stay pure and deterministic.
- **Referential transparency:** An expression can be replaced with its value without changing program behavior. This enables safe refactoring, memoization (`functools.cache`), and parallelization.
- **Currying and partial application:** Create specialized functions by fixing some arguments of a general one. Use `functools.partial` rather than writing thin wrapper functions.
- **Lazy evaluation:** Defer computation until results are needed. Use generators, `itertools`, and generator expressions to handle large or infinite sequences efficiently.
- **Recursion over mutable iteration (with caution):** Express repetition through recursion or folds instead of loops with mutable counters. In Python, prefer `reduce` or iteration for deep workloads since there's no tail-call optimization and the default recursion limit is ~1000.
- **Explicit, typed data flow:** Make inputs and outputs explicit via type hints; avoid hidden dependencies. Represent optional or failing results explicitly (e.g., `Optional[T]` or a result type) rather than relying on scattered exceptions.
- **Avoid shared mutable state:** Never use mutable default arguments or module-level mutable globals. Pass state in and return new state out.

## Python development
- Always add full google pydocstyle docstrings to every function, method, class, and test function that we create or modify.
- Run the python-code-simplifier agent when finishing any python development work.
- When writing python functions or methods, ensure the `radon cc` output shows B or lower.
- When modifying python functions or methods, never increase cyclomatic complexity as measured by `radon cc` unless it is completely unavoidable.
- Prefer using models, such as dataclasses or pydantic models, for data contracts between functions.
- Maintain all comments when moving or refactoring code. Comments should not be deleted or modified unless the existing functionality is modified.

## Python test coverage
- For Python code additions or behavior changes, add or update focused tests.
- Before finishing Python changes, run the relevant tests with pytest-cov and check changed-line coverage: `pytest --cov=<package> --cov-report=xml && diff-cover coverage.xml --compare-branch=HEAD`.
- Aim for 100% coverage of changed executable lines.
- Do not add meaningless tests solely to satisfy coverage.
- If 100% changed-line coverage is not practical, state the uncovered lines and the reason.

## Worktrees
- Create and use worktrees when take any actions inside any project with a git repository.
- Worktrees should be created within the .worktrees directory inside the repo itself.
- Always create a branch along with the worktree. Never make a worktree with a detached HEAD.
- When reviewing merge requests or pull requests, put the MR/PR branch into a git worktree and review it there.
- Always ask me about deleting a worktree/branch locally when we no longer need it.
- Never convert a repository into a bare repo when cleaning up worktrees/branches!

## openspec
- Never commit any openspec files.
- Initialize openspec for opencode using `openspec init --tools opencode`

