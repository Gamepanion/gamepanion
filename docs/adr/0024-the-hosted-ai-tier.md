---
status: accepted
date: 2026-11-03
decision-makers: Marcel Bruckner
---

# The hosted-AI tier

## Context and Problem Statement

The in-app chat runs on the operator's Anthropic key, so every message costs the hosted instance money, while Claude through the connector runs on the player's own Claude plan. With the subscription (ADR 0023) and players' own keys (ADR 0021) in place, the chat should pay for itself (#56).

## Considered Options

* **Three tiers: free and subscription use the player's own key; "Subscription + hosted AI" also gets the operator's key within a monthly quota.**
* The operator's key for every subscriber, with a quota.
* No operator key on the hosted instance at all: own keys only.

## Decision Outcome

Chosen: **three tiers**, because the AI is the only part whose cost grows with use, so only the players who want it pay for it, and everyone keeps the connector and the chat on their own key.

| | Free | Subscription | Subscription + hosted AI |
|---|---|---|---|
| Games | 1 | unlimited | unlimited |
| Claude through the connector | ✓ | ✓ | ✓ |
| In-app chat on the player's own key | ✓ | ✓ | ✓ |
| In-app chat on the operator's key, within a monthly quota | – | – | ✓ |
| Voice transcription | – | – | ✓ |

* **Products and prices** live in Creem: a third and fourth product (monthly, yearly), read by `plans()` with their tier; no price in code. The completed checkout's product says which tier was bought; the billing store keeps it.
* **Which key** (`chatPlan`): the player's own when stored (never counted, never replaced by the operator's); else the operator's when they may use it: everyone without a payment provider (V7, unchanged), only hosted-AI players with one, and the players in `GAMEPANION_FREE_PLAYERS`, uncounted like an instance without a provider (added 2026-11-03: the operator's own people); else the chat opens and says what it needs, with links to the key settings and the plans.
* **Quota:** tokens (input and output of every round) and seconds of transcription, per player per calendar month in the instance's time zone, in `billing.sqlite` (`ai_usage`), not a content table. Used up: the chat says so and offers the player's own key; it starts afresh on the first. Limits are `GAMEPANION_AI_*` settings, tuned from real use.
* **Guardrails** on the operator's key: a system prompt that keeps the chat on the player's own game (short asides allowed, steers back), a reply cap (`GAMEPANION_AI_REPLY_TOKENS`), a per-minute rate per player, only Gamepanion's own tools.
* **Owed to players** (Anthropic's terms): the empty chat says it is Claude, an AI, and that what it says about the game should be checked, in both languages.
* **Voice transcription** for hosted-AI players: the browser sends the recording's length, which counts against the minutes; no transcription server, no button.
* The first page's second way in reads "Start talking" for a hosted-AI player.

### Consequences

* Good, because the hosted instance's AI cost is paid by the players who use it, and capped per player.
* Good, because a self-hosted instance without a payment provider behaves as before.
* Bad, because the per-minute rate is kept in the process: several app processes would each allow it.
* Neutral: the recording's length comes from the browser; it is clamped (1 s to 15 min), and a short recording that claims to be long only costs the player.
* Left for the operator: the Creem products and prices, the quota values from real use, the privacy policy's subprocessor entries, and asking Anthropic about "resell" and stored keys once the business is live.
