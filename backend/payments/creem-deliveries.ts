// Creem's webhook (#107): the signature checked over the raw body in constant time, the delivery parsed and typed with Creem's own
// @creem_io/webhook-types, and each kind turned into Gamepanion's own events. Applying one twice or out of order changes nothing
// (billing/store.ts).
//
//   checkout.completed                                   started: who paid (metadata.player_id), the plan, paid-until
//   subscription.active, subscription.paid               renewed: paid-until moves on (started when it names the player)
//   subscription.canceled, subscription.scheduled_cancel cancelled: access stays until paid-until, nothing renews (Creem sends
//                                                        `canceled` at once when someone cancels in the portal, the period still paid)
//   subscription.expired, .paused, .unpaid               ended: access ends
//   refund.created, dispute.created                      refunded: access ends at once, and the subscription is cancelled at Creem
//   anything else (trialing, update, past_due)           nothing
import { timingSafeEqual } from "node:crypto";
import {
  generateSignature,
  parseWebhookEvent,
  type NormalizedCheckoutEntity,
  type NormalizedDisputeEntity,
  type NormalizedRefundEntity,
  type NormalizedSubscriptionEntity,
  type NormalizedWebhookEvent,
} from "@creem_io/webhook-types";
import { WebhookRejectedError, type PaymentEvent, type Tier } from "./types";

// The types say Date; JSON carries an ISO string. Either way it becomes milliseconds.
const ms = (d: Date | string | undefined): number | null => (d ? new Date(d).getTime() : null);
const ofSubscription = (s: NormalizedSubscriptionEntity) => ({ providerRef: s.id, validUntil: ms(s.current_period_end_date) });

function started(c: NormalizedCheckoutEntity, tierOf: (productId: string) => Tier): PaymentEvent[] {
  const playerId = c.metadata?.player_id;
  if (!c.subscription || typeof playerId !== "string") throw new WebhookRejectedError("a completed checkout without a subscription and a player");
  return [
    {
      type: "started",
      providerRef: c.subscription.id,
      playerId,
      customerRef: c.customer?.id ?? null,
      validUntil: ms(c.subscription.current_period_end_date),
      tier: tierOf(c.product.id),
    },
  ];
}

// A subscription event names the player too (the checkout's metadata is the subscription's): then it records the subscription whole,
// whether or not the checkout's event came first, and whether it renews from Creem's own state. Without the player, it only moves what
// is recorded.
function fromSubscription(s: NormalizedSubscriptionEntity, tierOf: (productId: string) => Tier, kind: "renewed" | "cancelled"): PaymentEvent[] {
  const playerId = s.metadata?.player_id;
  const renews = kind === "renewed" && !s.canceled_at;
  if (typeof playerId === "string")
    return [{ type: "started", ...ofSubscription(s), playerId, customerRef: s.customer?.id ?? null, tier: tierOf(s.product.id), renews }];
  return [{ type: kind, ...ofSubscription(s) }];
}

function refunded(r: NormalizedRefundEntity | NormalizedDisputeEntity): PaymentEvent[] {
  const providerRef = typeof r.subscription === "string" ? r.subscription : r.subscription?.id;
  return providerRef ? [{ type: "refunded", providerRef }] : [];
}

/** Checks a delivery's `creem-signature` and returns its events. Throws WebhookRejectedError for a bad signature or a body that isn't a
 * Creem delivery. */
export async function parseCreemWebhook(rawBody: string, headers: Headers, secret: string, tierOf: (productId: string) => Tier): Promise<PaymentEvent[]> {
  const given = Buffer.from(headers.get("creem-signature") ?? "");
  const want = Buffer.from(await generateSignature(rawBody, secret));
  if (given.length !== want.length || !timingSafeEqual(given, want)) throw new WebhookRejectedError("bad signature");
  let event: NormalizedWebhookEvent;
  try {
    event = parseWebhookEvent(rawBody);
  } catch {
    throw new WebhookRejectedError("not a Creem delivery");
  }
  switch (event.eventType) {
    case "checkout.completed":
      return started(event.object, tierOf);
    case "subscription.active":
    case "subscription.paid":
      return fromSubscription(event.object, tierOf, "renewed");
    case "subscription.canceled":
    case "subscription.scheduled_cancel":
      return fromSubscription(event.object, tierOf, "cancelled");
    case "subscription.expired":
    case "subscription.paused":
    case "subscription.unpaid":
      return [{ type: "ended", providerRef: event.object.id }];
    case "refund.created":
    case "dispute.created":
      return refunded(event.object);
    default:
      return [];
  }
}
