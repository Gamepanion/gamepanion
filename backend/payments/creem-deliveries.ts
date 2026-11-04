// What each Creem delivery means for Gamepanion's records (#107). The route (app/api/payments/webhook) hands each delivery to
// @creem_io/nextjs's Webhook, which checks the signature and calls one callback per kind; each callback is one of these, which turns it
// into Gamepanion's own events. Applying one twice or out of order changes nothing (billing/store.ts).
//
//   checkout.completed                                  started: who paid (metadata.player_id), the plan, paid-until
//   subscription.active, subscription.paid              renewed: paid-until moves on
//   subscription.canceled, subscription.scheduled_cancel cancelled: access stays until paid-until, nothing renews (Creem sends
//                                                        `canceled` at once when someone cancels in the portal, the period still paid)
//   subscription.expired, .paused, .unpaid              ended: access ends
//   refund.created, dispute.created                     refunded: access ends at once, and the subscription is cancelled at Creem
import type { NormalizedCheckoutEntity, NormalizedDisputeEntity, NormalizedRefundEntity, NormalizedSubscriptionEntity } from "@creem_io/webhook-types";
import { WebhookRejectedError, type PaymentEvent, type Tier } from "./types";

// The types say Date; JSON carries an ISO string. Either way it becomes milliseconds.
const ms = (d: Date | string | undefined): number | null => (d ? new Date(d).getTime() : null);

/** Turns deliveries into events, knowing which product is which tier. */
export function creemDeliveries(tierOf: (productId: string) => Tier) {
  const ofSubscription = (s: NormalizedSubscriptionEntity) => ({ providerRef: s.id, validUntil: ms(s.current_period_end_date) });
  return {
    checkoutCompleted(c: NormalizedCheckoutEntity): PaymentEvent[] {
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
    },
    renewed: (s: NormalizedSubscriptionEntity): PaymentEvent[] => [{ type: "renewed", ...ofSubscription(s) }],
    cancelled: (s: NormalizedSubscriptionEntity): PaymentEvent[] => [{ type: "cancelled", ...ofSubscription(s) }],
    ended: (s: NormalizedSubscriptionEntity): PaymentEvent[] => [{ type: "ended", providerRef: s.id }],
    refunded(r: NormalizedRefundEntity | NormalizedDisputeEntity): PaymentEvent[] {
      const providerRef = typeof r.subscription === "string" ? r.subscription : r.subscription?.id;
      return providerRef ? [{ type: "refunded", providerRef }] : [];
    },
  };
}
