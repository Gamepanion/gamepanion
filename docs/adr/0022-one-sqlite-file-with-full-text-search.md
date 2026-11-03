---
status: accepted
date: 2026-11-03
decision-makers: Marcel Bruckner
---

# One SQLite file, with full-text search

## Context and Problem Statement

Gamepanion keeps everything in one SQLite file (`gamepanion.sqlite`, better-sqlite3 and kysely), as the engineering conventions say. Its data is becoming a web of links: quests with givers and places, codex entries linked from items and quests, goals that point at items, tags across groups, to-dos about any of these (ADR 0020). And Claude often names things with the player's words, not an id: a partial name, a German name, a description. Is a graph database, vector search, or SQLite as it is the right store (#55)?

## Decision Drivers

* The questions Gamepanion answers: `briefing`, `open_threads`, `missed`, `item`, `codex`, the in-app chat's context. Each walks one or two links (quest → entries, item → codex entries it works on, to-do → what it is about), never a deep or variable path.
* V7: a self-hosted instance calls nowhere. Embeddings would need a local model next to the app.
* One file on one volume: backups, export and deleting an account (#48: never hold data hostage) stay one operation.
* The one gate (`seen()`, ADR 0005) is our code, and every read must go through it.

## Considered Options

* **SQLite as it is, with FTS5 full-text search** for finding things from the player's words.
* A graph database (Neo4j, Memgraph, ArcadeDB; Kuzu is archived) next to or instead of SQLite.
* A graph layer on SQLite (TypeGraph).
* Vector search: `sqlite-vec` in the same file, or a separate store.

## Decision Outcome

Chosen: **SQLite as it is, with FTS5**, because every question Gamepanion answers is a join or two with link tables, which SQLite answers at game-guide scale, and the one real gap, matching the player's words to a row, is what full-text search does without embeddings.

* Links stay link tables (`item_uses`, `tag_links`, `todos.what/row_id`), walked with joins, and recursive CTEs where a walk ever needs depth.
* **FTS5:** `search_index` (migration `012_search`) holds the names, local names and descriptions of quests, items and codex entries, with each row's player and playthrough; triggers keep it in step on insert, rename, re-description and delete. `backend/search.ts` returns ranked candidates (BM25, names weighted above descriptions): every word as a prefix first, else any word. The index query is scoped to the player, and every candidate is read again through `seen()` at the read's spoiler level, so search can't get around the gate.
* **Where it is used:** as a fallback when the exact name finds nothing: the `item` and `codex` tools (one match is used; several come back as `candidates` with a `next` asking the player), and the writes that need an existing row by name (`against`, an item goal's item, a to-do's `about`: one match is used, several are an `ambiguous` refusal naming them). A quest, item or codex entry `record` starts under a new name stays new, as before; `next` names existing ones the name resembles. It never picks between several (V4).
* Ruled out for now: graph databases (another server to run and back up, a second gate), TypeGraph (a second query layer and a data migration for queries we don't have), vector search (embeddings need a model; V7).

### Consequences

* Good, because the store, backups, export and account deletion stay one file, and the gate stays one function.
* Good, because "the puppet sword" or a German name finds what the player meant, or asks.
* Bad, because full text matches words, not meaning: "the boss with the bell" finds nothing unless those words are filed.
* Neutral: the index costs a little space and a trigger per write.

### Confirmation

`backend/search.test.ts`, and assertions in `spoilers.test.ts` and `isolation.test.ts`, check matching, candidates, renames and deletes, and the gate.

## More Information

Revisit when a real query is measured too slow on a real log, or when matching by meaning is needed that full text can't do. If the answer holds for every app, it belongs in the engineering conventions (a separate issue there).
