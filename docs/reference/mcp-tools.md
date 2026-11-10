# MCP tools

Every tool runs as the signed-in player and reads through the one gate ([ADR 0005](../adr/0005-spoiler-levels-and-one-gate.md)): only the player's own log, and only what they found unless they asked for more. Every result carries `next`, short instructions for Claude worked out from what the call did, and every playthrough, session, quest and item comes with its URL in the web app. Where `next` sends Claude to a page, it links the one that fits: the session `record` filed, the playthrough's Overview after `briefing`, its Settings tab when the spoiler or background setting is the way to more, `/account#key` for the player's own key, and the home page's first-run checklist for a player with nothing filed.

Below is every tool as a client lists it, generated from the tools themselves ([`mcp-tools.json`](https://github.com/gamepanion/gamepanion/blob/main/mcp-tools.json), `npm run generate`): what it is for, what it takes and what it returns. Each result also carries `next`. The [REST API](rest-api.md) offers the same data to scripts.

<!-- tools -->
