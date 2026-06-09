---
description: Triage open Red Hat Bugzilla tickets assigned to me by action needed
---

<!-- markdownlint-disable MD013 -->

# Bugzilla Ticket Triage

Triage open Red Hat Bugzilla tickets assigned to the user, focusing on items that need action first.

## Execution Policy

- Read-only. Never modify, comment on, close, reassign, retitle, or change flags on bugs from this command.
- Use `curl` against the Bugzilla REST API. Do not use the `bugzilla` Python CLI for the query because it may not work with API keys in this environment.
- Read the API token from `~/.config/bugzilla/redhat-token`, which should be an INI file containing `token = BUGZILLA_API_TOKEN`, and send it as `Authorization: Bearer ...`. Never print the token or paste it into output.
- If `$ARGUMENTS` contains product, component, status, or query hints, add them as extra filters only after preserving the default action-needed triage behavior.

## Phase 1: Setup

Use these defaults:

```bash
BZ_URL="https://bugzilla.redhat.com"
TOKEN_FILE="$HOME/.config/bugzilla/redhat-token"
```

Determine the Bugzilla login:

```bash
if [ -n "$BUGZILLA_USER" ]; then
  BZ_USER="$BUGZILLA_USER"
elif git config --global bugzilla.user >/dev/null 2>&1; then
  BZ_USER="$(git config --global bugzilla.user)"
else
  echo "BUGZILLA_USER is not set and git config --global bugzilla.user is unavailable. Ask the user for their Bugzilla login email."
  echo "Set one of:"
  echo "  export BUGZILLA_USER=your-bugzilla-login@example.com"
  echo "  git config --global bugzilla.user your-bugzilla-login@example.com"
  exit 1
fi
```

Validate the token file exists before querying:

```bash
if [ ! -r "$TOKEN_FILE" ]; then
  echo "Cannot read Bugzilla token file: $TOKEN_FILE"
  exit 1
fi
```

Prepare the Authorization header without printing it:

```bash
BZ_TOKEN="$(awk -F'= *' '/^token[[:space:]]*=/{print $2}' "$TOKEN_FILE")"
if [ -z "$BZ_TOKEN" ]; then
  echo "No token value found in $TOKEN_FILE. Expected an INI line like: token = BUGZILLA_API_TOKEN"
  exit 1
fi
AUTH_HEADER="Authorization: Bearer $BZ_TOKEN"
```

## Phase 2: Query Assigned Bugs

Query open bugs assigned to the user. Do not use `api_key` query parameters because Red Hat Bugzilla supports bearer-token authentication and query-string tokens can be logged.

```bash
curl -sS -G "$BZ_URL/rest/bug" \
  -H "$AUTH_HEADER" \
  --data-urlencode "assigned_to=$BZ_USER" \
  --data-urlencode "resolution=---" \
  --data-urlencode "include_fields=id,summary,status,resolution,priority,severity,product,component,assigned_to,creation_time,last_change_time,deadline,depends_on,blocks,flags,keywords,whiteboard,url" \
  | jq '.' > /tmp/bugzilla-triage.json
```

Do not broaden to closed bugs unless the user explicitly requests it.

If `$ARGUMENTS` includes additional filters, apply them with extra `--data-urlencode` arguments. Examples:

```bash
--data-urlencode "product=Red Hat Enterprise Linux 10"
--data-urlencode "component=python3"
--data-urlencode "bug_status=NEW"
```

## Phase 3: Validate Response

Check for API errors before summarizing:

```bash
jq -e 'has("error") or has("code")' /tmp/bugzilla-triage.json >/dev/null \
  && jq '{error, code, message, documentation}' /tmp/bugzilla-triage.json \
  && exit 1
```

Count bugs:

```bash
jq '.bugs | length' /tmp/bugzilla-triage.json
```

If there are no bugs, say plainly that there are no open assigned Bugzilla tickets matching the filters.

## Phase 4: Classify Bugs

Classify each bug into one primary action bucket. A bug may match several rules, but show it in the first matching bucket only.

Priority order:

