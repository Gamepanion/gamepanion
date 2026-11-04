// Creem, the merchant of record (https://docs.creem.io; #48, ADR 0023), through its official SDK (`creem`, #107): the plans, the
// checkout, the customer portal and cancelling. A key starting `creem_test_` talks to the sandbox. The checkout carries the player's id as
// `metadata.player_id`; the completed checkout's delivery echoes it (creem-deliveries.ts). The webhook itself is the Next.js route
// (app/api/payments/webhook), with @creem_io/nextjs; nothing here reads it.
import { Creem } from "creem";
import { CreemError } from "creem/models/errors";
import { logger } from "../log";
import { processState } from "../state";
import type { PaymentProvider, Period, Plan, Tier } from "./types";

const log = logger("payments");

/** `productId` is the monthly subscription; `yearlyProductId` the yearly one, if sold; the hosted-AI ones the same with the chat on the
 * instance's AI (#56), if sold. */
export type CreemOptions = {
  apiKey: string;
  productId: string;
  yearlyProductId?: string;
  hostedAiProductId?: string;
  hostedAiYearlyProductId?: string;
};

/** Every product sold, with what it is. */
export const soldProducts = (o: Omit<CreemOptions, "apiKey">) =>
  (
    [
      ["month", "standard", o.productId],
      ["year", "standard", o.yearlyProductId ?? ""],
      ["month", "hostedAi", o.hostedAiProductId ?? ""],
      ["year", "hostedAi", o.hostedAiYearlyProductId ?? ""],
    ] as [Period, Tier, string][]
  ).filter(([, , id]) => id);

// The plans are the configured products as Creem holds them, kept five minutes so a changed price shows soon without a read per page view.
const PLANS_FRESH_MS = 5 * 60 * 1000;
const plansCache = processState("creem-plans", () => ({}) as { key?: string; at?: number; plans?: Plan[]; pending?: Promise<Plan[]> });

export function resetPlansForTests(): void {
  for (const k of Object.keys(plansCache)) delete plansCache[k as keyof typeof plansCache];
}

export function createCreem({ apiKey, ...products }: CreemOptions): PaymentProvider {
  const sold = soldProducts(products);
  const test = apiKey.startsWith("creem_test_");
  const sdk = new Creem({ apiKey, server: test ? "test" : "prod" });
  const product = async (period: Period, tier: Tier, id: string): Promise<Plan | null> => {
    try {
      const p = await sdk.products.get(id, { timeoutMs: 5000 });
      if (p.status === "active") return { period, tier, name: p.name, amount: p.price, currency: p.currency, taxIncluded: p.taxMode === "inclusive" };
      log.warn({ product: id }, "a configured product is not active");
      return null;
    } catch (e) {
      if (!(e instanceof CreemError && e.statusCode === 404)) throw e;
      log.warn({ product: id }, "a configured product does not exist");
      return null;
    }
  };
  const refresh = async (): Promise<Plan[]> =>
    (await Promise.all(sold.map(([period, tier, id]) => product(period, tier, id)))).filter((p): p is Plan => p !== null);
  return {
    overlay: true,

    async plans() {
      const key = `${test} ${sold.map(([, , id]) => id).join(" ")}`;
      if (plansCache.key !== key) resetPlansForTests();
      if (plansCache.plans && Date.now() - (plansCache.at ?? 0) <= PLANS_FRESH_MS) return plansCache.plans;
      plansCache.key = key;
      plansCache.pending ??= refresh()
        .then((plans) => Object.assign(plansCache, { plans, at: Date.now() }).plans as Plan[])
        .catch((e) => {
          log.warn({ err: e }, "the products cannot be read");
          return plansCache.plans ?? []; // the last list while Creem is away, else none
        })
        .finally(() => (plansCache.pending = undefined));
      // A stale list is answered at once while the refresh runs: a slow or absent Creem holds up no page once it has answered once.
      return plansCache.plans ?? plansCache.pending;
    },

    async createCheckout({ period, tier = "standard", playerId, email, successUrl }) {
      const productId = sold.find(([p, t]) => p === period && t === tier)?.[2];
      if (!productId) throw new Error(`creem: no product for a ${tier} subscription per ${period}`);
      const checkout = await sdk.checkouts.create({ productId, successUrl, metadata: { player_id: playerId }, ...(email ? { customer: { email } } : {}) });
      if (!checkout.checkoutUrl) throw new Error("creem: the checkout has no checkout_url");
      return { url: checkout.checkoutUrl };
    },

    async portalUrl(customerRef) {
      return (await sdk.customers.generateBillingLinks({ customerId: customerRef })).customerPortalLink;
    },

    async cancel(providerRef) {
      await sdk.subscriptions.cancel(providerRef, { mode: "immediate" });
    },
  };
}
