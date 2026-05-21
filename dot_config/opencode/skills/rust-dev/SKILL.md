---
name: rust-dev
description: |
  Use when writing, reviewing, or setting up Rust code, crates, or tests.
  Also use proactively when creating new Rust files, configuring Cargo.toml,
  setting up CI/CD for Rust projects, or reviewing Rust PRs, even if the user
  doesn't explicitly mention Rust conventions. Does not cover general testing
  philosophy (see root AGENTS.md).
  Triggers: ".rs files", "Rust", "Cargo", "tokio", "serde", "thiserror",
  "clippy", "cargo fmt", "MSRV", "crate", "release-plz"
---

# Rust Development

- **Error handling**: Use `thiserror` for typed error enums. Define `pub type Result<T> = std::result::Result<T, Error>`. Propagate with `?`. No `anyhow` in libraries. Redact sensitive data in custom `Debug` impls. For CLIs that emit machine-readable output, render errors as structured JSON.
- **Project structure**: Thin `main.rs` calling a single entry point from `lib.rs`. Library owns the module tree. Keep public surface minimal with targeted re-exports. Domain modules per concern (auth, market, etc.).
- **CLI/API refactors**: When commands or endpoint wrappers repeat paths, defaults, or query shapes, extract them into private descriptor/helper modules; keep public command enums and client methods explicit. Avoid macros, codegen, or extra crates until duplication is structural enough to justify them. Test CLI output serialization separately from HTTP request bodies; their `None`/default semantics often differ.
- **Type design**: Small data-only response structs with `Option<T>` for partial API responses. Fluent consuming builders for config and query options. `Serialize + Debug + Clone` on DTOs. `#[must_use]` on pure helpers. `#[non_exhaustive]` on future-facing enums. Newtype wrappers for domain IDs and quantities (`struct UserId(u64)`). Accept borrowed types in function args: `&str` not `&String`, `&[T]` not `&Vec<T>`, `&dyn Read` not `&File`.
- **Serde**: `#[serde(rename_all = "camelCase")]` for JSON APIs. `SCREAMING_SNAKE_CASE` for enum variants matching wire format. Tagged enums with `#[serde(tag = "type")]` when API has a discriminator, untagged when it doesn't. Use `serde_with` for complex transformations and `#[serde_with::skip_serializing_none]`.
- **Async**: Tokio runtime. `#[tokio::main]` entry point. Keep async functions thin; put pure logic in sync helpers so tests don't need a runtime. Prefer RPITIT over `async-trait` when dyn-dispatch isn't needed. Use `tokio::select! { biased; }` for deterministic branch priority.
- **Documentation**: 100% docstring coverage. `#![deny(missing_docs)]` at crate root. `///` for items, `//!` for crate/module. Fallible methods require `# Errors` section. Async examples use `no_run`. `#[allow(missing_docs)]` narrowly when fields directly mirror JSON keys.
- **Testing**: Unit tests inline in `#[cfg(test)] mod tests`. Async tests with `#[tokio::test]`. Feature-gated live tests (e.g., `#[cfg(feature = "test_online")]`). 90%+ coverage required.
- **Patch coverage**: Before opening PRs, check changed-line coverage with `diff-cover` (`uv tool install diff_cover` or `uvx diff-cover`). This catches PRs that pass overall coverage but leave new or changed code untested. Generate the same LCOV report that CI uploads and run:

  ```bash
  cargo llvm-cov --workspace --fail-under-lines 90 --lcov --output-path lcov.info \
    && diff-cover lcov.info --compare-branch=main --fail-under=100
  ```

  Add a `patch-coverage` Makefile target with configurable `PATCH_COVERAGE_BASE ?= main`, `PATCH_COVERAGE_FAIL_UNDER ?= 100`, and `DIFF_COVER ?= diff-cover`.
- **HTTP mocking decision tree**: Default to `mockito` for most projects. Use `httpmock` only when you need features mockito lacks.
  - **mockito**: Simpler API, smaller deps, colored diff on mismatches, `assert_on_drop`, MSRV 1.85. Covers request/response stubbing, regex/JSON matchers, parallel tests, multi-host mocking. No custom matchers, no standalone/proxy/record mode.
  - **httpmock**: Custom request matchers, standalone server (Docker), record/playback, proxy/forward mode, fault/delay simulation, YAML mock definitions. Heavier deps, more feature-flag complexity.
  - Pick mockito when tests are "send request, check path/query, return canned JSON." Pick httpmock when you need standalone servers, traffic recording, proxying, or matcher logic beyond built-ins.
- **Platform-specific code**: Prefer `cfg_select!` (stable since 1.95) over the `cfg-if` crate once MSRV allows.
- **Cargo.toml**: Edition 2024. Explicit `rust-version` for MSRV. Features must be additive. Use `dep:` to hide optional dependencies from feature namespace. Pin with semver caret ranges. Configure `docs.rs` with `all-features` + `--cfg docsrs`.
- **Clippy**: Baseline `clippy::all`. Use `pedantic`/`restriction` selectively. CI runs clippy and tests once per feature combination (see CI/CD).
- **CI/CD**: Four workflows: `ci.yml` (nightly fmt, stable clippy/test cross-platform, MSRV `--locked`, docs with link lints, `-Dwarnings`), `audit.yml` (daily + lockfile changes), `cd.yml` (release-plz with OIDC trusted publishing), `release.yml` (cargo-dist tag-triggered). Split fmt/clippy/test into separate jobs.
- **Makefiles**: Standard targets: `check`, `fmt`, `fmt-fix`, `clippy`, `test`, `doc`, `coverage`, `patch-coverage`, `audit`.
- **Pre-commit formatting**: Run `cargo fmt --check` on changed files before committing. If it fails, run `cargo fmt` to fix, then stage.
- **Release**: release-plz for automated releases with OIDC trusted publishing. git-cliff for changelog generation.
- **Anti-patterns**: Don't `.clone()` just to satisfy the borrow checker; restructure borrows or use scoped blocks instead. Never put `#[deny(warnings)]` in source code (breaks on compiler upgrades); use `-Dwarnings` in CI flags only. (`#![deny(missing_docs)]` is fine because that lint is stable; `deny(warnings)` is not.)
- **AGENTS.md**: Use hierarchical AGENTS.md files at the crate root and any subdirectory with its own concerns, as living architecture specs within each Rust project.
