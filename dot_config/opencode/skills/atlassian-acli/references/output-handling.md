# Output handling

Use compact output by default and avoid dumping raw Jira payloads into chat.

## Count first

```bash
acli jira workitem search --jql 'project = PROJ AND resolution IS EMPTY' --count
```

## Limit and choose fields

```bash
acli jira workitem search --jql 'project = PROJ ORDER BY updated DESC' --limit 25 --fields key,summary,status,assignee --json
```

## Redirect large JSON or CSV

```bash
mkdir -p /tmp/opencode
acli jira workitem search --jql 'project = PROJ' --limit 200 --fields key,summary,status --json > /tmp/opencode/proj-workitems.json
acli jira workitem search --jql 'project = PROJ' --limit 200 --fields key,summary,status --csv > /tmp/opencode/proj-workitems.csv
```

## Compact TSV summaries

Probe the JSON shape first, then extract only useful columns.

```bash
python3 - <<'PY'
import json
from pathlib import Path
data = json.loads(Path('/tmp/opencode/proj-workitems.json').read_text())
print(type(data).__name__)
if isinstance(data, dict):
    print(sorted(data)[:20])
elif isinstance(data, list):
    print('list length', len(data), 'first type', type(data[0]).__name__ if data else 'empty')
PY
```

```bash
python3 - <<'PY'
import json
from pathlib import Path
data = json.loads(Path('/tmp/opencode/proj-workitems.json').read_text())
items = data.get('issues') if isinstance(data, dict) else data
for item in items or []:
    fields = item.get('fields', {})
    key = item.get('key', '')
    status = (fields.get('status') or {}).get('name', '') if isinstance(fields.get('status'), dict) else fields.get('status', '')
    summary = fields.get('summary', '')
    print(f'{key}\t{status}\t{summary}')
PY
```

## Defensive rules

- Do not assume the top-level JSON shape.
- Do not paste full `--fields '*all'` output.
- Store full payloads under `/tmp/opencode` and summarize the relevant fields.
- Prefer `--csv` for spreadsheet-style inspection and `--json` for scripted inspection.
