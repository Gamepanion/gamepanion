---
status: accepted
date: 2026-11-04
decision-makers: Marcel Bruckner
---

# Exporting the log and deleting the account

## Context and Problem Statement

ADR 0023 promises that reading, exporting and deleting the account are always free, and the GDPR gives players both rights (Art. 17 and 20). Until #106 neither existed in the app: Better Auth's `deleteUser` was off, there was no export, and the privacy policy sent players to the privacy address instead. Two questions needed an answer: how much an export may show, given that every read hides spoilers (values V1, ADR 0005), and which surfaces may delete an account.

## Considered Options

* **Export everything through the gate at `full`, on MCP, REST and the account page; delete only on the account page, confirmed by a mailed code.**
* Export only what the playthrough's spoiler setting shows.
* Delete over MCP too, with the code.

## Decision Outcome

Chosen: **the first**.

* **The export** is one JSON document, one list per table of the log (games, playthroughs with their settings, sessions with their transcripts, quests and entries, build plans, goals, stat snapshots, items, codex, item uses, tags, tag links, background, to-dos), read through `seen()` with `full`: it is the player's own log, and an export that left out the hints they filed wouldn't be their data. Left out: the search index (built from the rest), the stored Anthropic key and the chat's daily counter. It is the MCP tool `export`, `GET /api/v1/export` and the account page's "Download my data" (`/account/export`, by the session cookie). The tool's `next` tells Claude not to read any of it out (V1 still holds for what Claude says). The in-app chat doesn't get the tool: it would put the whole log in the chat's context for a download that sits on the account page anyway. Frozen games are part of it (ADR 0023).
* **Deleting** is on the account page only: a connected Claude, or a script with an API token, must not be able to delete an account. Better Auth's `user.deleteUser`: where the instance mails codes, `sendDeleteAccountVerification` mails a code and a link, valid for an hour; without mail, a session signed in within the last day (Better Auth's `freshAge`) suffices. Before the user goes, `beforeDelete` cancels every running subscription at the provider; when that fails nothing is deleted. The existing `user.delete.after` hook (ADR 0004) deletes the log, the stored key and the billing rows. The page says that backups keep the data for up to 31 more days.

### Consequences

* Good, because both rights work without writing to anyone, on every tier.
* Good, because no token, MCP or REST, can delete an account.
* Bad, because the mailed code is Better Auth's 32-character token, pasted rather than typed; the link in the same mail is the quicker way.
* Neutral: the operator's privacy policy and terms (gamepanion/stacks) now point to the account page instead of the privacy address.
