# RSPEED Confluence Expert - curl + REST API

You are an expert in managing the RSPEED Confluence space using `curl` against the Confluence Cloud REST API.

Your job is to read, create, edit, and search Confluence pages in the RSPEED space efficiently using cached identifiers and pre-built patterns.

**NEVER look up IDs already listed here. Use them directly.**

---

## Tooling Rules

1. Use `curl` with the Confluence Cloud REST API for all operations.
2. Auth is via Basic auth: `mhayden@redhat.com:$JIRA_API_TOKEN` (same token as Jira, stored in `~/.zshrc.local`).
3. Use this skill for RSPEED-specific data: space key, cached page IDs, CQL templates, body format conventions.
4. Prefer JSON output. Use `jq` for parsing and formatting.
5. Always pass `-s` (silent) to curl to suppress progress bars.
6. Use `storage` format (XHTML) for page bodies, not ADF/atlas_doc_format.

### Base URL and Auth

```bash
CONFLUENCE_BASE="https://redhat.atlassian.net/wiki"
CONFLUENCE_AUTH="mhayden@redhat.com:$JIRA_API_TOKEN"
```

V2 API endpoints use `$CONFLUENCE_BASE/api/v2/...`. CQL search uses `$CONFLUENCE_BASE/rest/api/content/search`.

---

## Cached Identifiers

### Space

| Key | Value |
|-----|-------|
| Space Key | `RSPEED` |
| Space ID | `310280192` |
| Homepage ID | `310280194` |
| Instance | `redhat.atlassian.net` |

### Top-Level Pages (Children of Homepage)

| Page | ID |
|------|----|
| RHEL Lightspeed Onboarding | `310281246` |
| Infrastructure | `310280972` |
| Projects | `310281238` |
| Demos | `310280608` |
| Events | `310280930` |
| Agile Delivery & Jira Governance Policy | `310281336` |
| CVE | `310281422` |

---

## Common Operations

### Read a Page (by ID)

```bash
CONFLUENCE_BASE="https://redhat.atlassian.net/wiki"
CONFLUENCE_AUTH="mhayden@redhat.com:$JIRA_API_TOKEN"

# Get page metadata + body in storage format
curl -s -u "$CONFLUENCE_AUTH" \
  "$CONFLUENCE_BASE/api/v2/pages/PAGE_ID?body-format=storage" | \
  jq '{id, title, version: .version.number, body: .body.storage.value}'
```

To get metadata only (no body):

```bash
curl -s -u "$CONFLUENCE_AUTH" \
  "$CONFLUENCE_BASE/api/v2/pages/PAGE_ID" | \
  jq '{id, title, status, version: .version.number, parentId, spaceId}'
```

### Read a Page (by Title)

```bash
curl -s -u "$CONFLUENCE_AUTH" -G \
  --data-urlencode "title=PAGE TITLE HERE" \
  --data-urlencode "space-id=310280192" \
  --data-urlencode "body-format=storage" \
  "$CONFLUENCE_BASE/api/v2/pages" | \
  jq '.results[0] | {id, title, version: .version.number, body: .body.storage.value}'
```

### List Children of a Page

```bash
curl -s -u "$CONFLUENCE_AUTH" \
  "$CONFLUENCE_BASE/api/v2/pages/PARENT_ID/children?limit=50" | \
  jq '.results[] | {id, title, status}'
```

For the full page tree under a section, use the cached top-level page IDs and drill down as needed.

### Search with CQL

CQL search uses the v1 endpoint. Always URL-encode the CQL query.

```bash
# Search by text content within RSPEED space
curl -s -u "$CONFLUENCE_AUTH" -G \
  --data-urlencode 'cql=space = "RSPEED" AND type = "page" AND text ~ "search terms"' \
  --data-urlencode 'limit=25' \
  "$CONFLUENCE_BASE/rest/api/content/search" | \
  jq '.results[] | {id, title, type, _links: ._links.webui}'
```

```bash
# Search by title within RSPEED space
curl -s -u "$CONFLUENCE_AUTH" -G \
  --data-urlencode 'cql=space = "RSPEED" AND type = "page" AND title ~ "partial title"' \
  --data-urlencode 'limit=25' \
  "$CONFLUENCE_BASE/rest/api/content/search" | \
  jq '.results[] | {id, title}'
```

```bash
# Search by label
curl -s -u "$CONFLUENCE_AUTH" -G \
  --data-urlencode 'cql=space = "RSPEED" AND type = "page" AND label = "some-label"' \
  --data-urlencode 'limit=25' \
  "$CONFLUENCE_BASE/rest/api/content/search" | \
  jq '.results[] | {id, title}'
```

### Create a New Page

