// A provider that charges nobody, for the tests and for trying the flow on a development instance (GAMEPANION_PAYMENT_PROVIDER=fake). It
// sells a monthly and a yearly plan at fixed prices. The checkout is the success page itself; the webhook is JSON that already is a list
// of events, signed with HMAC-SHA256 in `x-fake-signature` using GAMEPANION_FAKE_WEBHOOK_SECRET.
import { createHmac, timingSafeEqual } from "node:crypto";
import { processState } from "../state";
import { WebhookRejectedError, type PaymentEvent, type PaymentProvider } from "./types";

export const fakeSignature = (secret: string, body: string) => createHmac("sha256", secret).update(body).digest("hex");

/** What `cancel` was called with, for the tests. */
export const fakeCancelled: string[] = processState("fake-cancelled", () => [] as string[]);

export function createFake(webhookSecret: string): PaymentProvider {
  return {
    overlay: false,
    async plans() {
      return [
        { period: "month", tier: "standard", name: "Monthly", amount: 499, currency: "EUR", taxIncluded: true },
        { period: "year", tier: "standard", name: "Yearly", amount: 4990, currency: "EUR", taxIncluded: true },
        { period: "month", tier: "hostedAi", name: "Monthly with AI", amount: 999, currency: "EUR", taxIncluded: true },
        { period: "year", tier: "hostedAi", name: "Yearly with AI", amount: 9990, currency: "EUR", taxIncluded: true },
      ];
    },
    async createCheckout({ successUrl, playerId, tier = "standard" }) {
      return { url: `${successUrl}?checkout_id=fake_${tier}_${encodeURIComponent(playerId)}` };
    },
    async parseWebhook(rawBody, headers) {
      const a = Buffer.from(headers.get("x-fake-signature") ?? "");
      const b = Buffer.from(fakeSignature(webhookSecret, rawBody));
      if (a.length !== b.length || !timingSafeEqual(a, b)) throw new WebhookRejectedError("bad signature");
      try {
        const events = JSON.parse(rawBody) as PaymentEvent[];
        if (Array.isArray(events)) return events;
      } catch {}
      throw new WebhookRejectedError("not a list of events");
    },
    async portalUrl(customerRef) {
      return `https://fake.invalid/portal/${encodeURIComponent(customerRef)}`;
    },
    async cancel(providerRef) {
      fakeCancelled.push(providerRef);
    },
  };
}
