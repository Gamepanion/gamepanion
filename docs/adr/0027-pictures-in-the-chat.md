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
* Stored on the server with the session, like notefeed's images.
* Sent again with every later message, so Claude can look back at it.

## Decision Outcome

Chosen: **shrunk in the browser, sent with its message only, never stored.**

* The chat takes a picture from the attach button, a paste or a drop: at most four per message. The browser draws it to fit 1 568 pixels on its longer edge (the most Claude looks at without scaling it itself), upright as its EXIF says, and encodes it again as JPEG, which writes no EXIF, GPS or other metadata.
* `POST /api/chat` takes them as base64 (`image/jpeg`, `png`, `webp` or `gif`, at most 2 000 000 characters each) on the player's latest turn only and refuses them on any other. The server decodes nothing: it hands them to the Claude API as image blocks before the message's words.
* An earlier message that had pictures reaches Claude as a note that it had them and no longer has them; the device keeps only their number, and the session's transcript marks them as `[picture]`. The chat's rules tell Claude to put what a picture shows into `record` with the message it came with.

### Consequences

* Good: no file storage, no decoder, no metadata leaving the device, and a picture costs its tokens once.
* Good: what Claude read off a picture is in the log as words, like everything else.
* Bad: Claude cannot look at an earlier picture again; the player sends it again when it matters.
* Neutral: the picture is processed by Anthropic like the rest of the conversation; the operator's privacy policy says so.
