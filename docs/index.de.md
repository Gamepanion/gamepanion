---
hide:
  - navigation
  - toc
---

<div class="ql-hero" markdown>

![](assets/icon.svg){ .ql-hero__mark }

# Spiel weiter. Dein Gamepanion merkt es sich.

<p class="ql-hero__lead">Gamepanion ist ein spoilerfreier Begleiter für die Spiele, die du spielst: dein Questlog, dein Build und deine Gegenstände. Du erzählst es Claude beim Spielen; wenn du zurückkommst, sagt dir Claude, was noch offen ist. Es zeigt immer nur, was du schon gefunden hast.</p>

[Einrichten](self-hosting/configuration.md){ .md-button .md-button--primary }
[Wofür es steht](values.md){ .md-button }

</div>

## So funktioniert es

<figure class="gp-chat" aria-label="Beispiel: Du erzählst Claude, was passiert ist, Claude legt es in deinem Gamepanion ab und gibt es dir später zurück">
<div class="gp-chat__window">
<div class="gp-chat__head"><svg class="gp-chat__claude-mark" viewBox="0 0 24 24" aria-hidden="true"><g stroke="#d97757" stroke-width="2.1" stroke-linecap="round"><line x1="12.00" y1="9.80" x2="12.00" y2="2.00"/><line x1="13.10" y1="10.09" x2="16.10" y2="4.90"/><line x1="13.91" y1="10.90" x2="20.14" y2="7.30"/><line x1="14.20" y1="12.00" x2="19.60" y2="12.00"/><line x1="13.91" y1="13.10" x2="20.66" y2="17.00"/><line x1="13.10" y1="13.91" x2="16.20" y2="19.27"/><line x1="12.00" y1="14.20" x2="12.00" y2="21.20"/><line x1="10.90" y1="13.91" x2="8.10" y2="18.75"/><line x1="10.09" y1="13.10" x2="3.51" y2="16.90"/><line x1="9.80" y1="12.00" x2="4.00" y2="12.00"/><line x1="10.09" y1="10.90" x2="3.86" y2="7.30"/><line x1="10.90" y1="10.09" x2="8.20" y2="5.42"/></g></svg><span>Claude</span></div>
<ol class="gp-chat__log">
<li class="gp-chat__msg gp-chat__msg--you"><span class="gp-chat__avatar"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg></span><p class="gp-chat__bubble"><span class="gp-chat__sr">Du: </span>Das zweite Leuchtfeuer in der versunkenen Kapelle brennt. Der Fährmann will drei Flussperlen.</p></li>
<li class="gp-chat__msg gp-chat__msg--claude"><span class="gp-chat__avatar"><svg viewBox="0 0 24 24" aria-hidden="true"><g stroke="#d97757" stroke-width="2.1" stroke-linecap="round"><line x1="12.00" y1="9.80" x2="12.00" y2="2.00"/><line x1="13.10" y1="10.09" x2="16.10" y2="4.90"/><line x1="13.91" y1="10.90" x2="20.14" y2="7.30"/><line x1="14.20" y1="12.00" x2="19.60" y2="12.00"/><line x1="13.91" y1="13.10" x2="20.66" y2="17.00"/><line x1="13.10" y1="13.91" x2="16.20" y2="19.27"/><line x1="12.00" y1="14.20" x2="12.00" y2="21.20"/><line x1="10.90" y1="13.91" x2="8.10" y2="18.75"/><line x1="10.09" y1="13.10" x2="3.51" y2="16.90"/><line x1="9.80" y1="12.00" x2="4.00" y2="12.00"/><line x1="10.09" y1="10.90" x2="3.86" y2="7.30"/><line x1="10.90" y1="10.09" x2="8.20" y2="5.42"/></g></svg></span><p class="gp-chat__bubble"><span class="gp-chat__sr">Claude: </span>Abgelegt: Das zweite Leuchtfeuer brennt, und Die Schuld des Fährmanns ist offen.</p><span class="gp-chat__call"><span class="gp-chat__sr">Claude nutzt Gamepanion: </span><span class="gp-chat__tool">record</span></span></li>
<li class="gp-chat__later">Zwei Tage später</li>
<li class="gp-chat__msg gp-chat__msg--you"><span class="gp-chat__avatar"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg></span><p class="gp-chat__bubble"><span class="gp-chat__sr">Du: </span>Wo war ich?</p></li>
<li class="gp-chat__msg gp-chat__msg--claude"><span class="gp-chat__avatar"><svg viewBox="0 0 24 24" aria-hidden="true"><g stroke="#d97757" stroke-width="2.1" stroke-linecap="round"><line x1="12.00" y1="9.80" x2="12.00" y2="2.00"/><line x1="13.10" y1="10.09" x2="16.10" y2="4.90"/><line x1="13.91" y1="10.90" x2="20.14" y2="7.30"/><line x1="14.20" y1="12.00" x2="19.60" y2="12.00"/><line x1="13.91" y1="13.10" x2="20.66" y2="17.00"/><line x1="13.10" y1="13.91" x2="16.20" y2="19.27"/><line x1="12.00" y1="14.20" x2="12.00" y2="21.20"/><line x1="10.90" y1="13.91" x2="8.10" y2="18.75"/><line x1="10.09" y1="13.10" x2="3.51" y2="16.90"/><line x1="9.80" y1="12.00" x2="4.00" y2="12.00"/><line x1="10.09" y1="10.90" x2="3.86" y2="7.30"/><line x1="10.90" y1="10.09" x2="8.20" y2="5.42"/></g></svg></span><p class="gp-chat__bubble"><span class="gp-chat__sr">Claude: </span>In der versunkenen Kapelle. Als Nächstes: drei Flussperlen für den Fährmann.</p><span class="gp-chat__call gp-chat__call--back"><span class="gp-chat__sr">Claude nutzt Gamepanion: </span><span class="gp-chat__tool">briefing</span></span></li>
</ol>
</div>
<div class="gp-chat__rail"><span class="gp-chat__app"><img src="../assets/icon.svg" alt="" width="36" height="36"><span>Gamepanion</span></span></div>
</figure>

Von oben gelesen: Du erzählst Claude, was passiert ist, Claude legt es in deinem Gamepanion ab (record), und wenn du zurückkommst, gibt es dir das Briefing, mit nur dem, was du gefunden hast.

- **Erzählen statt eintippen.** Claude legt jede Spielsession über Gamepanions eingebauten MCP-Endpunkt ab: deine Worte, wie du sie gesagt hast, die Quests, die du begonnen oder abgeschlossen hast, deine Werte, dein Build und die Gegenstände, die du gefunden hast.
- **„Wo war ich?"** Ein Briefing gibt dir die letzte Session, die offenen Quests mit ihren nächsten Schritten, deinen aktuellen Build und deine Ausrüstung.
- **Keine Spoiler.** Jeder Quest-Eintrag und jeder Gegenstand hat eine Spoiler-Stufe, und eine einzige Funktion entscheidet, was du siehst. Hinweise erscheinen nur, wenn du danach fragst, hinter einer Warnung.
- **Dein Log gehört dir.** Jeder, der sich anmeldet, hat seine eigenen Spiele und Durchläufe; niemand sonst auf der Instanz sieht sie.
- **Jedes Spiel.** Wertenamen und Inventargruppen sind Daten, in der Sprache des Spiels neben dem Englischen.
- **Ein Container.** Next.js und SQLite auf deinem eigenen Server; nichts telefoniert nach Hause.
