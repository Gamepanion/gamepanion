---
status: accepted
date: 2026-11-03
decision-makers: Marcel Bruckner
---

# Players' own Anthropic keys

## Context and Problem Statement

The in-app chat (ADR 0013) runs on the operator's Anthropic key, so every message costs the instance money, while Claude through the connector runs on the player's own plan (#56). A player who has an Anthropic API key should be able to run the chat on it (#76). That means storing a secret that isn't ours, on a server that may be someone's homelab, without it ever passing through Claude, a transcript or the browser again.

## Considered Options

* **Stored encrypted on the server, pasted on the account page.**
* Kept in the browser only (local storage), sent with every chat message.
* Pasted to Claude in the chat and filed through a tool.

## Decision Outcome

Chosen: **stored encrypted on the server, pasted on the account page** (`/account#key`), because the key then never leaves the server once saved, works on every device the player signs in on, and never appears in a conversation.

* **Storage:** `player_keys` (one row per player, scoped by `player_id` through `seen()` like every table) holds the key encrypted with AES-256-GCM under `GAMEPANION_KEY_ENCRYPTION_KEY` (32 bytes, hex), with the player's id as additional data so a row copied to another player doesn't decrypt, and the key's last four characters in the clear to show which one is stored. Without the setting the feature is off and the account page says so.
* **Never out:** the plaintext is decrypted only in `backend/keys.ts` when the chat calls Anthropic. No page, `/api/v1` response, MCP result or log line carries it; reads say only whether a key is stored and its last four characters.
* **MCP:** a tool `chat_key` returns only the link to `/account#key`, and its `next` tells Claude never to ask for the key in a chat.
* **Which key the chat uses:** the player's when they stored one, otherwise the operator's as before (self-hosted instances keep working unchanged, V7). A player's key Anthropic refuses (invalid, revoked, out of credit) ends the message with a message linking to the key settings; the operator's key is never tried in its place. When the chat is offered on an instance without an operator key, it is for players who stored one. #56 decides later when the operator key may be used at all.
* **Deleting the account** deletes the stored key with the log.

### Consequences

* Good, because a player can use the chat on any instance without the operator paying for it.
* Good, because the key is never in a transcript, a page or the browser after it was pasted.
* Bad, because losing or changing `GAMEPANION_KEY_ENCRYPTION_KEY` makes every stored key unreadable; players then paste theirs again (the chat treats an unreadable key as none).
* Neutral: Anthropic's terms don't address storing players' keys; the operator confirms this with Anthropic once Gamepanion runs as a business (#56).
