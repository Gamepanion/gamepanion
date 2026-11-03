---
status: accepted
date: 2026-11-03
decision-makers: Marcel Bruckner
---

# A switcher and tabs, not sideways pages

## Context and Problem Statement

The web app was a row of pages (#12): your games first, then one page per playthrough, swiped sideways on a phone and turned with the arrow keys on a desktop, with page markers at the bottom. Inside a playthrough, the register's tabs switched parts of the page on the client, and a link to a quest, an item or a codex entry was `/p/<id>#quest-…`.

On a phone that meant two ways to move at once: a sideways swipe turned the page, the tabs changed the part, and the two fought (a swipe in the tab row, the tag chips that had to wrap rather than scroll). The page markers were the only sign of where you were, and with three or four playthroughs they said little. ADR 0018 dropped the book as the picture ("a companion, not a book"); the pages were the last of it (#72).

## Considered Options

* **A playthrough switcher in the header, and an address per tab.**
* Keeping the sideways pages and adding a title bar that names the page.
* A sidebar listing the playthroughs, from a tablet up, and the pages on a phone.

## Decision Outcome

Chosen: **a switcher and an address per tab**, because it leaves one way to move between playthroughs (the switcher) and one within a playthrough (the tabs), and says where you are in words at the top of every page.

* **The switcher** shows the playthrough you are on (its game tile, title and label) or "Your games", and opens a menu: Home, then the playthroughs grouped by game, latest first, and a folded "Finished" group with the finished and dropped ones. It is a menu button (ARIA practices): arrows move, Enter opens, Escape closes and returns focus.
* **One address per tab:** `/p/<id>` is the Overview; `/p/<id>/quests`, `/character`, `/items`, `/codex`, `/sessions`, `/notes`, `/settings` the others. A tab is a link, so back and forward work and reload keeps it. Only the open tab is rendered.
* **Links to things** open their tab and scroll to the row: `/p/<id>/quests#quest-…`, `/items#item-…`, `/codex#codex-…`. The path builders in `backend/urls.ts` hand these out, so MCP, REST and the pages agree.
* **Tab order** Overview, Quests, To-dos, Character, Items, Codex, Sessions, Notes, Sources, Settings, with room for ten: two rows of five on a phone, one row from a tablet up.
* **No backwards compatibility:** the old fragment links and the page addresses are replaced, without redirects.

### Consequences

* Good, because there is one gesture less on a phone and nothing fights the tabs.
* Good, because every tab can be linked, bookmarked and reloaded.
* Bad, because moving between playthroughs takes two taps instead of a swipe.
* Bad, because links handed out before this change open the Overview instead of the row they named.
