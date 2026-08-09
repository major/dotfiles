# Custom fields

Verified local `acli jira field` help exposes create, delete, restore, and update.
It did not expose native field read, list, or search discovery.

## Native workflow

Read a representative work item with all fields and inspect the saved payload.

```bash
mkdir -p /tmp/opencode
acli jira workitem view PROJ-123 --fields '*all' --json > /tmp/opencode/workitem-all-fields.json
```

Do not paste the raw all-fields payload into chat.
Extract only the field IDs and names needed for the task.

## REST fallback when credentials already exist

Use REST only if the environment already has the Jira email and API token available.
Do not ask users to paste tokens into chat and do not print tokens.

```bash
mkdir -p /tmp/opencode
python3 - <<'PY'
import csv, json, os, sys, urllib.request

site = os.environ.get('JIRA_SITE') or os.environ.get('JIRA_HOST') or 'https://redhat.atlassian.net'
if not site.startswith('http'):
    site = 'https://' + site
email = os.environ.get('JIRA_EMAIL') or os.environ.get('CONFLUENCE_EMAIL')
token = os.environ.get('JIRA_API_TOKEN') or os.environ.get('JIRA_API_KEY')
if not email or not token:
    sys.exit('JIRA_EMAIL/CONFLUENCE_EMAIL and JIRA_API_TOKEN/JIRA_API_KEY are required for REST fallback')

req = urllib.request.Request(f'{site}/rest/api/3/field')
import base64
auth = base64.b64encode(f'{email}:{token}'.encode()).decode()
req.add_header('Authorization', f'Basic {auth}')
req.add_header('Accept', 'application/json')
with urllib.request.urlopen(req) as resp:
    fields = json.load(resp)

with open('/tmp/opencode/jira-fields.tsv', 'w', newline='') as fh:
    writer = csv.writer(fh, delimiter='\t')
    writer.writerow(['id', 'name', 'custom'])
    for field in fields:
        writer.writerow([field.get('id', ''), field.get('name', ''), field.get('custom', '')])
PY
```

Cache the field map at `/tmp/opencode/jira-fields.tsv`.
Use the cached map for summaries and never print credential values.
