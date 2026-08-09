# Python Security Reference

Depth reference for `SKILL.md` section 10.
Primary source: the [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org) (CC BY-SA 4.0, Markdown, actively maintained) — the best ingestible, permissively-licensed security source for Python.
Risk taxonomy: [OWASP Top 10:2025](https://owasp.org/Top10/2025/) (8th edition, finalized ~January 2026, first update since 2021).

## OWASP Top 10:2025 mapped to Python concerns

Fetch the linked cheat sheet before writing or reviewing code in that category — the summaries below are reminders, not the full guidance.

| Category | What it means for Python | Cheat sheet |
| --- | --- | --- |
| A01 Broken Access Control (now absorbs SSRF) | Missing per-object authorization checks (BOLA/BFLA); unvalidated outbound URLs fetched server-side | [Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html), [SSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html) |
| A02 Security Misconfiguration | Debug mode left on in production, verbose stack traces returned to clients, default credentials, permissive CORS | [Security Misconfiguration](https://cheatsheetseries.owasp.org/cheatsheets/Vulnerability_Disclosure_Cheat_Sheet.html) |
| A03 Software Supply Chain Failures | Unpinned/unhashed dependencies, unverified PyPI packages, compromised build/CI pipeline | see Supply Chain section below |
| A04 Cryptographic Failures | Homegrown crypto, weak hashes for passwords, hardcoded keys | [Cryptographic Storage](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html), [Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) |
| A05 Injection | String-built SQL/shell/LDAP/template queries | [Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Injection_Prevention_Cheat_Sheet.html), [SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html), [OS Command Injection Defense](https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html) |
| A06 Insecure Design | No threat model for a new trust boundary before implementation | [Threat Modeling](https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html) |
| A07 Authentication Failures | Weak session handling, missing rate limiting on login/reset | [Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), [Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) |
| A08 Software or Data Integrity Failures | Unsigned artifacts, `pickle`/`yaml.load` of untrusted data, unverified auto-update | [Deserialization](https://cheatsheetseries.owasp.org/cheatsheets/Deserialization_Cheat_Sheet.html) |
| A09 Security Logging and Alerting Failures | No logging on auth failures, or logging secrets/PII in plaintext | [Logging](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) |
| A10 Mishandling of Exceptional Conditions | Broad `except Exception: pass`, fail-open error paths, leaking internals in error responses | see `SKILL.md` section 5 (Error Handling) |

## Concrete Python rules

**Injection.** Always use parameterized queries (`cursor.execute(sql, params)`); never f-string or `%`-format user input into SQL. For shell commands, use `subprocess.run(args_list, shell=False)` — never `shell=True` with interpolated input. For dynamic file paths, resolve against a known base directory and reject paths that escape it (`Path.resolve()` + `is_relative_to()`), rather than trusting `..`-stripping alone.

**Deserialization.** Never `pickle.load`/`pickle.loads` on data from a network, file upload, or cache you don't fully control — pickle can execute arbitrary code on load. Never `yaml.load()` without `Loader=yaml.SafeLoader` (or `yaml.safe_load()`). Prefer `json` or a schema-validated model (`pydantic`) for anything crossing a trust boundary.

**No `eval`/`exec` on untrusted input.** Use `ast.literal_eval` for literal Python structures; use a real parser for anything else.

**Secrets management.** Read secrets from environment variables or a secrets manager (Vault, AWS/GCP secret managers, `keyring` for local dev) — never commit them, even in test fixtures. Run `detect-secrets` or `gitleaks` in CI or pre-commit if the repo doesn't already. Rotate anything that leaks; a `git revert` doesn't remove it from history.

**Cryptography.** Don't write custom crypto. Use `cryptography` (not the deprecated `pycrypto`) or your framework's built-ins. Hash passwords with `argon2` or `bcrypt` (via `passlib` or a maintained binding), never plain `sha256`/`md5`. Use `secrets` (not `random`) for tokens, session IDs, and anything security-sensitive — `random` is not cryptographically secure.

**Logging.** Log auth failures, permission denials, and input-validation rejections. Never log passwords, tokens, API keys, or full request/response bodies that may carry PII — redact before logging, don't rely on downstream log scrubbing.

## Supply chain (A03)

- Pin dependencies in a **hashed** lockfile: `uv.lock` (Astral's default) or the PEP 751 `pylock.toml` standard format for cross-tool portability. Avoid an unpinned `requirements.txt` for anything beyond a scratch script.
- Run `pip-audit` (maintained by Trail of Bits with Google support; checks against the PyPA Advisory Database/OSV) in CI. Ruff's `S` rule category (`flake8-bandit` re-implementation) and [Bandit](https://bandit.readthedocs.io) directly catch many of the injection/crypto/subprocess patterns above at lint time — enable `S` in `[tool.ruff]` `select` if the repo doesn't already.
- Prefer packages published via PyPI Trusted Publishers (OIDC, no long-lived API tokens) and verify PEP 740 attestations / Sigstore signatures where available for anything security-sensitive.
- [Semgrep](https://semgrep.dev/r) registry rules are useful for taint-tracking injection patterns that simple linters miss.

## Sources

- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org) — CC BY-SA 4.0.
- [OWASP Top 10:2025](https://owasp.org/Top10/2025/) — cite the project page (the site footer and repo `LICENSE` disagree, CC BY 3.0 vs CC BY-SA 4.0).
- [OWASP ASVS 5.0.0](https://github.com/OWASP/ASVS) — ~350 verification requirements across 17 chapters, released May 2025.
- [NIST SSDF (SP 800-218)](https://csrc.nist.gov/projects/ssdf) — outcome-based secure-development process practices, public domain.
- [Bandit](https://bandit.readthedocs.io), [pip-audit](https://pypi.org/project/pip-audit), [Semgrep](https://semgrep.dev/r).