1. **Needinfo For Me**: any flag with `status == "?"` and `requestee == BZ_USER`, or flag name containing `needinfo`.
2. **High Priority**: priority or severity matching `urgent`, `high`, `blocker`, `critical`, or `P1`.
3. **Blocks Others**: `blocks` is non-empty.
4. **Blocked**: `depends_on` is non-empty.
5. **Stale**: `last_change_time` is older than 14 days.
6. **Other Assigned**: everything else.

Use this jq helper to produce TSV rows for sorting and rendering:

```bash
jq -r --arg user "$BZ_USER" --arg now "$(date -u +%s)" '
  def text:
    if type == "array" then map(tostring) | join(", ")
    elif . == null then "-"
    else tostring
    end;

  def clean:
    text | gsub("[\t\n\r|]"; " ");

  def age_days:
    ((($now | tonumber) - (.last_change_time | fromdateiso8601)) / 86400 | floor);

  def has_needinfo_for_me:
    any((.flags // [])[];
      (.status == "?") and (((.requestee // "") == $user) or ((.name // "") | test("needinfo"; "i")))
    );

  def is_high_priority:
    ([.priority, .severity] | map(. // "") | join(" ") | test("urgent|high|blocker|critical|\\bP1\\b"; "i"));

  def bucket:
    if has_needinfo_for_me then "1\tNeedinfo For Me"
    elif is_high_priority then "2\tHigh Priority"
    elif ((.blocks // []) | length) > 0 then "3\tBlocks Others"
    elif ((.depends_on // []) | length) > 0 then "4\tBlocked"
    elif age_days > 14 then "5\tStale"
    else "6\tOther Assigned"
    end;

  .bugs[] |
  (bucket) as $bucket |
  [
    ($bucket | split("\t")[0]),
    ($bucket | split("\t")[1]),
    (.id | tostring),
    (.status | clean),
    (.priority | clean),
    (.severity | clean),
    (age_days | tostring),
    (.product | clean),
    (.component | clean),
    (.summary | clean)
  ] | @tsv
' /tmp/bugzilla-triage.json | sort -t $'\t' -k1,1n -k7,7nr > /tmp/bugzilla-triage.tsv
```

## Phase 5: Present Results

Render compact markdown grouped by bucket. Include clickable bug links.

Output format:

```markdown
## Needinfo For Me (N)
| Bug | Status | Pri | Sev | Age | Product / Component | Summary |
|---|---|---:|---:|---:|---|---|
| [123456](https://bugzilla.redhat.com/show_bug.cgi?id=123456) | NEW | high | urgent | 22d | RHEL / kernel | Example summary |

## High Priority (N)
...

## Blocks Others (N)
...

## Blocked (N)
...

## Stale (N)
...

## Other Assigned (N)
...

## Summary
- X open assigned bugs matching filters
- Y need action first: needinfo, high priority, or blocking other bugs
- Oldest stale bug: BUGID, Nd old
```

Keep each section to the top 10 bugs unless there are fewer than 30 total bugs. If there are more than 30 total bugs, show all action-needed buckets and summarize `Other Assigned` as a count plus the 5 most recently updated bugs.

## Rules

- Do not print the token, `AUTH_HEADER`, or the full curl URL after interpolation.
- Do not store the token in `/tmp`.
- Do not mutate bugs. This command is read-only.
- Prefer `BUGZILLA_USER` for identity. Falling back to `git config --global bugzilla.user` is acceptable, but mention the login used in the summary. Never fall back to `git config user.email` because Fedora git identity and Red Hat Bugzilla login can differ.
- If the REST query fails with an authentication error, tell the user to confirm `~/.config/bugzilla/redhat-token` contains a valid Red Hat Bugzilla API key.
- The token file must be INI-like, with a line matching `token = BUGZILLA_API_TOKEN`. Do not treat the whole file as a raw token.
- If the REST response shape differs from expected, inspect `/tmp/bugzilla-triage.json` with `jq 'keys'` and adapt the parsing without changing the read-only policy.
- If `$ARGUMENTS` asks for a product or component, include those filters in the summary line.
- Leave `/tmp/bugzilla-triage.json` and `/tmp/bugzilla-triage.tsv` available for the user to inspect after the command completes.
