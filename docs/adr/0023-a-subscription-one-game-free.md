---
status: accepted
date: 2026-11-03
decision-makers: Marcel Bruckner
---

# A subscription, one game free

## Context and Problem Statement

The hosted Gamepanion costs money to run, and the in-app chat costs per message. It needs something to sell, built to the conventions "Selling a hosted instance" and "Operator pages" (Marceltov/engineering-conventions#17), without taking a self-hosted instance's features away (V7) and without ever holding a player's data hostage (#48).

## Considered Options

* Paying per game.
* **A subscription, with one game free.**
* A bundle of games per payment.

## Decision Outcome

Chosen: **a subscription, one game free** (decided 2026-11-02), because a player who plays several games pays once, a player who plays one never pays, and the paywall sits where the value grows: starting a second game.

* **Free:** one game with all its playthroughs (NG+ and second runs included). **Subscription:** unlimited games. Prices live only in Creem (two tax-inclusive products, monthly and yearly), read by `plans()`; the yearly saving is computed. No price in code, settings or copy.
* **Always free:** reading what was filed, export, deleting the account, and `correct` (fixing or removing what was filed). Only filing a new session into a game past the free one is refused: `record` (MCP, REST with 402 `subscription_required`, the in-app chat alike) answers with the subscribe link for Claude to give the player.
* **After the subscription ends** (period over, unpaid, refunded): the extra games stay readable, exportable and correctable, but frozen. One stays active: the one the player picks on the account page, else the one played last. Subscribing again unfreezes everything. Players who already had several games when payments were switched on are treated the same way. `GAMEPANION_FREE_PLAYERS` (the operator's own and family accounts) are never limited.
* **One place for the limit:** `assertMayFile` in `backend/access.ts`, called where `record` resolves its playthrough (by id, by title, or a new game).
* **Payments** follow the convention: `backend/payments/` (an interface, Creem, a fake) knows nothing about games; Creem is the merchant of record; the checkout carries the player's id (`metadata.player_id`, `request_id`), so no license key is needed; the webhook is signed and idempotent and never moves a paid period backwards; a refund is also cancelled at Creem; the signed-in player gets a link to their own Creem portal. Subscriptions live in `DATA_DIR/billing.sqlite`, apart from the log, and are checked locally on every filing.
* **Operator pages:** imprint, privacy policy, terms and the pricing page's words are Markdown files named by `GAMEPANION_*_FILE` settings (with `{lang}`, falling back to English); no file, no page and no footer link. With Creem, all four are required (`/health` says which is missing). `/licenses` lists the third-party packages, generated from the lock file.
* **Self-hosted:** with `GAMEPANION_PAYMENT_PROVIDER` empty there is no free tier and no limit (V7).

### Consequences

* Good, because the free game is a whole game, and nothing filed is ever locked away.
* Good, because the limit lives in one function, so MCP, REST and the chat can't disagree.
* Bad, because Creem takes 3.9 % + $0.40 per payment, which is why the yearly plan is shown first.
* Bad, because a subscriber depends on Creem's webhook arriving; access is checked locally, so Creem being down doesn't stop anyone who has paid.
* Neutral: renaming a game's title can swap which game counts as the free one for a player who never chose; accepted.
* Neutral: two Creem assumptions are unverified until the operator tries the sandbox with a `creem_test_` key: that the completed checkout's webhook echoes `metadata` and `request_id`, and that `POST /v1/customers/billing` answers `customer_portal_link`.
