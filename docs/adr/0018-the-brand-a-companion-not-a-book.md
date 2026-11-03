---
status: accepted
date: 2026-11-03
decision-makers: Marcel Bruckner
---

# The brand: a companion, not a book

## Context and Problem Statement

ADR 0017 named the product after what sets it apart, the companion you talk to while you play. The app showed something else: an almanac, with a cover, endpapers, ribbons, a register and a bookplate (#61, #62), and a tagline that called it a quest log. Name, picture and words pointed three ways (#63). Before the hosted offer and more UI build on it, the brand needs one idea and one look.

## Considered Options

* **A companion and the human view into what it filed**, drawn as a modern game app.
* Keeping the almanac and making the companion its keeper.
* A game's pause menu as the picture (quests, character, inventory, codex).
* No picture at all: a calm, content-first app.

For the look, four style tiles were compared: Ember on night, Teal campfire, Violet arcade and Quiet graphite.

## Decision Outcome

Chosen: **a companion**, because it is what the name already says and what the player actually does: they talk to Claude or the in-app chat, and Gamepanion files it. The web app is the human view into what was filed and needs no picture of its own. The book goes completely.

* **Look: Violet arcade.** Dark first with the light theme kept, a near-black ground, one violet accent, lime for what's done, Atkinson Hyperlegible Next set heavy, sharp corners and a hard offset shadow. Gamelog (ADR 0017's neighbour with a different job) was the reference for the energy; its electric blue is avoided so the two can't be mistaken.
* **Voice:** the copy speaks of "your Gamepanion", never "we" or "I"; "I" in the chat is Claude. Gamepanion has no persona of its own.
* **Slogan:** "Play on. Your Gamepanion remembers." / "Spiel weiter. Dein Gamepanion merkt es sich." **Plain line:** "A spoiler-free companion for the games you play." / "Ein spoilerfreier Begleiter für die Spiele, die du spielst."
* **Logo:** the wordmark "Game" in the text colour and "panion" in a soft violet tint; the icon a violet speech bubble holding a blocky G, with a lime offset shadow where it is large enough.
* **Games show as generated tiles** (initials on a colour from the name). Cover art would mean fetching from a game database, against ADR 0008 and V7; it gets its own decision if it comes.

The rules for using all of this are in `docs/internals/brand.md`.

### Consequences

* Good, because the name, the pictures and the words say one thing.
* Good, because the look is a game app players recognise, and stays readable (Atkinson, contrast checked, colour never the only meaning).
* Bad, because the almanac pages, cover, bookplate and their copy (#61, #62) are rebuilt (#68).
* Neutral: German keeps "Questlog" as the name of the quests part (ADR 0017); it just stops naming the product.
