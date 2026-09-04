---
name: opencode-session-diagnosis
description: |
  Diagnose failures or unexpected behavior in another OpenCode V2 session.
  Use when the user provides a session ID such as ses_... or asks to inspect,
  debug, diagnose, or fix an OpenCode session, especially when determining
  whether a fix is needed in the OpenCode repository.
---

# Diagnose an OpenCode session

Use this workflow for requests such as:

```text
I keep getting errors in session ses_...; please diagnose/fix.
```

Always treat the referenced session as evidence to inspect, not as permission
to mutate.

## 1. Establish scope

- Extract every `ses_...` ID from the request and validate its exact spelling before further inspection.
- If a session lookup returns `SessionNotFoundError`, list recent sessions and compare the supplied ID character-for-character before treating it as unavailable:

```sh
opencode2 api get '/api/session?limit=100'
```
- Identify the current OpenCode checkout and version before comparing code.
- Use OpenCode V2 behavior, commands, API routes, and documentation throughout.
- Do not assume the referenced session belongs to the current working directory
  or the current OpenCode process.
- Ask for the session ID or server location only when it is genuinely missing.

## 2. Inspect the session through the API

Prefer the built-in client because it follows local service discovery and
authentication:

```sh
opencode2 service status
opencode2 api get /api/health
opencode2 api get /api/session/<SESSION_ID>
opencode2 api get /api/session/<SESSION_ID>/context
opencode2 api get /api/session/<SESSION_ID>/inbox
```

Read the session metadata first, then inspect active context and pending inbox
items.
The context usually gives the shortest useful transcript without dumping the
whole session.

If the session completed successfully and the reported failure concerns an
external service, inspect the context and referenced message records before
reading the event stream or product source.
This distinguishes external task failures from OpenCode lifecycle failures and
avoids treating a terminal `log.synced` event as diagnostic evidence.

Read the durable event stream when the failure involves execution state,
retries, tools, permissions, compaction, interruption, or a missing event:

```sh
opencode2 api get /api/experimental/session/<SESSION_ID>/log
```

The endpoint is an SSE stream.
Capture a bounded sample when necessary, and use `after=<SEQ>` to narrow a
follow-up read.
Do not use `follow=true` unless live reproduction is required.

Use the session message endpoint for a specific message referenced by an event:

```sh
opencode2 api get /api/session/<SESSION_ID>/message/<MESSAGE_ID>
```

Do not start with raw database inspection.
Do not edit or delete the database, service files, session data, or inbox items
while diagnosing.

## 3. Correlate process logs

The default installed log is:

```text
~/.local/share/opencode/log/opencode.log
```

Inspect only relevant lines and preserve `run` and `role` fields:

```sh
grep 'role=server' ~/.local/share/opencode/log/opencode.log
grep '<SESSION_ID>' ~/.local/share/opencode/log/opencode.log
```

Correlate event sequence, message ID, provider/model, tool name, error type,
and log timestamp.
Use `role=cli` for client startup or rendering failures and `role=server` for
session, provider, plugin, permission, and tool failures.
If ordinary logs are insufficient, reproduce once with
`OPENCODE_LOG_LEVEL=DEBUG` rather than enabling noisy logging indefinitely.

Redact API keys, authorization headers, prompts, file contents, and personal
data before quoting diagnostics.

## 4. Classify the failure

Classify the smallest responsible layer:

- Client or TUI: the server state and API are correct, but rendering, input,
  connection, or local storage is wrong.
- Shared service: multiple clients or sessions fail, or the API, lifecycle,
  provider, plugin, permission, or tool path is broken.
- Project configuration: only one project fails due to config, instructions,
  plugins, tools, environment, or permissions.
- Provider or external dependency: the request reaches the provider or tool,
  which returns a rate limit, authentication, network, or service error.
- OpenCode product bug: the same supported input reliably produces an
  incorrect state, missing event, crash, or contradictory API behavior.

Check whether the issue reproduces in a second session or with
`opencode2 --standalone` before attributing it to the shared service.
Do not restart the shared service until collecting enough evidence to preserve
the failure state.

## 5. Investigate the attached checkout

When the user asks to diagnose or fix OpenCode, inspect the attached checkout
at `/home/major/.local/share/opencode/repos/github.com/anomalyco/opencode@v2`
unless the user identifies another checkout.

- Search for the event type, error constructor, endpoint, log message, or
  component named by the evidence.
- Trace the path across protocol, server, core, client, TUI, and app layers.
- Compare the observed event ordering and error shape with the implementation
  and existing tests.
- Read nearby `AGENTS.md` files before editing.
- Keep the fix minimal and remove obsolete paths instead of adding fallbacks.
- Add a regression test at the lowest layer that reproduces the failure when
  practical.
- Do not modify generated client files directly.

If the evidence points outside OpenCode, do not invent a repository fix.
Explain the external cause and the smallest user-side remedy instead.

## 6. Verify and report

After a code change, run the narrowest relevant tests first, then package
typechecking from the package directory.
If the public Protocol or Server `HttpApi` changed, run `bun run generate`
from `packages/client`.
Never run tests from the repository root.

Report findings first:

- Root cause and confidence.
- Evidence, including session event types, sequence/message IDs, and relevant
  redacted log lines.
- Whether an OpenCode fix is needed.
- Files changed and tests run, or why no code change was appropriate.
- Any remaining uncertainty or missing reproduction.

If the session cannot be reached, say exactly which access check failed and
request the smallest additional artifact needed, such as a redacted event
stream or log excerpt.

## 7. Improve the workflow

Always finish a diagnosis with a brief self-reflection and suggest actionable
workflow improvements when the evidence supports one.

After each diagnosis, briefly reflect on the workflow before finishing:

- Which command or inspection produced the most useful evidence?
- Which step was redundant, slow, ambiguous, or too noisy?
- What missing artifact or clearer instruction would have shortened the next
  diagnosis?

Keep only concrete improvements that generalize to future OpenCode V2 sessions.
Prefer removing steps, narrowing commands, or clarifying wording over adding
new process.
Mention an improvement in the final response only when it is actionable; do
not add a retrospective section for a routine successful diagnosis.
