---
status: accepted
date: 2026-11-10
decision-makers: Marcel Bruckner
---

# Tool results carry what the question needs

## Context and Problem Statement

Every result Claude reads costs tokens, again on every round of the conversation. Measured on a real log (Lies of P, 97 items, 38 codex entries), `item` without a name returned 102 000 characters, more than a client like Claude Code shows at all, and every read carried the whole game: its notes, its references with their facts and its inventory groups. Most of a list was descriptions, background lines and sources nobody asked for, a link per row, and hundreds of `null` and `[]`.

## Considered Options

* Split the large tools into smaller ones.
* Keep the tools, and make their results carry what the question needs (chosen).

## Decision Outcome

Chosen: **the same tools, smaller results.** Splitting would not shrink a result, and `record` must stay one call per session.

* **A short playthrough** in every result but `briefing`: id, label, status, language, character, settings, the game's id and title, and the link. The game's notes, references and inventory groups come with `briefing`; `item` and `codex` name the references in their `next`, where Claude looks things up.
* **Short lists:** `item` and `codex` without a name, with more than five rows, give each row in short (`detail: false`): an item's name, kind, count and verdict; an entry's kind, status, place, weaknesses and resistances. A row has no link, says nothing of being equipped (`equipped` lists that) and names its spoiler level only above `none`. By name, or with five rows or fewer, they come whole, and `next` says so.
* **No empty fields** in the text Claude reads, over MCP and in the in-app chat (`backend/compact.ts`). The structured result, which follows the output schema, and the REST API keep every field.

Measured on the same log, as Claude reads it: `item` without a name 102 000 → 23 000 characters, `codex` 43 500 → 11 900, one item by name 12 700 → 8 800, `open_threads` 28 000 → 24 700, `briefing` 22 600 → 21 300.

### Consequences

* Good: a whole inventory fits a client again, and every read costs less on every round.
* Good: no tool, input or REST route changed.
* Bad: Claude makes a second call for the numbers or the link of an item in a long list.
* Neutral: `open_threads` still gives each quest's whole log; shortening it is a question of its own.
