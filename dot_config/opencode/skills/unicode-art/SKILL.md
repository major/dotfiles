---
name: unicode-art
description: Draw unicode or ASCII diagrams, boxes, flow charts, and trees that stay aligned in GitLab, GitHub, Jira, and terminals. Use before writing any box-drawing art, flow diagram, or tree in a ticket, MR/PR, doc, comment, or chat reply. Includes a width and glyph checker script.
---

# Unicode art

Models write by tokens, not columns, so diagrams drawn by eye drift.
Fonts in web renderers also lack some glyphs and borrow them from other fonts with different widths.
Follow these rules, then run the checker.

## Pick the right format first

| Content | Use |
|---|---|
| Rows and columns of values | Markdown table, never a box |
| Steps or data flow | Small box-and-arrow diagram |
| Files or hierarchy | Tree with `├──` and `└──` |
| Anything that needs more than about 70 columns | Split it, or use a table or a list |

## Glyphs

| Allowed | Do not use in web-rendered content |
|---|---|
| `─ │ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼` | Double lines `═ ║ ╔ ╗ ╚ ╝` |
| ASCII arrows `-->` `<--` `v` `^` | Heavy lines `━ ┃ ┏` |
| Plain ASCII text | `▶ ▼ ◀ ▲ ➤ → ←`, `…`, emoji |

In the opencode TUI the same rules apply. Emoji are fine around a diagram, never inside one.

In Jira, use ASCII only (`.` `'` `-` `|` for boxes): its code font lacks box-drawing glyphs, so they drift.
Avoid `+` in Jira too, even in code blocks: `+text+` becomes underline.

## Layout rules

- Pad every line of a box with spaces so the right edge is in the same column on every line.
- Never truncate text (like `..trigger`) to make it fit. Widen the box or move the label outside.
- Keep one label per line inside a box. Put long notes below the diagram.
- Line up vertical arrows under the exact column of the box they point to.
- Always put the diagram in a fenced code block so the renderer uses a monospace font.

## Check before posting

Write the diagram to a temp file and run:

```bash
~/.config/opencode/skills/unicode-art/check_art.py /path/to/diagram.txt
```

Or pipe it with `-`. Use `--max-width N` to change the 80-column limit.
Fix every reported line and rerun until it prints `OK`.
The checker flags lines that end a box at a different column than their neighbors, risky glyphs, and lines that are too wide.

## Example

Bad (table inside a box, double lines, truncated text):

```
╔═════════════════════════════╗
║ field           java   python ║
║ publish_stage   konflux ..trigger║
╚═════════════════════════════╝
```

Good (a table):

| Field | java | python |
|---|---|---|
| publish_stage | konflux_import | trigger |

Good (flow diagram):

```
┌──────────────────┐     ┌──────────────────────┐
│ resolve_ecosystem│ --> │ stage_capabilities() │
└──────────────────┘     └──────────────────────┘
                                    |
                                    v
                         ┌──────────────────────┐
                         │ registry lookup      │
                         └──────────────────────┘
```
