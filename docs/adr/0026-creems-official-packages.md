---
status: accepted
date: 2026-11-04
decision-makers: Marcel Bruckner
---

# Creem's official packages

## Context and Problem Statement

The Creem module (`backend/payments/creem.ts`, ported from notefeed) was written by hand: its own HTTP calls, its own signature check, its own reading of each delivery. Creem publishes packages for exactly this, and notefeed and Gamepanion would otherwise each keep a copy of the same code (#107).

## Considered Options

* **Creem's official packages, keeping only the mapping to Gamepanion's records.**
* A payments library of our own, shared by notefeed and Gamepanion.
* Keep the hand-written module.

## Decision Outcome

Chosen: **the official packages** (all MIT), because they cover the signature, typed deliveries and the API, and what is left is a few lines per app.

* **`@creem_io/nextjs`**: its `Webhook` is the route at `/api/payments/webhook`. It checks the signature and calls one callback per kind of delivery. It lives in the Next.js route; `backend/` stays framework-free and hands it plain callbacks (`creemWebhook()` in `backend/billing/flow.ts`), each a mapping from `backend/payments/creem-deliveries.ts` to Gamepanion's own events. The fake provider keeps its own webhook through the backend.
* **`creem`** (the SDK, `backend/payments/creem-api.ts`): plans (kept five minutes, the last list while Creem is down), checkout, the customer portal and cancel; test or live from the key's prefix.
* **`@creem_io/embed`**: the checkout opens as an overlay on `/subscribe`. The webhook alone decides access; the success page (`/subscribe?checkout_id=…`) works without JavaScript.
* **`@creem_io/webhook-types`**: the delivery types, and `generateSignature` signs deliveries in the route's tests.

| Delivery | What Gamepanion does |
|---|---|
| `checkout.completed` | started: who paid (`metadata.player_id`), the tier from the product, paid-until |
| `subscription.active`, `subscription.paid` | renewed: paid-until moves on |
| `subscription.canceled`, `subscription.scheduled_cancel` | cancelled: access stays until paid-until (Creem sends `canceled` at once when someone cancels in the portal) |
| `subscription.expired`, `subscription.paused`, `subscription.unpaid` | ended |
| `refund.created`, `dispute.created` | refunded: ends at once, and the subscription is cancelled at Creem |

The adapter's `onGrantAccess` and `onRevokeAccess` aren't used: the first doesn't fire for `checkout.completed`, the second doesn't fire for `scheduled_cancel` and fires for `canceled` too, where access must stay until paid-until. The per-kind callbacks say what each delivery is.

### Consequences

* Good, because the signature check, the delivery types and the API calls are Creem's to keep right.
* Bad, because `@creem_io/nextjs` writes every delivery to the console, a completed checkout with the buyer's name and address, and compares the signature with `!==` rather than in constant time.
* Bad, because the SDK checks answers strictly: an answer missing a field it requires fails the call. Nothing works around it; the sandbox shows whether Creem's answers fit.
* Neutral: a delivery the backend refuses (a completed checkout naming no player) answers 500, not 400, so Creem sends it again; it changes nothing each time.
* Neutral: `next/server` without an extension in `@creem_io/nextjs` needs `server.deps.inline` in the vitest config.
