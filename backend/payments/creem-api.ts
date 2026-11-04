// Creem, the merchant of record (https://docs.creem.io; #48, ADR 0023), through its official SDK (`creem`, #107): the plans, the
// checkout, the customer portal and cancelling. A key starting `creem_test_` talks to the sandbox. The checkout carries the player's id as
// `metadata.player_id` and `request_id`; the completed checkout's delivery echoes them (creem-deliveries.ts). The webhook itself is the
// Next.js route (app/api/payments/webhook), with @creem_io/nextjs; nothing here reads it.
import { Creem, HTTPClient } from "creem";
import { CreemError, ResponseValidationError } from "creem/models/errors";
import { logger } from "../log";
import { processState } from "../state";
import type { PaymentProvider, Period, Plan, Tier } from "./types";

const log = logger("payments");

/** `productId` is the monthly subscription; `yearlyProductId` the yearly one, if sold; the hosted-AI ones the same with the chat on the
 * instance's AI (#56), if sold. `fetch` stands in for the network in tests. */
export type CreemOptions = {
  apiKey: string;
  productId: string;
  yearlyProductId?: string;
  hostedAiProductId?: string;
  hostedAiYearlyProductId?: string;
  fetch?: typeof fetch;
};

/** Every product sold, with what it is. */
export const soldProducts = (o: Pick<CreemOptions, "productId" | "yearlyProductId" | "hostedAiProductId" | "hostedAiYearlyProductId">) =>
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

// The SDK checks every answer against its schema and throws when a field it requires is missing, after the call went through. Where the
// answer doesn't fit, the raw one is read instead: a cancel that happened must not look failed, a checkout that exists must open.
type Raw = Record<string, unknown>;
async function lenient<T>(call: Promise<T>, fromRaw: (raw: Raw) => T | undefined): Promise<T> {
  try {
    return await call;
  } catch (e) {
    if (!(e instanceof ResponseValidationError)) throw e;
    const raw = e.rawValue && typeof e.rawValue === "object" ? fromRaw(e.rawValue as Raw) : undefined;
    if (raw === undefined) throw e;
    log.warn("an answer from Creem doesn't fit the SDK's schema; read as it came");
    return raw;
  }
}
const rawStr = (v: unknown) => (typeof v === "string" && v ? v : undefined);

export function createCreem({ apiKey, fetch: doFetch, ...products }: CreemOptions): PaymentProvider {
  const sold = soldProducts(products);
  const test = apiKey.startsWith("creem_test_");
  const sdk = new Creem({
    apiKey,
    server: test ? "test" : "prod",
    ...(doFetch ? { httpClient: new HTTPClient({ fetcher: (input, init) => doFetch(input, init) }) } : {}),
  });
  const notOffered = (id: string, reason: string): null => {
    log.warn({ product: id, reason }, "a configured product is not offered");
    return null;
  };
  const product = async (period: Period, tier: Tier, id: string): Promise<Plan | null> => {
    try {
      const p = await lenient(
        sdk.products
          .get(id, { timeoutMs: 5000 })
          .then((x) => ({ status: x.status as string, name: x.name, price: x.price, currency: x.currency, taxMode: x.taxMode as string })),
        (r) =>
          rawStr(r.name)
            ? { status: String(r.status), name: String(r.name), price: r.price as number, currency: String(r.currency), taxMode: String(r.tax_mode) }
            : undefined,
      );
      if (p.status !== "active") return notOffered(id, "not active");
      if (!Number.isInteger(p.price) || p.price < 0 || !/^[A-Z]{3}$/.test(p.currency)) return notOffered(id, "not a product");
      return { period, tier, name: p.name, amount: p.price, currency: p.currency, taxIncluded: p.taxMode === "inclusive" };
    } catch (e) {
      if (e instanceof CreemError && e.statusCode === 404) return notOffered(id, "not found");
      throw e;
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
          log.warn({ why: e instanceof CreemError ? String(e.statusCode) : e instanceof Error ? e.name : "error" }, "the products cannot be read");
          return plansCache.plans ?? []; // the last list while Creem is away, else none
        })
        .finally(() => (plansCache.pending = undefined));
      // A stale list is answered at once while the refresh runs: a slow or absent Creem holds up no page once it has answered once.
      return plansCache.plans ?? plansCache.pending;
    },

    async createCheckout({ period, tier = "standard", playerId, email, successUrl }) {
      const productId = sold.find(([p, t]) => p === period && t === tier)?.[2];
      if (!productId) throw new Error(`creem: no product for a ${tier} subscription per ${period}`);
      const url = await lenient(
        sdk.checkouts
          .create({ productId, successUrl, requestId: playerId, metadata: { player_id: playerId }, ...(email ? { customer: { email } } : {}) })
          .then((c) => c.checkoutUrl),
        (r) => rawStr(r.checkout_url),
      );
      if (!url) throw new Error("creem: the checkout has no checkout_url");
      return { url };
    },

    async portalUrl(customerRef) {
      return lenient(
        sdk.customers.generateBillingLinks({ customerId: customerRef }).then((l) => l.customerPortalLink),
        (r) => rawStr(r.customer_portal_link),
      );
    },

    async cancel(providerRef) {
      if (!providerRef.startsWith("sub_")) return;
      try {
        await sdk.subscriptions.cancel(providerRef, { mode: "immediate" });
      } catch (e) {
        // Cancelled: only the answer didn't fit the SDK's schema.
        if (!(e instanceof ResponseValidationError)) throw e;
      }
    },
  };
}
