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

- **Error handling**: Use `thiserror` for typed error enums. Define `pub type Result<T> = std::result::Result<T, Error>`. Propagate with `?`. No `anyhow` in libraries. Redact sensitive data in custom `Debug` impls. Binaries render errors as structured JSON (`ErrorBody`).
- **Project structure**: Thin `main.rs` calling a single entry point from `lib.rs`. Library owns the module tree. Keep public surface minimal with targeted re-exports. Domain modules per concern (auth, market, etc.).
- **Type design**: Small data-only response structs with `Option<T>` for partial API responses. Fluent consuming builders for config and query options. `Serialize + Debug + Clone` on DTOs. `#[must_use]` on pure helpers. `#[non_exhaustive]` on future-facing enums.
- **Serde**: `#[serde(rename_all = "camelCase")]` for JSON APIs. `SCREAMING_SNAKE_CASE` for enum variants matching wire format. Tagged enums with `#[serde(tag = "type")]` when API has a discriminator, untagged when it doesn't. Use `serde_with` for complex transformations and `#[serde_with::skip_serializing_none]`.
- **Async**: Tokio runtime. `#[tokio::main]` entry point. Public async methods return `crate::Result<T>`. Factor heavy logic into sync helpers for easier unit testing. Prefer RPITIT over `async-trait` when dyn-dispatch isn't needed. Use `tokio::select! { biased; }` for deterministic branch priority.
- **Documentation**: `#![deny(missing_docs)]` at crate root. `///` for items, `//!` for crate/module. Fallible methods require `# Errors` section. Async examples use `no_run`. `#[allow(missing_docs)]` narrowly when fields directly mirror JSON keys.
- **Testing**: Unit tests inline in `#[cfg(test)] mod tests`. HTTP mocking with `mockito`. Async tests with `#[tokio::test]`. Feature-gated live tests (`#[cfg(feature = "test_online")]`). 90% coverage threshold.
- **Cargo.toml**: Edition 2024. Explicit `rust-version` for MSRV. Features must be additive. Use `dep:` to hide optional dependencies from feature namespace. Pin with semver caret ranges. Configure `docs.rs` with `all-features` + `--cfg docsrs`.
- **Clippy**: Baseline `clippy::all`. Use `pedantic`/`restriction` selectively. Run clippy and tests once per feature combination (default + each feature flag).
- **CI/CD**: Four workflows: `ci.yml` (nightly fmt, stable clippy/test cross-platform, MSRV `--locked`, docs with link lints, `-Dwarnings`), `audit.yml` (daily + lockfile changes), `cd.yml` (release-plz with OIDC trusted publishing), `release.yml` (cargo-dist tag-triggered). Split fmt/clippy/test into separate jobs.
- **Makefiles**: Standard targets: `check`, `fmt`, `fmt-fix`, `clippy`, `test`, `doc`, `coverage` (90% threshold), `audit`.
- **Pre-commit formatting**: Run `cargo fmt --check` on changed files before committing. If it fails, run `cargo fmt` to fix, then stage.
- **Release**: release-plz for automated releases with OIDC trusted publishing. git-cliff for changelog generation.
- **AGENTS.md**: Use hierarchical AGENTS.md files (root, src/, src/models/) as living architecture specs within each Rust project.
