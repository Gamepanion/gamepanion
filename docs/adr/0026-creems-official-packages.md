---
status: accepted
date: 2026-11-04
decision-makers: Marcel Bruckner
---

# Creem's official packages

## Context and Problem Statement

The Creem module (`backend/payments/creem.ts`, ported from notefeed) was written by hand: its own HTTP calls, its own signature check, its own reading of each delivery. Creem publishes packages for exactly this, and notefeed and Gamepanion would otherwise each keep a copy of the same code (#107).

## Considered Options

* **Creem's official packages where they are good, keeping only the mapping to Gamepanion's records.**
* All of them, the Next.js adapter (`@creem_io/nextjs`) as the webhook route too.
* A payments library of our own, shared by notefeed and Gamepanion.
* Keep the hand-written module.

## Decision Outcome

Chosen: **the official packages where they are good** (all MIT): the SDK, the delivery types and the embed. They cover the API, the signature and typed deliveries; what is left is a few lines per app.

* **`creem`** (the SDK, `backend/payments/creem-api.ts`): plans (kept five minutes, the last list while Creem is down), checkout, the customer portal and cancel; test or live from the key's prefix.
* **`@creem_io/webhook-types`** (`backend/payments/creem-deliveries.ts`): `generateSignature` for the signature over the raw body, compared in constant time; `parseWebhookEvent` and its types for the delivery; a switch over the kinds into Gamepanion's own events. The webhook stays the backend's `parseWebhook`, behind the same interface as the fake.
* **`@creem_io/embed`**: the checkout opens as an overlay on `/subscribe`. The webhook alone decides access; the success page (`/subscribe?checkout_id=…`) works without JavaScript.

| Delivery | What Gamepanion does |
|---|---|
| `checkout.completed` | started: who paid (`metadata.player_id`), the tier from the product, paid-until |
| `subscription.active`, `subscription.paid` | renewed: paid-until moves on |
| `subscription.canceled`, `subscription.scheduled_cancel` | cancelled: access stays until paid-until (Creem sends `canceled` at once when someone cancels in the portal) |
| `subscription.expired`, `subscription.paused`, `subscription.unpaid` | ended |
| `refund.created`, `dispute.created` | refunded: ends at once, and the subscription is cancelled at Creem |
| anything else | nothing |

**Not `@creem_io/nextjs`** (decided 2026-11-04, after trying it in #110): it is some thirty lines around the two functions above, and those lines write every delivery to the console (a completed checkout with the buyer's name and address), compare the signature with `!==`, answer every error in our callbacks with a bare 500, and import `next/server` in a way only Next resolves. Its `onGrantAccess` and `onRevokeAccess` don't fit either: the first doesn't fire for `checkout.completed`, the second fires for `canceled`, where access must stay until paid-until.

### Consequences

* Good, because the API calls, the signature and the delivery types are Creem's to keep right, and `backend/` stays framework-free.
* Good, because no delivery reaches a log.
* Bad, because the SDK checks answers strictly: an answer missing a field it requires fails the call. The sandbox shows whether Creem's answers fit.
* Bad, because the SDK is large (26 MB installed; the standalone build traces only what is used).
