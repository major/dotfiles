#!/usr/bin/env python3
"""Check unicode/ASCII art for uneven box widths and risky glyphs.

Usage:
    check_art.py FILE [--max-width N]
    check_art.py DOC.md [--max-width N]
    some-command | check_art.py -

A .md file is checked block by block: each fenced block with box-drawing or
risky glyphs is checked, and line numbers refer to the Markdown file. A fence
whose info string includes the word `bad` (for example ```text bad) is skipped,
so deliberately bad examples can stay in a document.
Exit code 0 means clean, 1 means problems were found.
"""

import argparse
import sys
import unicodedata

# Light box-drawing characters render reliably in GitLab, GitHub, Jira, and TUIs.
SAFE_BOX = set("─│┌┐└┘├┤┬┴┼")
# Characters that start or end a box line; used to group lines into boxes.
BOX_EDGES = SAFE_BOX | set("═║╔╗╚╝╠╣╦╩╬━┃┏┓┗┛+|")


def display_width(text):
    """Return the terminal display width of a string.

    Args:
        text: The string to measure.

    Returns:
        The number of columns, counting wide and fullwidth characters as 2
        and combining marks or variation selectors as 0.
    """
    width = 0
    for char in text:
        if unicodedata.combining(char) or char in "\ufe0f\u200d":
            continue
        width += 2 if unicodedata.east_asian_width(char) in "WF" else 1
    return width


def is_risky(char):
    """Tell whether one character often renders with the wrong width.

    Args:
        char: A single character.

    Returns:
        True for non-ASCII characters that are not light box glyphs and are
        wide or ambiguous width, or that are arrows and symbols from U+2190 on.
    """
    if ord(char) < 128 or char in SAFE_BOX:
        return False
    wide = unicodedata.east_asian_width(char) in ("W", "F", "A")
    return wide or ord(char) >= 0x2190


def risky_glyphs(line):
    """Find characters that often render with the wrong width.

    Args:
        line: One line of the diagram.

    Returns:
        A sorted list of risky characters found in the line.
    """
    found = set()
    for char in line:
        if is_risky(char):
            found.add(char)
    return sorted(found)


def box_groups(lines, first_line=1):
    """Group consecutive lines that look like the same box.

    Lines join a group when their last visible character is a box edge and
    they start at the same column. The indent check keeps a lone ASCII arrow
    like `|` under a box from being treated as part of that box.

    Args:
        lines: All lines of the diagram.
        first_line: The file line number of the first line.

    Returns:
        A list of groups, each a list of (line_number, line) tuples.
    """
    groups, current, indent = [], [], None
    for number, line in enumerate(lines, first_line):
        stripped = line.rstrip()
        line_indent = display_width(stripped) - display_width(stripped.lstrip())
        is_edge = bool(stripped) and stripped[-1] in BOX_EDGES
        if is_edge and line_indent == indent:
            current.append((number, stripped))
            continue
        if len(current) > 1:
            groups.append(current)
        current = [(number, stripped)] if is_edge else []
        indent = line_indent if is_edge else None
    if len(current) > 1:
        groups.append(current)
    return groups


def fenced_blocks(text):
    """Find the fenced code blocks in Markdown text.

    Args:
        text: The full Markdown document.

    Returns:
        A list of (first_line, info, lines) tuples, where first_line is the
        file line number of the block's first content line and info is the
        text after the opening fence, such as "text bad". An unclosed fence
        at the end of the file is ignored.
    """
    blocks, current, info, first_line = [], None, "", 0
    for number, line in enumerate(text.splitlines(), 1):
        if not line.startswith("```"):
            if current is not None:
                current.append(line)
        elif current is None:
            current, info, first_line = [], line[3:].strip(), number + 1
        else:
            blocks.append((first_line, info, current))
            current = None
    return blocks


def has_art(lines):
    """Tell whether a block looks like art rather than code or commands.

    A block is art if it has a light box glyph or any glyph that is_risky
    flags, such as double or heavy lines. Plain ASCII code and shell
    commands are not art and are skipped in Markdown mode.

    Args:
        lines: The lines of one fenced block.

    Returns:
        True if any character is a SAFE_BOX glyph or a risky glyph.
    """
    return any(char in SAFE_BOX or is_risky(char) for line in lines for char in line)


def check(lines, max_width, first_line=1):
    """Collect all problems in a diagram.

    Args:
        lines: All lines of the diagram.
        max_width: Largest allowed display width for any line.
        first_line: The file line number of the first line.

    Returns:
        A list of human-readable problem strings.
    """
    problems = []
    for number, line in enumerate(lines, first_line):
        width = display_width(line.rstrip())
        if width > max_width:
            problems.append(f"line {number}: width {width} exceeds {max_width}")
        glyphs = risky_glyphs(line)
        if glyphs:
            problems.append(f"line {number}: risky glyphs {' '.join(glyphs)}")
    for group in box_groups(lines, first_line):
        widths = {n: display_width(text) for n, text in group}
        expected = max(set(widths.values()), key=list(widths.values()).count)
        for number, width in widths.items():
            if width != expected:
                problems.append(
                    f"line {number}: box edge at column {width}, others at {expected}"
                )
    return problems


def check_markdown(text, max_width):
    """Check every fenced block in a Markdown document that has box glyphs.

    Args:
        text: The full Markdown document.
        max_width: Largest allowed display width for any line.

    Blocks whose info string includes the word "bad" are skipped.

    Returns:
        A list of problem strings, with line numbers from the Markdown file.
    """
    problems = []
    for first_line, info, lines in fenced_blocks(text):
        if "bad" in info.split() or not has_art(lines):
            continue
        problems.extend(check(lines, max_width, first_line))
    return problems


def main():
    """Parse arguments, run the checks, and print the results.

    Returns:
        The process exit code.
    """
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("file", help="file to check, or - for stdin")
    parser.add_argument("--max-width", type=int, default=80)
    args = parser.parse_args()
    if args.file == "-":
        text = sys.stdin.read()
    else:
        with open(args.file, encoding="utf-8") as handle:
            text = handle.read()
    if args.file.endswith(".md"):
        problems = check_markdown(text, args.max_width)
    else:
        problems = check(text.splitlines(), args.max_width)
    for problem in problems:
        print(problem)
    print("OK" if not problems else f"{len(problems)} problem(s) found")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
