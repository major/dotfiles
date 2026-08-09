# Atlassian Document Format

Jira descriptions, comments, and other rich-text fields render Atlassian Document Format JSON, not Markdown.
Plain strings work for a single short sentence, but use file-based ADF payloads for anything with structure.

## Common mistake: Markdown is not auto-converted

`workitem comment create/update --body`, `-b`, and `--body-file` all accept **plain text or literal ADF JSON** — there is no Markdown-to-ADF conversion step.
Writing a Markdown file (with `##` headings, `**bold**`, fenced code blocks, `[text](url)` links) and passing it via `--body-file` posts that Markdown source as a literal plain-text comment: `##` shows up as `##`, ``` ``` ``` fences collapse to `...`, and `[text](url)` shows as bracket-and-paren text instead of a hyperlink.

If a comment needs headings, bold, code blocks, bullet lists, or links, always build an ADF document (see below) and pass it via `--body-adf`. There is no shortcut flag that accepts Markdown directly.

After posting, verify the rendering — `comment list --json` echoes a flattened plain-text rendering of the ADF body, so it will not visibly catch a bad plain-text post. Prefer `workitem view --key KEY --web` (or ask the user to glance at the ticket) to confirm formatting actually rendered.

## Minimal document shape

```json
{
  "type": "doc",
  "version": 1,
  "content": [
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Example description." }
      ]
    }
  ]
}
```

## File-based description write

```bash
mkdir -p /tmp/opencode
python3 - <<'PY'
import json
from pathlib import Path
doc = {
    'type': 'doc',
    'version': 1,
    'content': [{'type': 'paragraph', 'content': [{'type': 'text', 'text': 'Example description.'}]}],
}
Path('/tmp/opencode/description.adf.json').write_text(json.dumps(doc, indent=2))
PY
acli jira workitem edit --key PROJ-123 --description-file /tmp/opencode/description.adf.json --json
```

## Comment ADF (headings, bold, code blocks, links, bullet lists)

`workitem comment create`/`update` take `--body-adf <file>` for a full ADF document — same document shape as descriptions.
Build it in Python rather than hand-writing JSON once it needs more than a paragraph or two; a small set of node-builder helpers keeps it readable:

```bash
mkdir -p /tmp/opencode
python3 - <<'PY'
import json

def text(t, marks=None):
    n = {"type": "text", "text": t}
    if marks:
        n["marks"] = marks
    return n

def link(t, href):
    return text(t, marks=[{"type": "link", "attrs": {"href": href}}])

def code(t):
    return text(t, marks=[{"type": "code"}])

def bold(t):
    return text(t, marks=[{"type": "strong"}])

def para(*content):
    return {"type": "paragraph", "content": list(content)}

def heading(level, t):
    return {"type": "heading", "attrs": {"level": level}, "content": [text(t)]}

def codeblock(t, language=None):
    node = {"type": "codeBlock", "content": [text(t)]}
    if language:
        node["attrs"] = {"language": language}
    return node

def bullet_list(*item_content_tuples):
    return {
        "type": "bulletList",
        "content": [
            {"type": "listItem", "content": [para(*c)]} for c in item_content_tuples
        ],
    }

doc = {
    "type": "doc",
    "version": 1,
    "content": [
        heading(2, "Section title"),
        para(text("Plain sentence with a "), code("bsh"), text(" inline code span and "), bold("bold text"), text(".")),
        para(link("job 58031599", "https://gitlab.cee.redhat.com/lightwell/balor-fianna/-/jobs/58031599")),
        codeblock("[ERROR] example compiler output"),
        bullet_list(
            (text("first bullet"),),
            (link("second bullet as a link", "https://example.com"),),
        ),
    ],
}

with open("/tmp/opencode/comment.adf.json", "w") as f:
    json.dump(doc, f, indent=2)
PY
acli jira workitem comment create --key PROJ-123 --body-adf /tmp/opencode/comment.adf.json
# Updating an existing comment uses the same flag:
acli jira workitem comment update --key PROJ-123 --id 10001 --body-adf /tmp/opencode/comment.adf.json
```

## Generated JSON workflow

```bash
mkdir -p /tmp/opencode
acli jira workitem edit --generate-json > /tmp/opencode/edit-workitem.json
# Edit /tmp/opencode/edit-workitem.json with the ADF document in the appropriate field.
acli jira workitem edit --from-json /tmp/opencode/edit-workitem.json --json
```

## Validation warning

`python3 -m json.tool file.json` and `jq empty file.json` only validate JSON syntax.
They do not validate Jira ADF semantics or field compatibility.
