"""MkDocs hook: renders third-party-licenses.json (npm run licenses, made in the docs build, #48) as the list of the packages Gamepanion ships, in place of the
<!-- licenses --> marker of docs/reference/licenses.md: name, version, license and repository, the license's text folded away.

Every piece of text from the data file is escaped; the markup has no blank lines (a blank line would end the raw HTML block).
"""

import html
import json
from pathlib import Path

MARKER = "<!-- licenses -->"
DATA = Path(__file__).resolve().parents[1] / "third-party-licenses.json"


def render(packages: list[dict]) -> str:
    rows = []
    for p in packages:
        name = html.escape(p["name"])
        version = html.escape(p.get("version") or "")
        lic = html.escape(p.get("license") or "?")
        repo = p.get("repository") or ""
        link = f'<p><a href="{html.escape(repo, quote=True)}">{html.escape(repo)}</a></p>' if repo.startswith("https://") else ""
        text = f"<pre>{html.escape(p['text'])}</pre>" if p.get("text") else ""
        rows.append(f"<details class=\"gp-license\"><summary><strong>{name}</strong> {version} · {lic}</summary>{link}{text}</details>")
    return "\n".join(rows)


def on_page_markdown(markdown, page, config, files):
    if MARKER not in markdown:
        return markdown
    return markdown.replace(MARKER, render(json.loads(DATA.read_text())))
