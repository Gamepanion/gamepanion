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

<figure class="gp-chat" aria-label="Example: you tell Claude what happened, Claude files it in your Gamepanion, and later gives it back">
<div class="gp-chat__window">
<div class="gp-chat__head"><svg class="gp-chat__claude-mark" viewBox="0 0 24 24" aria-hidden="true"><g stroke="#d97757" stroke-width="2.1" stroke-linecap="round"><line x1="12.00" y1="9.80" x2="12.00" y2="2.00"/><line x1="13.10" y1="10.09" x2="16.10" y2="4.90"/><line x1="13.91" y1="10.90" x2="20.14" y2="7.30"/><line x1="14.20" y1="12.00" x2="19.60" y2="12.00"/><line x1="13.91" y1="13.10" x2="20.66" y2="17.00"/><line x1="13.10" y1="13.91" x2="16.20" y2="19.27"/><line x1="12.00" y1="14.20" x2="12.00" y2="21.20"/><line x1="10.90" y1="13.91" x2="8.10" y2="18.75"/><line x1="10.09" y1="13.10" x2="3.51" y2="16.90"/><line x1="9.80" y1="12.00" x2="4.00" y2="12.00"/><line x1="10.09" y1="10.90" x2="3.86" y2="7.30"/><line x1="10.90" y1="10.09" x2="8.20" y2="5.42"/></g></svg><span>Claude</span></div>
<ol class="gp-chat__log">
<li class="gp-chat__msg gp-chat__msg--you"><span class="gp-chat__avatar"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg></span><p class="gp-chat__bubble"><span class="gp-chat__sr">You: </span>Lit the second beacon in the drowned chapel. The ferryman wants three river pearls.</p></li>
<li class="gp-chat__msg gp-chat__msg--claude"><span class="gp-chat__avatar"><svg viewBox="0 0 24 24" aria-hidden="true"><g stroke="#d97757" stroke-width="2.1" stroke-linecap="round"><line x1="12.00" y1="9.80" x2="12.00" y2="2.00"/><line x1="13.10" y1="10.09" x2="16.10" y2="4.90"/><line x1="13.91" y1="10.90" x2="20.14" y2="7.30"/><line x1="14.20" y1="12.00" x2="19.60" y2="12.00"/><line x1="13.91" y1="13.10" x2="20.66" y2="17.00"/><line x1="13.10" y1="13.91" x2="16.20" y2="19.27"/><line x1="12.00" y1="14.20" x2="12.00" y2="21.20"/><line x1="10.90" y1="13.91" x2="8.10" y2="18.75"/><line x1="10.09" y1="13.10" x2="3.51" y2="16.90"/><line x1="9.80" y1="12.00" x2="4.00" y2="12.00"/><line x1="10.09" y1="10.90" x2="3.86" y2="7.30"/><line x1="10.90" y1="10.09" x2="8.20" y2="5.42"/></g></svg></span><p class="gp-chat__bubble"><span class="gp-chat__sr">Claude: </span>Filed: the second beacon is lit, and The Ferryman’s Debt is open.</p><span class="gp-chat__call"><span class="gp-chat__sr">Claude uses Gamepanion: </span><span class="gp-chat__tool">record</span></span></li>
<li class="gp-chat__later">Two days later</li>
<li class="gp-chat__msg gp-chat__msg--you"><span class="gp-chat__avatar"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg></span><p class="gp-chat__bubble"><span class="gp-chat__sr">You: </span>Where was I?</p></li>
<li class="gp-chat__msg gp-chat__msg--claude"><span class="gp-chat__avatar"><svg viewBox="0 0 24 24" aria-hidden="true"><g stroke="#d97757" stroke-width="2.1" stroke-linecap="round"><line x1="12.00" y1="9.80" x2="12.00" y2="2.00"/><line x1="13.10" y1="10.09" x2="16.10" y2="4.90"/><line x1="13.91" y1="10.90" x2="20.14" y2="7.30"/><line x1="14.20" y1="12.00" x2="19.60" y2="12.00"/><line x1="13.91" y1="13.10" x2="20.66" y2="17.00"/><line x1="13.10" y1="13.91" x2="16.20" y2="19.27"/><line x1="12.00" y1="14.20" x2="12.00" y2="21.20"/><line x1="10.90" y1="13.91" x2="8.10" y2="18.75"/><line x1="10.09" y1="13.10" x2="3.51" y2="16.90"/><line x1="9.80" y1="12.00" x2="4.00" y2="12.00"/><line x1="10.09" y1="10.90" x2="3.86" y2="7.30"/><line x1="10.90" y1="10.09" x2="8.20" y2="5.42"/></g></svg></span><p class="gp-chat__bubble"><span class="gp-chat__sr">Claude: </span>At the drowned chapel. Next: three river pearls for the ferryman.</p><span class="gp-chat__call gp-chat__call--back"><span class="gp-chat__sr">Claude uses Gamepanion: </span><span class="gp-chat__tool">briefing</span></span></li>
</ol>
</div>
<div class="gp-chat__rail"><span class="gp-chat__app"><img src="assets/icon.svg" alt="" width="36" height="36"><span>Gamepanion</span></span></div>
</figure>

Read it from the top: you tell Claude what happened, Claude files it in your Gamepanion (record), and when you come back it gives you the briefing, with only what you found.

- **Capture by talking.** Claude files each play session through Gamepanion's built-in MCP endpoint: your words as you said them, the quests you started or finished, your stats, your build and the items you found.
- **"Where was I?"** A briefing gives you the last session, the open quests with their next steps, your current build and what is equipped.
- **No spoilers.** Every quest entry and item has a spoiler level, and one function decides what you see. Hints show only when you ask for them, behind a warning.
- **Your log is yours.** Everyone who signs in has their own games and playthroughs; nobody else on the instance sees them.
- **Any game.** Stat names and inventory groups are data, kept in the game's own language next to the English.
- **One container.** Next.js and SQLite on your own server; nothing calls home.
