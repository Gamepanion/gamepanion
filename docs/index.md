---
hide:
  - navigation
  - toc
---

<div class="ql-hero" markdown>

![](assets/icon.svg){ .ql-hero__mark }

# Play on. Your Gamepanion remembers.

<p class="ql-hero__lead">Gamepanion is a spoiler-free companion for the games you play: your quests, build and items. You tell Claude while you play; when you come back, Claude tells you what you left open. It only ever shows what you have already found.</p>

[Set it up](self-hosting/configuration.md){ .md-button .md-button--primary }
[What it stands for](values.md){ .md-button }

</div>

## How it works

<!-- chat-example how-it-works -->

Read it from the top: you tell Claude what happened, Claude files it in your Gamepanion (record), and when you come back it gives you the briefing, with only what you found.

More examples: [what it looks like](examples.md), from a screenshot of your stats to a hint you asked for.

- **Capture by talking.** Claude files each play session through Gamepanion's built-in MCP endpoint: your words as you said them, the quests you started or finished, your stats, your build and the items you found.
- **"Where was I?"** A briefing gives you the last session, the open quests with their next steps, your current build and what is equipped.
- **No spoilers.** Every quest entry and item has a spoiler level, and one function decides what you see. Hints show only when you ask for them, behind a warning.
- **Your log is yours.** Everyone who signs in has their own games and playthroughs; nobody else on the instance sees them.
- **Any game.** Stat names and inventory groups are data, kept in the game's own language next to the English.
- **One container.** Next.js and SQLite on your own server; nothing calls home.
