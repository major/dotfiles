---
name: session-system-prompt
description: Recover or compare an OpenCode V2 session's original system prompt and saved initial instruction sources.
---

# Recover session instructions

1. Confirm the session with `opencode api session.get --param sessionID=SESSION_ID`. For comparisons, verify the first assistant message's model and the user's local date.
2. Prefer a captured first outbound request. Transcripts alone do not contain the full system prompt. Never substitute today's config for historical instructions.
3. Locate the active service's SQLite database, including its channel. Back up only the needed tables with `sqlite3 -readonly "$DB" '.dump instruction_state instruction_blob' > "$TMP/instructions.sql"`, then import into a temporary database. Keep artifacts private; never modify the live database or copy its entire multi-GB contents.
4. Query the backup, replacing `SESSION_ID`:
```sql
SELECT j.key AS source, b.hash, b.value
FROM instruction_state s, json_each(s.initial_values) j
LEFT JOIN instruction_blob b ON b.hash = j.value
WHERE s.session_id = 'SESSION_ID';
```
5. Export every source and JSON-decode `value`; render `core/instructions` entries by `path` and `content`. Verify no referenced blob is missing.
6. Check compaction, revert, and fork history: `initial_values` is the epoch baseline, not necessarily the session's original baseline. Do not use `current_values` as the original.
7. Clearly label recovered sources versus an exact request capture. These records do not establish base/agent prompts, tool schemas, or final assembly. For diffs, separate project/date/config changes from model-specific differences.
