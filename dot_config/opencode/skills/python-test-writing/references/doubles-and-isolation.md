# Doubles and Isolation

## Boundary selection

- Double external boundaries such as network clients, clocks, filesystems, processes, and service adapters.
- Keep transformations, validation, parsing, and orchestration logic real whenever practical.
- Use real configuration and value objects when parsing, normalization, equality, or validation is under test.
- Use an explicit fake when stateful interaction is clearer as a small model than as mock expectations.

## Constrained doubles

- Prefer `spec` or `autospec` over a permissive `MagicMock`.
- Use `autospec=True` for an intentionally mocked internal orchestration seam.
- Assert meaningful forwarded arguments, selected endpoints, required ordering, or forbidden effects.
- Do not assert incidental calls, private helper boundaries, irrelevant defaults, or implementation call counts.
- Interaction assertions should support an observable contract rather than substitute for result assertions.

## Patching rules

- Patch the name looked up by the code under test at its module boundary.
- Patching the original definition does not affect a name imported into another module.
- Prefer explicit arguments or scoped `monkeypatch` over mutating class properties or module descriptors.
- Restore unavoidable class-level mutations within the test's own scope.

## Resource isolation

- Use temporary paths and change into `tmp_path` before code constructs relative paths or removes directories.
- Mocking a subprocess does not prevent filesystem effects performed before the subprocess call.
- Set deterministic clocks and controlled environment values, and clean up every patch and context-managed change.
- Clear environment variables that could repopulate intentionally empty configuration before constructing real config objects.
- Isolate process state, filesystem state, and network behavior from neighboring tests.

## Prohibited coupling

- Ordinary tests must not require live services, real network access, wall-clock timing, or uncontrolled filesystem locations.
- Avoid arbitrary sleeps, hidden module or cache state, and execution-order dependencies.
- Ensure cleanup runs on success and failure, and ensure destructive tests stay beneath a controlled temporary directory.
