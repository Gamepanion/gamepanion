---
status: accepted
date: 2026-11-03
decision-makers: Marcel Bruckner
---

# A to-do list of its own

## Context and Problem Statement

Players keep small things to do while they play that are neither a quest nor a build goal: "farm 5 crystals", "come back to the locked door with the key", "try the boss again with fire" (#54). They ended up in a quest's log, in a goal's note, or nowhere. Goals (ADR 0009) already have a `note` kind, so the question is whether a to-do is another kind of goal or a thing of its own.

## Considered Options

* **A table of its own, `todos`.**
* A goal kind `todo` next to `stat`, `level`, `item` and `note`.

## Decision Outcome

Chosen: **a table of its own**, because a goal is where the player wants to get to and a to-do is an errand. Goals are ranked, reached on their own when a snapshot gets there and dropped when replaced, so the plan keeps its history; a to-do is ticked off when the player says so, in the order it was added, and may be about one quest, item or codex entry ("what's left to do here?"), which no goal kind points at.

* A to-do has the player's words (`text`, `localText` with the game's own names, values V8), an optional link to one quest, item or codex entry, a status `open`, `done` or `dropped`, the session it was added in and the one it was closed in, a `suggested` flag and a spoiler level.
* **Filed through `record`** (`todos`) and fixed through `correct` (`what: "todo"`), MCP first; read back in `briefing`, `open_threads`, on the quest, item and codex entry it is about, at `/api/v1/playthroughs/{id}/todos`, and on its own To-dos tab.
* **Suggested to-dos** are Claude's, shown apart in every read until the player takes one, and carry a spoiler level like a suggested goal (values V1, V4).
* **The gate:** `todos` is a spoiler table in `seen()`. A to-do about a row the read may not show keeps its words and loses the link. Deleting the row unlinks the to-do (a trigger), it stays.
* **Carry-over:** a new playthrough with `carryFrom` takes the open to-dos the player took (not suggested, done or dropped), as it takes open goals. What they point at belongs to the old run, so the copies point at nothing.

### Consequences

* Good, because goals stay a plan and to-dos a list, each with the rules it needs.
* Good, because "what's left to do here?" is answered on the place, the NPC or the boss.
* Bad, because there is one more thing for Claude to tell apart when filing (a quest, a goal or a to-do); the tool descriptions say which is which.
