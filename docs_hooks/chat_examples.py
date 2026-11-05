"""MkDocs hook: renders the example chats of docs/examples.yml in place of the <!-- chat-example <id> --> and <!-- chat-examples -->
markers (the landing page shows one, docs/examples.md all of them). A chat is the window between you and Claude with Gamepanion on a rail
beside it: an arrow wherever Claude uses a tool (into Gamepanion when it files, back out when it reads), and a step of its own where
Claude searches the web. German pages (*.de.md) take each line's `de`.

The markup has no blank lines (a blank line would end the raw HTML block in Python-Markdown) and every piece of text from the data file
is escaped. The icons are lucide's (ADR 0012) and the Claude mark, inlined.
"""

import html
import re
from pathlib import Path

import yaml

DATA = Path(__file__).resolve().parents[1] / "docs" / "examples.yml"
ONE = re.compile(r"<!-- chat-example ([\w-]+) -->")
ALL = "<!-- chat-examples -->"
# Filing points into Gamepanion; everything else reads from it.
INTO = {"record", "correct"}

CLAUDE = '<svg viewBox="0 0 24 24" aria-hidden="true"><g stroke="#d97757" stroke-width="2.1" stroke-linecap="round"><line x1="12.00" y1="9.80" x2="12.00" y2="2.00"/><line x1="13.10" y1="10.09" x2="16.10" y2="4.90"/><line x1="13.91" y1="10.90" x2="20.14" y2="7.30"/><line x1="14.20" y1="12.00" x2="19.60" y2="12.00"/><line x1="13.91" y1="13.10" x2="20.66" y2="17.00"/><line x1="13.10" y1="13.91" x2="16.20" y2="19.27"/><line x1="12.00" y1="14.20" x2="12.00" y2="21.20"/><line x1="10.90" y1="13.91" x2="8.10" y2="18.75"/><line x1="10.09" y1="13.10" x2="3.51" y2="16.90"/><line x1="9.80" y1="12.00" x2="4.00" y2="12.00"/><line x1="10.09" y1="10.90" x2="3.86" y2="7.30"/><line x1="10.90" y1="10.09" x2="8.20" y2="5.42"/></g></svg>'
LUCIDE = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{}</svg>'
HEAD_MARK = CLAUDE.replace("<svg ", '<svg class="gp-chat__claude-mark" ', 1)
YOU = LUCIDE.format('<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>')
GLOBE = LUCIDE.format('<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>')
IMAGE = LUCIDE.format('<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>')

WORDS = {
    "en": {"you": "You", "claude": "Claude", "uses": "Claude uses Gamepanion:", "web": "Claude searches the web", "screenshot": "Screenshot"},
    "de": {"you": "Du", "claude": "Claude", "uses": "Claude nutzt Gamepanion:", "web": "Claude sucht im Web", "screenshot": "Screenshot"},
}


def text(line: dict, key: str, lang: str):
    return line.get("de", line[key]) if lang == "de" else line[key]


def message(line: dict, lang: str) -> str:
    w = WORDS[lang]
    who = "you" if "you" in line else "claude"
    e = html.escape
    shot = f'<span class="gp-chat__shot">{IMAGE}{e(w["screenshot"])}</span>' if line.get("screenshot") else ""
    call = ""
    if line.get("tool"):
        back = "" if line["tool"] in INTO else " gp-chat__call--back"
        call = f'<span class="gp-chat__call{back}"><span class="gp-chat__sr">{e(w["uses"])} </span><span class="gp-chat__tool">{e(line["tool"])}</span></span>'
    return (
        f'<li class="gp-chat__msg gp-chat__msg--{who}"><span class="gp-chat__avatar">{YOU if who == "you" else CLAUDE}</span>'
        f'<p class="gp-chat__bubble"><span class="gp-chat__sr">{e(w[who])}: </span>{shot}{e(text(line, who, lang))}</p>{call}</li>'
    )


def web(line: dict, lang: str) -> str:
    sources = "".join(f"<li>{html.escape(s)}</li>" for s in text(line, "web", lang))
    return f'<li class="gp-chat__web">{GLOBE}<span>{html.escape(WORDS[lang]["web"])}</span><ul>{sources}</ul></li>'


def chat(example: dict, lang: str, root: str, play: bool = False) -> str:
    rows = []
    for line in example["lines"]:
        if "later" in line:
            rows.append(f'<li class="gp-chat__later">{html.escape(text(line, "later", lang))}</li>')
        elif "web" in line:
            rows.append(web(line, lang))
        else:
            rows.append(message(line, lang))
    label = html.escape(example["summary_de"] if lang == "de" else example["summary"], quote=True)
    return (
        f'<figure class="gp-chat{" gp-chat--play" if play else ""}" aria-label="{label}"><div class="gp-chat__window">'
        f'<div class="gp-chat__head">{HEAD_MARK}<span>Claude</span></div>'
        f'<ol class="gp-chat__log">{"".join(rows)}</ol></div>'
        f'<div class="gp-chat__rail"><span class="gp-chat__app"><img src="{root}assets/icon.svg" alt="" width="36" height="36"><span>Gamepanion</span></span></div>'
        "</figure>"
    )


def section(example: dict, lang: str, root: str) -> str:
    title = example["title_de"] if lang == "de" else example["title"]
    summary = example["summary_de"] if lang == "de" else example["summary"]
    return f'<h2 id="{html.escape(example["id"], quote=True)}">{html.escape(title)}</h2>\n<p>{html.escape(summary)}</p>\n{chat(example, lang, root)}'


def on_page_markdown(markdown, page, config, files):
    if ALL not in markdown and not ONE.search(markdown):
        return markdown
    found = re.search(r"\.(\w+)\.md$", page.file.src_uri)
    lang = found.group(1) if found and found.group(1) in WORDS else "en"
    root = "../" * page.url.count("/")  # the page's way back to the site's root, for the icon
    examples = yaml.safe_load(DATA.read_text())["examples"]
    by_id = {x["id"]: x for x in examples}

    def one(m: re.Match) -> str:
        if m.group(1) not in by_id:
            from mkdocs.exceptions import PluginError

            raise PluginError(f"{page.file.src_uri} asks for the chat example '{m.group(1)}', which docs/examples.yml doesn't have")
        return chat(by_id[m.group(1)], lang, root, play=True)

    markdown = ONE.sub(one, markdown)
    return markdown.replace(ALL, "\n\n".join(section(x, lang, root) for x in examples))


def on_serve(server, config, builder):
    server.watch(str(DATA))  # a change to the data rebuilds the pages
    return server
