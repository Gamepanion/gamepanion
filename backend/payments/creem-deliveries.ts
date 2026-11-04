// What each Creem delivery means for Gamepanion's records (#107). The route (app/api/payments/webhook) hands each delivery to
// @creem_io/nextjs's Webhook, which checks the signature and calls one callback per kind; each callback is one of these, which turns it
// into Gamepanion's own events. Applying one twice or out of order changes nothing (billing/store.ts).
//
//   checkout.completed                                  started: who paid (metadata.player_id, else request_id), the plan, paid-until
//   subscription.active, subscription.paid              renewed: paid-until moves on
//   subscription.canceled, subscription.scheduled_cancel cancelled: access stays until paid-until, nothing renews (Creem sends
//                                                        `canceled` at once when someone cancels in the portal, the period still paid)
//   subscription.expired, .paused, .unpaid              ended: access ends
//   refund.created, dispute.created                     refunded: access ends at once, and the subscription is cancelled at Creem
import type {
  CustomerEntity,
  NormalizedCheckoutEntity,
  NormalizedDisputeEntity,
  NormalizedRefundEntity,
  NormalizedSubscriptionEntity,
  ProductEntity,
  SubscriptionEntity,
} from "@creem_io/webhook-types";
import { WebhookRejectedError, type PaymentEvent, type Tier } from "./types";

type Ref<T extends { id: string }> = T | string | undefined;
const idOf = <T extends { id: string }>(x: Ref<T>): string | undefined => (typeof x === "string" ? x || undefined : x?.id || undefined);
// The types say Date; over the wire it is an ISO string.
const time = (v: unknown): number | null => {
  const t = v instanceof Date ? v.getTime() : typeof v === "string" || typeof v === "number" ? new Date(v).getTime() : NaN;
  return Number.isFinite(t) ? t : null;
};
const str = (v: unknown): string | undefined => (typeof v === "string" && v !== "" ? v : undefined);

/** Turns deliveries into events, knowing which product is which tier. */
export function creemDeliveries(tierOf: (productId: string | undefined) => Tier) {
  return {
    checkoutCompleted(c: NormalizedCheckoutEntity): PaymentEvent[] {
      const providerRef = idOf<SubscriptionEntity>(c.subscription as Ref<SubscriptionEntity>);
      const playerId = str(c.metadata?.player_id) ?? str(c.metadata?.referenceId) ?? str(c.request_id);
      if (!providerRef || !playerId) throw new WebhookRejectedError("a completed checkout without a subscription and a player");
      return [
        {
          type: "started",
          providerRef,
          playerId,
          customerRef: idOf<CustomerEntity>(c.customer) ?? null,
          validUntil: time(typeof c.subscription === "object" ? c.subscription.current_period_end_date : undefined),
          tier: tierOf(idOf<ProductEntity>(c.product)),
        },
      ];
    },
    renewed: (s: NormalizedSubscriptionEntity): PaymentEvent[] =>
      s.id ? [{ type: "renewed", providerRef: s.id, validUntil: time(s.current_period_end_date) }] : [],
    cancelled: (s: NormalizedSubscriptionEntity): PaymentEvent[] =>
      s.id ? [{ type: "cancelled", providerRef: s.id, validUntil: time(s.current_period_end_date) }] : [],
    ended: (s: NormalizedSubscriptionEntity): PaymentEvent[] => (s.id ? [{ type: "ended", providerRef: s.id }] : []),
    refunded(r: NormalizedRefundEntity | NormalizedDisputeEntity): PaymentEvent[] {
      const providerRef =
        idOf<SubscriptionEntity>(r.subscription) ?? idOf<SubscriptionEntity>((r.transaction as { subscription?: Ref<SubscriptionEntity> })?.subscription);
      return providerRef ? [{ type: "refunded", providerRef }] : [];
    },
  };
}
