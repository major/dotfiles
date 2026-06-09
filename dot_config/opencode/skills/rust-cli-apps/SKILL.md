---
name: rust-cli-apps
description: Use when building Rust CLI applications, clap command-line interfaces, cargo binaries, terminal tools, machine-readable CLI output, CLI integration tests, exit codes, config files, or packaging. Load alongside rust-dev for Rust CLI app work.
---

# Rust CLI Apps

Use this skill with `rust-dev` when building or reviewing Rust command-line applications. Keep `rust-dev` as the source for general Rust project, type, testing, CI, and release rules. Use this skill for the CLI-specific shape: arguments, terminal I/O, testable command logic, exit behavior, machine output, and distribution polish.

## Discovery flow

- Existing CLI: inspect `Cargo.toml`, `src/main.rs`, `src/lib.rs`, parser types, output/error paths, `tests/`, and packaging/docs files before changing structure.
- New CLI: define the user contract first: commands, arguments, stdout/stderr data, output formats, exit behavior, stdin behavior, config precedence, and distribution targets.
- Load only the sections that match the project need: args, output, config, signals, testing, packaging, or docs. Avoid adding crates until the behavior needs them.
- For book examples, keep the principle and update APIs, editions, and MSRV assumptions to the current project.

## Default CLI architecture

- Keep `main.rs` thin: parse arguments, call a fallible `run` function, render the final error, and exit.
- Put reusable behavior in `lib.rs` or private modules so unit tests do not need to spawn the binary for every case.
- Model command input as typed data first, then derive `clap::Parser`, `Args`, `Subcommand`, or `ValueEnum` on those types.
- Use `PathBuf` for filesystem arguments, not `String`.
- Prefer explicit command structs and enums over ad-hoc positional parsing.
- Let `clap` generate usage, validation, and help text unless the project has a strong reason to customize it.

## Argument parsing checklist

- Define one top-level `Cli` struct with `#[derive(Parser, Debug)]`.
- Use a `Command` enum with `#[derive(Subcommand, Debug)]` when the binary has multiple verbs.
- Put global flags on the top-level parser and command-specific flags on command structs.
- Use clear names and help text for non-obvious flags. Avoid restating the field name in `help` text.
- Use `default_value_t` only when the default is part of the user contract.
- Use `value_parser` for constrained values and `ValueEnum` for fixed sets.
- Keep required positional arguments few and obvious. Prefer flags once invocation order becomes hard to remember.

## Testable command logic

- Separate parsing from execution: tests should be able to construct typed args directly.
- Separate execution from presentation where practical: return domain values, then render them.
- Accept `impl Write` or `&mut dyn Write` for output-producing functions so tests can capture output without spawning a process.
- Accept `impl Read` or `&mut dyn Read` for stdin-consuming functions when input can be piped.
- Keep pure matching, filtering, formatting, and transformation logic in sync helper functions.
- Avoid doing real filesystem, network, or terminal work inside pure logic helpers.

## Error handling for CLIs

- Use `Result` and `?` through the command path.
- Add user-facing context at boundaries with `anyhow::Context` for application binaries.
- Avoid raw `unwrap`, `expect`, and `panic!` in normal CLI flows. They are acceptable only in tests or impossible internal invariants with a clear message.
- Keep error messages actionable: include the operation and target, such as `failed to read config from path`.
- Do not print the same error twice. Either return the error to `main` or render it locally, not both.
- For libraries used by the CLI, follow `rust-dev`: prefer typed errors with `thiserror`.

## Terminal output rules

- Send primary command output to stdout.
- Send diagnostics, warnings, progress, logs, and prompts to stderr.
- Do not mix human decorations into stdout when stdout is intended to be piped to another command.
- Prefer buffered writers for large output.
- Keep output stable when users or tests may parse it.
- Use color and progress bars only for terminal output, not when output is redirected.

## Human and machine modes

- Decide early whether the CLI has human-only output, machine-readable output, or both.
- If supporting machine-readable output, make it an explicit mode such as `--format json`, `--json`, or a `ValueEnum` format flag.
- Serialize machine output from dedicated structs, not from human-formatted strings.
- Consider newline-delimited JSON for streaming multiple records.
- Use `std::io::IsTerminal` to detect TTY and adjust interactivity, color, and progress. Do not change the data schema based on TTY detection.
- Keep JSON field names stable and document breaking changes.

## Logging and diagnostics

- Use `log` with `env_logger` for runtime-configurable log levels via the `RUST_LOG` environment variable.
- Default to info level for user-facing runs. Reserve debug and trace for development.
- Use `clap-verbosity-flag` to wire `-v`/`-q` flags directly into log level selection.
- Use `human-panic` to replace raw panic backtraces with user-friendly crash reports in release builds.
- Keep log output on stderr so it never contaminates piped stdout.

## stdin and pipelines

- Support `-` as stdin only when it is idiomatic for the tool and unambiguous.
- Detect whether stdin is a terminal before blocking for piped input.
- Make pipeline behavior predictable: if the tool reads stdin, document when it does so.
- Keep stdin parsing separate from command execution so it can be tested with in-memory readers.