```bash
cat > /tmp/confluence-page.json << 'EOF'
{
  "spaceId": "310280192",
  "status": "current",
  "title": "PAGE TITLE HERE",
  "parentId": "PARENT_PAGE_ID",
  "body": {
    "representation": "storage",
    "value": "<p>Page content in XHTML storage format here.</p>"
  }
}
EOF

curl -s -u "$CONFLUENCE_AUTH" \
  -H "Content-Type: application/json" \
  -X POST "$CONFLUENCE_BASE/api/v2/pages" \
  -d @/tmp/confluence-page.json | \
  jq '{id, title, version: .version.number, _links}'
```

Always specify `parentId` so the page lands in the correct location in the page tree. Use the cached top-level page IDs to find the right parent, or look up children first.

### Update an Existing Page

Updates require the current version number + 1 (optimistic locking). Always fetch the current version first.

```bash
# Step 1: Get current version
VERSION=$(curl -s -u "$CONFLUENCE_AUTH" \
  "$CONFLUENCE_BASE/api/v2/pages/PAGE_ID" | jq '.version.number')

# Step 2: Update with version + 1
cat > /tmp/confluence-update.json << EOF
{
  "id": "PAGE_ID",
  "status": "current",
  "title": "PAGE TITLE",
  "body": {
    "representation": "storage",
    "value": "<p>Updated content here.</p>"
  },
  "version": {
    "number": $((VERSION + 1)),
    "message": "Updated via API"
  }
}
EOF

curl -s -u "$CONFLUENCE_AUTH" \
  -H "Content-Type: application/json" \
  -X PUT "$CONFLUENCE_BASE/api/v2/pages/PAGE_ID" \
  -d @/tmp/confluence-update.json | \
  jq '{id, title, version: .version.number}'
```

**To append content** without clobbering existing content:
1. Fetch current body with `body-format=storage`
2. Append new content to the existing `body.storage.value`
3. PUT the combined content with version + 1

### Get Page Labels

```bash
curl -s -u "$CONFLUENCE_AUTH" \
  "$CONFLUENCE_BASE/api/v2/pages/PAGE_ID/labels" | \
  jq '.results[] | {id, name}'
```

### Add a Label

```bash
curl -s -u "$CONFLUENCE_AUTH" \
  -H "Content-Type: application/json" \
  -X POST "$CONFLUENCE_BASE/rest/api/content/PAGE_ID/label" \
  -d '[{"prefix": "global", "name": "label-name"}]'
```

---

## CQL Quick Reference

CQL (Confluence Query Language) is used with the search endpoint. Common operators:

| Operator | Meaning | Example |
|----------|---------|---------|
| `=` | Exact match | `space = "RSPEED"` |
| `~` | Contains (fuzzy) | `title ~ "backend"` |
| `AND` | Both conditions | `space = "RSPEED" AND title ~ "test"` |
| `OR` | Either condition | `title ~ "api" OR title ~ "backend"` |
| `IN` | Set membership | `label IN ("draft", "review")` |

### Pre-built CQL Templates

```text
# All pages in RSPEED space
space = "RSPEED" AND type = "page"

# Pages under a specific parent (by title)
space = "RSPEED" AND type = "page" AND ancestor = "310281238"

# Pages modified recently
space = "RSPEED" AND type = "page" AND lastModified > now("-7d")

# Pages modified by current user
space = "RSPEED" AND type = "page" AND contributor = currentUser()

# Pages with specific label
space = "RSPEED" AND type = "page" AND label = "architecture"

# Full-text search
space = "RSPEED" AND type = "page" AND text ~ "some phrase"
```

---

## Storage Format (XHTML) Reference

Page bodies use Confluence storage format, which is XHTML with Confluence-specific elements. Common patterns:

### Basic Content

```xml
<p>Plain paragraph text.</p>

<h1>Heading 1</h1>
<h2>Heading 2</h2>
<h3>Heading 3</h3>

<ul>
  <li>Bullet item</li>
</ul>

<ol>
  <li>Numbered item</li>
</ol>

<table>
  <tbody>
    <tr>
      <th><p>Header 1</p></th>
      <th><p>Header 2</p></th>
    </tr>
    <tr>
      <td><p>Cell 1</p></td>
      <td><p>Cell 2</p></td>
    </tr>
  </tbody>
</table>
```

### Confluence-Specific Elements

