"""MkDocs hook: renders mcp-tools.json (npm run generate, checked in CI) in place of the <!-- tools --> marker of docs/reference/mcp-tools.md:
each tool with its description, its hints, and what it takes and returns as nested lists of fields, generated from the tools' own schemas so
the page says what a client is told."""

import html
import json
from pathlib import Path

MARKER = "<!-- tools -->"
DATA = Path(__file__).resolve().parents[1] / "mcp-tools.json"
HINTS = {"readOnlyHint": "read-only", "destructiveHint": "may remove", "idempotentHint": "idempotent"}


def esc(text):
    # Descriptions go into Markdown: HTML escaped, and nothing that would start emphasis or a link by accident.
    return html.escape(text, quote=False).replace("*", "\\*").replace("_", "\\_").replace("[", "\\[")


def kind(s):
    """A schema's type in words: string, number, one of a list, a list of …, an object, or the alternatives."""
    if "enum" in s:
        return "one of " + ", ".join(f"`{v}`" for v in s["enum"])
    if "const" in s:
        return f"`{s['const']}`"
    if "anyOf" in s:
        parts = [kind(a) for a in s["anyOf"]]
        return " or ".join(dict.fromkeys(parts))
    t = s.get("type")
    if t == "array":
        return "list of " + kind(s.get("items", {}))
    if t == "object" and "properties" not in s and isinstance(s.get("additionalProperties"), dict):
        return "map to " + kind(s["additionalProperties"])
    if isinstance(t, list):
        return " or ".join(t)
    return t or "any"


def children(s):
    """The fields nested in a schema: an object's own, a list's items', or each object alternative's."""
    if s.get("type") == "array":
        return children(s.get("items", {}))
    if "anyOf" in s:
        objects = [a for a in s["anyOf"] if a.get("type") == "object" and a.get("properties")]
        if len(objects) == 1:
            return children(objects[0])
        return [(f"*variant {i + 1}*", a, False) for i, a in enumerate(objects)] if objects else []
    if s.get("type") == "object" and "properties" not in s and isinstance(s.get("additionalProperties"), dict):
        return children(s["additionalProperties"])
    required = set(s.get("required", []))
    return [(f"`{name}`", sub, name in required) for name, sub in s.get("properties", {}).items()]


def fields(s, depth=0):
    lines = []
    for label, sub, required in children(s):
        what = kind(sub) if not label.startswith("*variant") else "object"
        note = f" — {esc(sub['description'])}" if sub.get("description") else ""
        lines.append(f"{'    ' * depth}- {label} ({what}{', required' if required else ''}){note}")
        lines.extend(fields(sub, depth + 1))
    return lines


def render(data):
    out = []
    for t in data["tools"]:
        hints = [word for key, word in HINTS.items() if t.get("annotations", {}).get(key)]
        takes = fields(t["inputSchema"]) or ["Nothing."]
        returns = fields(t["outputSchema"]) or ["Nothing."]
        out += [
            f"## {t['name']}",
            "",
            esc(t["description"]),
            "",
            *([f"*{', '.join(hints)}*", ""] if hints else []),
            '=== "Takes"',
            "",
            *("    " + line for line in takes),
            "",
            '=== "Returns"',
            "",
            *("    " + line for line in returns),
            "",
        ]
    return "\n".join(out)


def on_page_markdown(markdown, page, config, files):
    if MARKER not in markdown:
        return markdown
    return markdown.replace(MARKER, render(json.loads(DATA.read_text())))