## Exit codes and signals

- Return exit code 0 for success.
- Use non-zero exit codes for errors, and keep distinct codes only when callers can act on them.
- Use `exitcode` constants when conventional failure classes help callers. Otherwise keep success vs failure simple.
- Let `clap` handle usage errors unless custom exit behavior is required.
- Handle Ctrl-C cleanly for long-running commands: stop work, clean up temporary state, and avoid noisy panic output.
- Use `ctrlc` for simple Ctrl-C handlers. Use `signal-hook` when the tool needs broader Unix signals or channel-based notification with `crossbeam-channel`.
- For async tools, use `signal-hook` Tokio support or runtime-native signal APIs with cooperative cancellation.
- Implement cooperative cancellation with `Arc<AtomicBool>` for long-running loops so the tool can finish current work and clean up.
- Consider a double Ctrl-C convention: first press requests graceful shutdown, second press forces immediate exit.
- Do not hide partial failure in batch commands. Either report per-item failures clearly or return a failing exit status.

## Configuration files

- Prefer command-line flags for direct invocation and automation.
- Add config files only when repeated options become painful or the tool has durable user preferences.
- Use `confy` for the book's simple serde-backed config-file path.
- Make precedence explicit: command-line flags override environment variables, which override config files, which override defaults unless the project documents a different order.
- Use platform-appropriate config directories through crates such as `directories` when the config crate does not choose paths for you.
- The book leaves env and multi-config layering incomplete. Document the project-specific precedence instead of assuming a standard.
- Include the loaded config path in debug output, not normal command output.

## Testing strategy

- Unit test pure logic directly.
- Unit test rendering with in-memory buffers.
- Integration test the compiled binary with `assert_cmd`.
- Use `predicates` for stdout/stderr assertions.
- Use `assert_fs` or `tempfile` for filesystem tests.
- Test observable CLI behavior, not implementation details.
- Test success paths, invalid arguments, missing files, output modes, and stable error behavior.
- Avoid brittle snapshots of full generated help unless help text is part of the contract. Prefer checking key flags or command names.
- Include at least one pipe/stdin test when the CLI reads stdin.
- Consider `proptest` or fuzzing for parsers, filters, formatters, and untrusted input.

## Documentation and packaging

- Ensure `--help` is useful before writing separate usage docs.
- Include examples that users can copy and run.
- Choose the distribution path deliberately: `cargo publish`/`cargo install` for Rust users, binary releases for broad end-users, and package repositories when users expect OS package manager installation.
- Document installation with `cargo install --locked` when publishing to crates.io, but do not treat `cargo install` as sufficient for non-Rust users.
- Use `cross` for cross-compilation when targeting platforms the host cannot build natively.
- Generate man pages with `clap_mangen` in `build.rs` and shell completions with `clap_complete`.
- For binary releases, document target triples and available shell completions and man pages.
- Keep `Cargo.toml` metadata suitable for distribution: description, license, repository, readme, categories, and keywords.

## Useful crate defaults

- `clap` for argument parsing.
- `anyhow` for application-level CLI errors.
- `thiserror` for typed library errors below the CLI boundary.
- `serde` and `serde_json` for machine-readable output.
- `confy` for simple serde-backed config files. `directories` for explicit platform config paths.
- `log` and `env_logger` for leveled diagnostics with `RUST_LOG` control. `tracing` when structured or async-aware logging is needed.
- `clap-verbosity-flag` for `-v`/`-q` flag integration with `log` levels.
- `indicatif` for progress bars and spinners.
- `human-panic` for user-friendly crash reports in release builds.
- `exitcode` when conventional named exit statuses help callers.
- `ctrlc` for simple signal handlers. `signal-hook`, `crossbeam-channel`, and Tokio support for broader signal needs.
- `clap_mangen` for man page generation. `clap_complete` for shell completions.
- `anstream`, `anstyle`, or related ecosystem crates for color-aware terminal output when needed.
- `assert_cmd`, `predicates`, `assert_fs`, and `tempfile` for CLI tests. `proptest` or fuzzing for edge-heavy pure logic.

## Book-derived cautions

- Do not copy old edition or MSRV assumptions from examples. Follow the current project MSRV and `rust-dev` guidance.
- Do not copy tutorial shortcuts such as whole-file reads, `unwrap`, `expect`, or `panic!` into production command paths.
- Treat the grep-clone example as a teaching scaffold, not a default app architecture.
- Treat modern defaults in this skill as implementation guidance, not always direct quotations from the book.
- Check modern crate APIs before using older snippets from the book.
- Prefer current CI and release tooling from `rust-dev` over older Travis/AppVeyor-era packaging notes.

## Build flow

1. Define the user contract: commands, args, output modes, exit behavior, and config precedence.
2. Build typed `clap` inputs.
3. Implement pure command logic.
4. Add fallible I/O boundaries with contextual errors.
5. Render human and machine output through separate paths.
6. Add unit tests for logic and rendering.
7. Add integration tests for the binary.
8. Run `cargo fmt`, `cargo clippy`, `cargo test`, and any project-specific checks from `rust-dev`.