```xml
<!-- Code block -->
<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">python</ac:parameter>
  <ac:plain-text-body><![CDATA[print("hello")]]></ac:plain-text-body>
</ac:structured-macro>

<!-- Info panel -->
<ac:structured-macro ac:name="info">
  <ac:rich-text-body><p>Info message here.</p></ac:rich-text-body>
</ac:structured-macro>

<!-- Warning panel -->
<ac:structured-macro ac:name="warning">
  <ac:rich-text-body><p>Warning message here.</p></ac:rich-text-body>
</ac:structured-macro>

<!-- Note panel -->
<ac:structured-macro ac:name="note">
  <ac:rich-text-body><p>Note message here.</p></ac:rich-text-body>
</ac:structured-macro>

<!-- Expand (collapsible section) -->
<ac:structured-macro ac:name="expand">
  <ac:parameter ac:name="title">Click to expand</ac:parameter>
  <ac:rich-text-body><p>Hidden content.</p></ac:rich-text-body>
</ac:structured-macro>

<!-- Status lozenge -->
<ac:structured-macro ac:name="status">
  <ac:parameter ac:name="title">DONE</ac:parameter>
  <ac:parameter ac:name="colour">Green</ac:parameter>
</ac:structured-macro>

<!-- Link to another Confluence page -->
<ac:link><ri:page ri:content-title="Page Title" ri:space-key="RSPEED" /></ac:link>

<!-- Mention a user -->
<ac:link><ri:user ri:account-id="712020:fed56895-9160-4662-9256-00c8b94870fd" /></ac:link>

<!-- Jira issue macro (embed a Jira ticket) -->
<ac:structured-macro ac:name="jira">
  <ac:parameter ac:name="key">RSPEED-123</ac:parameter>
</ac:structured-macro>
```

### Extracting Readable Text from Storage Format

Storage format is verbose. When reading pages for the user, strip XHTML tags and present clean text. Use `jq` with string manipulation, or pipe through a simple sed/awk cleanup:

```bash
# Quick readable extraction (strips most tags)
curl -s -u "$CONFLUENCE_AUTH" \
  "$CONFLUENCE_BASE/api/v2/pages/PAGE_ID?body-format=storage" | \
  jq -r '.body.storage.value' | \
  sed 's/<[^>]*>//g' | \
  sed '/^$/d'
```

For structured data extraction (tables, code blocks), parse the XHTML directly rather than stripping tags.

---

## Short Link Resolution

Confluence short links (`/wiki/x/XXXXXX`) redirect via `tinyurl.action`. **Do NOT use `curl -L -u`** to follow these redirects - it leaks Basic auth credentials into the redirect URL.

Instead, resolve short links in two steps:

```bash
# Step 1: Get the redirect Location header (no auth needed for redirect)
FULL_URL=$(curl -s -o /dev/null -w '%{redirect_url}' \
  "$CONFLUENCE_BASE/x/SHORT_CODE")

# Step 2: Extract page ID from the resolved URL and fetch via API
# The redirect URL contains the page ID in various formats - extract it
# Or just use the resolved URL to find the page title, then search by title
```

Prefer working with page IDs or titles directly rather than short links.

---

## Efficiency Guidelines

### Do Not Waste Calls

```text
1. Do not search for the RSPEED space ID: it is 310280192.
2. Do not search for the homepage ID: it is 310280194.
3. Do not look up top-level page IDs: they are cached above.
4. Do not fetch a page before editing if you only need to bump the version - but DO fetch version number.
5. Do not use the v1 API for page CRUD: use v2. Only use v1 for CQL search.
6. Do not use atlas_doc_format/ADF for page bodies: use storage format.
```

### Do Optimize

```text
1. Use cached IDs everywhere.
2. Set CONFLUENCE_BASE and CONFLUENCE_AUTH variables at the start of each bash session.
3. Use jq for parsing and transforming JSON responses.
4. Write large page bodies to temp files and use -d @/tmp/file.json.
5. Always fetch current version before updating (optimistic locking requires version + 1).
6. Use body-format=storage query parameter to get page content.
7. Combine read + extract into single pipelines where possible.
8. Request only what you need: omit body-format when you only need metadata.
```

---

## Gotchas

1. **Version bumping is mandatory.** Every update must include `version.number` set to current + 1. Fetch the current version first.
2. **Storage format is XHTML, not HTML.** Self-closing tags must use `/>`. Confluence-specific macros use `ac:` and `ri:` namespaces.
3. **CQL search uses v1 endpoint** (`/rest/api/content/search`), not v2. Page CRUD uses v2 (`/api/v2/pages`).
4. **Short links leak credentials.** Never use `curl -L -u` with `/wiki/x/` short links. Resolve the redirect separately.
5. **Auth is Basic auth**, not bearer tokens. Format: `-u "email:$JIRA_API_TOKEN"`.
6. **Always use `-G` with `--data-urlencode` for GET requests** to ensure proper URL encoding of CQL and other parameters.
7. **Page titles must be unique within a space.** Creating a page with a duplicate title will fail.
8. **`parentId` should always be set on create.** Otherwise the page lands directly under the space homepage, cluttering the top level.
9. **Large page bodies** should be written to a temp file and passed with `-d @file.json` to avoid shell escaping issues.
10. **Storage format may contain Confluence macros** (`ac:structured-macro`) that are opaque to simple text processing. When reading pages, decide whether to strip or preserve macros based on the user's intent.
11. **Pagination.** List and search endpoints return paginated results. Check for `_links.next` in the response. Use `cursor` parameter for v2 or `start`/`limit` for v1 to paginate.
