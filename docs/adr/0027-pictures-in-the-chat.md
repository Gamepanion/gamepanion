---
status: accepted
date: 2026-11-09
decision-makers: Marcel Bruckner
---

# Pictures in the chat go to Claude once and are never kept

## Context and Problem Statement

Players want to show the in-app chat (ADR 0013) a screenshot: their stats, an item's numbers, the quest log, faster than typing them. Over MCP this works already: the player's own Claude sees the picture, and the instructions tell it to write what it shows into `record`. The in-app chat took text only. notefeed takes pictures too, but it stores them and serves them to anyone with the read link, so it shrinks them in the browser and decodes, re-encodes and strips them on the server (its ADR 0049). Gamepanion's chat only has to hand a picture to Claude.

## Decision Drivers

* Nothing new to keep: the conversation lives on the player's device (ADR 0013) and the log keeps words, not files.
* No image decoder on the server: a crafted file must not reach one.
* Cost on the hosted-AI plan (ADR 0024): a picture is about 1 600 input tokens, and every round of the tool loop resends the conversation.
* No location or camera data leaves the device.

## Considered Options

* **Shrunk in the browser, sent with its message only, never stored.**
* Uploaded whole and shrunk on the server, like freundebuch's shared files (its ADR 0014 and 0017): it takes the original at up to 15 MB, makes it a WebP with `sharp` (HEIC through libheif in WebAssembly), keeps it until it is reviewed and hands it to any Claude through its MCP `inbox`. freundebuch needs that: its files also come from an iPhone Shortcut and an Android share page, with no browser to shrink them, and they wait on the server for MCP clients to fetch. Gamepanion's pictures come only from the chat in a browser and go to Claude at once, so the original and its EXIF need not reach the server at all.
* Stored on the server with the session, like notefeed's images.
* Sent again with every later message, so Claude can look back at it.

## Decision Outcome

Chosen: **shrunk in the browser, sent with its message only, never stored.**

* The chat takes a picture from the attach button, a paste or a drop: at most four per message. The browser draws it to fit 1 568 pixels on its longer edge (the most Claude looks at without scaling it itself), upright as its EXIF says, and encodes it again as JPEG, which writes no EXIF, GPS or other metadata.
* `POST /api/chat` takes them as base64 (`image/jpeg`, `png`, `webp` or `gif`, at most 2 000 000 characters each) on the player's latest turn only and refuses them on any other. The server decodes nothing: it hands them to the Claude API as image blocks before the message's words.
* An earlier message that had pictures reaches Claude as a note that it had them and no longer has them; the device keeps only their number, and the session's transcript marks them as `[picture]`. The chat's rules tell Claude to put what a picture shows into `record` with the message it came with.

* Pictures exist only on `/api/chat`, which takes the session cookie alone. `/api/v1` and MCP take no pictures: over MCP the player's own Claude reads a screenshot itself and files what it shows with `record`, and a script on REST does the same with its own model. Taking pictures there would run a vision model on the operator's key for any API client.
* A share-from-the-phone inbox for screenshots, filed later, would be a feature of its own (server-side shrinking, storage until review, an MCP tool), decided in its own ADR.

### Consequences

* Good: no file storage, no decoder, no metadata leaving the device, and a picture costs its tokens once.
* Good: what Claude read off a picture is in the log as words, like everything else.
* Bad: Claude cannot look at an earlier picture again; the player sends it again when it matters.
* Bad: the server trusts the browser to shrink; a script with a session cookie can send a larger picture, bounded by the 2 000 000-character cap. A browser that can't read a format (HEIC outside Safari) says the picture couldn't be read.
* Neutral: the picture is processed by Anthropic like the rest of the conversation; the operator's privacy policy says so.
