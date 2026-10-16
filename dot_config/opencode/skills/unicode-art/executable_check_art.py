#!/usr/bin/env python3
"""Check unicode/ASCII art for uneven box widths and risky glyphs.

Usage:
    check_art.py FILE [--max-width N]
    some-command | check_art.py -

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


def risky_glyphs(line):
    """Find characters that often render with the wrong width.

    Args:
        line: One line of the diagram.

    Returns:
        A sorted list of risky characters found in the line.
    """
    found = set()
    for char in line:
        if ord(char) < 128 or char in SAFE_BOX:
            continue
        if unicodedata.east_asian_width(char) in ("W", "F", "A") or ord(char) >= 0x2190:
            found.add(char)
    return sorted(found)


def box_groups(lines):
    """Group consecutive lines that look like the same box.

    Lines join a group when their last visible character is a box edge and
    they start at the same column. The indent check keeps a lone ASCII arrow
    like `|` under a box from being treated as part of that box.

    Args:
        lines: All lines of the diagram.

    Returns:
        A list of groups, each a list of (line_number, line) tuples.
    """
    groups, current, indent = [], [], None
    for number, line in enumerate(lines, 1):
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


def check(lines, max_width):
    """Collect all problems in a diagram.

    Args:
        lines: All lines of the diagram.
        max_width: Largest allowed display width for any line.

    Returns:
        A list of human-readable problem strings.
    """
    problems = []
    for number, line in enumerate(lines, 1):
        width = display_width(line.rstrip())
        if width > max_width:
            problems.append(f"line {number}: width {width} exceeds {max_width}")
        glyphs = risky_glyphs(line)
        if glyphs:
            problems.append(f"line {number}: risky glyphs {' '.join(glyphs)}")
    for group in box_groups(lines):
        widths = {n: display_width(text) for n, text in group}
        expected = max(set(widths.values()), key=list(widths.values()).count)
        for number, width in widths.items():
            if width != expected:
                problems.append(
                    f"line {number}: box edge at column {width}, others at {expected}"
                )
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
    problems = check(text.splitlines(), args.max_width)
    for problem in problems:
        print(problem)
    print("OK" if not problems else f"{len(problems)} problem(s) found")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
