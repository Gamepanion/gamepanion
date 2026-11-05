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

<!-- chat-example how-it-works -->

Von oben gelesen: Du erzählst Claude, was passiert ist, Claude legt es in deinem Gamepanion ab (record), und wenn du zurückkommst, gibt es dir das Briefing, mit nur dem, was du gefunden hast.

Mehr Beispiele: [So sieht es aus](examples.md), vom Screenshot deiner Werte bis zum Hinweis, nach dem du gefragt hast.

- **Erzählen statt eintippen.** Claude legt jede Spielsession über Gamepanions eingebauten MCP-Endpunkt ab: deine Worte, wie du sie gesagt hast, die Quests, die du begonnen oder abgeschlossen hast, deine Werte, dein Build und die Gegenstände, die du gefunden hast.
- **„Wo war ich?"** Ein Briefing gibt dir die letzte Session, die offenen Quests mit ihren nächsten Schritten, deinen aktuellen Build und deine Ausrüstung.
- **Keine Spoiler.** Jeder Quest-Eintrag und jeder Gegenstand hat eine Spoiler-Stufe, und eine einzige Funktion entscheidet, was du siehst. Hinweise erscheinen nur, wenn du danach fragst, hinter einer Warnung.
- **Dein Log gehört dir.** Jeder, der sich anmeldet, hat seine eigenen Spiele und Durchläufe; niemand sonst auf der Instanz sieht sie.
- **Jedes Spiel.** Wertenamen und Inventargruppen sind Daten, in der Sprache des Spiels neben dem Englischen.
- **Ein Container.** Next.js und SQLite auf deinem eigenen Server; nichts telefoniert nach Hause.
