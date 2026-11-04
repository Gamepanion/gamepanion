// What Gamepanion needs from a payment provider (#48, ADR 0023), following the convention "Selling a hosted instance": the plans it sells,
// a checkout carrying the player's id, the provider's webhook turned into events about a subscription, the player's own portal, and a way
// to end a subscription. Nothing here knows about games or what players filed; backend/billing/flow.ts is the only caller.

export type Period = "month" | "year";
/** What is sold (#56, ADR 0024): the subscription, or the subscription with the in-app chat on the instance's own AI. */
export type Tier = "standard" | "hostedAi";

/** A plan as the provider holds it: the price in minor units, tax included or not. */
export type Plan = { period: Period; tier: Tier; name: string; amount: number; currency: string; taxIncluded: boolean };

/** What a webhook says about a subscription. `providerRef` is the provider's subscription id; `validUntil` when the paid period ends (ms). */
export type PaymentEvent =
  /** Bought: the player whose id the checkout carried subscribes from now on. */
  | { type: "started"; providerRef: string; playerId: string; customerRef: string | null; validUntil: number | null; tier?: Tier }
  /** Paid again: the period is extended. */
  | { type: "renewed"; providerRef: string; validUntil: number | null }
  /** The buyer cancelled: it stays active until `validUntil`. */
  | { type: "cancelled"; providerRef: string; validUntil: number | null }
  /** The period ended without payment. */
  | { type: "ended"; providerRef: string }
  /** Refunded or disputed: lapses at once. */
  | { type: "refunded"; providerRef: string };

export class WebhookRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookRejectedError";
  }
}

export interface PaymentProvider {
  /** The plans sold, monthly then yearly. Never throws: a provider that can't be read gives what it gave last, or none. */
  plans(): Promise<Plan[]>;
  /** The URL to send the player to; they come back to `successUrl`. `period` picks the product; throws when there is none for it. */
  createCheckout(o: { period: Period; tier?: Tier; playerId: string; email: string | null; successUrl: string }): Promise<{ url: string }>;
  /** Verifies the signature over the raw body and returns its events (none for a kind Gamepanion doesn't use). Throws WebhookRejectedError.
   * Only where the backend reads the webhook (the fake); Creem's is read by @creem_io/nextjs in the route (creem-deliveries.ts, #107). */
  parseWebhook?(rawBody: string, headers: Headers): Promise<PaymentEvent[]>;
  /** Whether the checkout opens as an overlay on the subscribe page (Creem's embed) rather than as a page of its own. */
  overlay: boolean;
  /** The signed-in player's own customer portal: cancelling, the payment method, invoices. */
  portalUrl(customerRef: string): Promise<string>;
  /** Ends the subscription at once, so a refunded one isn't charged again. */
  cancel(providerRef: string): Promise<void>;
}
