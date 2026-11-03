// Creem, the merchant of record (https://docs.creem.io; #48, ADR 0023), ported from notefeed's. A key starting `creem_test_` talks to the
// sandbox. The checkout carries the player's id as `metadata.player_id` and `request_id`; the completed checkout's webhook echoes them, so
// no license key is needed. The webhook is signed with HMAC-SHA256 over the raw body, hex, in `creem-signature`; the same event can arrive
// more than once. A refund leaves the subscription running at Creem, which is why billing/flow.ts cancels it.
// Unverified against the sandbox yet (left to the operator): that the webhook echoes `metadata` and `request_id`, and that
// POST /customers/billing answers `customer_portal_link`.
import { createHmac, timingSafeEqual } from "node:crypto";
import { logger } from "../log";
import { processState } from "../state";
import { WebhookRejectedError, type PaymentProvider, type Period, type Plan, type Tier } from "./types";

const log = logger("payments");

/** `productId` is the monthly subscription; `yearlyProductId` the yearly one, if sold; the hosted-AI ones the same with the chat on the
 * instance's AI (#56), if sold. */
export type CreemOptions = {
  apiKey: string;
  productId: string;
  yearlyProductId?: string;
  hostedAiProductId?: string;
  hostedAiYearlyProductId?: string;
  webhookSecret: string;
  fetch?: typeof fetch;
};

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj | undefined => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : undefined);
const str = (v: unknown): string | undefined => (typeof v === "string" && v !== "" ? v : undefined);
const time = (v: unknown): number | null => {
  const t = typeof v === "string" || typeof v === "number" ? new Date(v).getTime() : NaN;
  return Number.isFinite(t) ? t : null;
};

// The plans are the configured products as Creem holds them, kept five minutes so a changed price shows soon without a read per page view.
const PLANS_FRESH_MS = 5 * 60 * 1000;
const plansCache = processState("creem-plans", () => ({}) as { key?: string; at?: number; plans?: Plan[]; pending?: Promise<Plan[]> });

export function resetPlansForTests(): void {
  for (const k of Object.keys(plansCache)) delete plansCache[k as keyof typeof plansCache];
}

class ProductsUnreadable extends Error {}

export function createCreem({
  apiKey,
  productId,
  yearlyProductId = "",
  hostedAiProductId = "",
  hostedAiYearlyProductId = "",
  webhookSecret,
  fetch: doFetch = fetch,
}: CreemOptions): PaymentProvider {
  // Every product sold, with what it is; a completed checkout's product says which tier was bought.
  const sold: [Period, Tier, string][] = (
    [
      ["month", "standard", productId],
      ["year", "standard", yearlyProductId],
      ["month", "hostedAi", hostedAiProductId],
      ["year", "hostedAi", hostedAiYearlyProductId],
    ] as [Period, Tier, string][]
  ).filter(([, , id]) => id);
  const tierOf = (product: string | undefined): Tier => sold.find(([, , id]) => id === product)?.[1] ?? "standard";
  const base = apiKey.startsWith("creem_test_") ? "https://test-api.creem.io/v1" : "https://api.creem.io/v1";
  const call = async (what: string, path: string, body?: unknown): Promise<Obj | undefined> => {
    const res = await doFetch(`${base}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { "x-api-key": apiKey, ...(body === undefined ? {} : { "content-type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`creem: ${what} failed (${res.status})`);
    return obj(await res.json());
  };
  const notOffered = (id: string, reason: string): null => {
    log.warn({ product: id, reason }, "a configured product is not offered");
    return null;
  };
  const product = async (period: Period, tier: Tier, id: string): Promise<Plan | null> => {
    let res: Response;
    try {
      res = await doFetch(`${base}/products?product_id=${encodeURIComponent(id)}`, { headers: { "x-api-key": apiKey }, signal: AbortSignal.timeout(5000) });
    } catch (e) {
      throw new ProductsUnreadable(e instanceof Error ? e.name : "error");
    }
    if (res.status === 404) return notOffered(id, "not found");
    if (!res.ok) throw new ProductsUnreadable(String(res.status));
    const p = obj(await res.json().catch(() => undefined));
    if (p?.status !== "active") return notOffered(id, "not active");
    const name = str(p.name);
    const amount = p.price;
    const currency = typeof p.currency === "string" && /^[A-Z]{3}$/.test(p.currency) ? p.currency : undefined;
    if (!name || !Number.isInteger(amount) || (amount as number) < 0 || !currency) return notOffered(id, "not a product");
    return { period, tier, name, amount: amount as number, currency, taxIncluded: p.tax_mode === "inclusive" };
  };
  const refresh = async (): Promise<Plan[]> =>
    (await Promise.all(sold.map(([period, tier, id]) => product(period, tier, id)))).filter((p): p is Plan => p !== null);
  return {
    async plans() {
      const key = `${base} ${sold.map(([, , id]) => id).join(" ")}`;
      if (plansCache.key !== key) resetPlansForTests();
      if (plansCache.plans && Date.now() - (plansCache.at ?? 0) <= PLANS_FRESH_MS) return plansCache.plans;
      plansCache.key = key;
      plansCache.pending ??= refresh()
        .then((plans) => Object.assign(plansCache, { plans, at: Date.now() }).plans as Plan[])
        .catch((e) => {
          log.warn({ why: e instanceof ProductsUnreadable ? e.message : "error" }, "the products cannot be read");
          return plansCache.plans ?? []; // the last list while Creem is away, else none
        })
        .finally(() => (plansCache.pending = undefined));
      // A stale list is answered at once while the refresh runs: a slow or absent Creem holds up no page once it has answered once.
      return plansCache.plans ?? plansCache.pending;
    },

    async createCheckout({ period, tier = "standard", playerId, email, successUrl }) {
      const product = sold.find(([p, t]) => p === period && t === tier)?.[2];
      if (!product) throw new Error(`creem: no product for a ${tier} subscription per ${period}`);
      const checkout = await call("creating a checkout", "/checkouts", {
        product_id: product,
        success_url: successUrl,
        request_id: playerId,
        metadata: { player_id: playerId },
        ...(email ? { customer: { email } } : {}),
      });
      const url = str(checkout?.checkout_url);
      if (!url) throw new Error("creem: the checkout has no checkout_url");
      return { url };
    },

    async parseWebhook(rawBody, headers) {
      const given = headers.get("creem-signature") ?? "";
      const want = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
      const a = Buffer.from(given);
      const b = Buffer.from(want);
      if (a.length !== b.length || !timingSafeEqual(a, b)) throw new WebhookRejectedError("bad signature");
      let event: Obj | undefined;
      try {
        event = obj(JSON.parse(rawBody));
      } catch {}
      const kind = str(event?.eventType);
      const o = obj(event?.object);
      if (!kind || !o) throw new WebhookRejectedError("not a Creem event");
      const subscription = obj(o.subscription);
      switch (kind) {
        case "checkout.completed": {
          const providerRef = str(subscription?.id);
          const playerId = str(obj(o.metadata)?.player_id) ?? str(o.request_id);
          if (!providerRef || !playerId) throw new WebhookRejectedError("a completed checkout without a subscription and a player");
          const customer = obj(o.customer);
          return [
            {
              type: "started",
              providerRef,
              playerId,
              customerRef: str(customer?.id) ?? str(o.customer) ?? null,
              validUntil: time(subscription?.current_period_end_date),
              tier: tierOf(str(obj(o.product)?.id) ?? str(o.product)),
            },
          ];
        }
        case "subscription.paid":
        case "subscription.active": {
          const providerRef = str(o.id);
          return providerRef ? [{ type: "renewed", providerRef, validUntil: time(o.current_period_end_date) }] : [];
        }
        case "subscription.canceled":
        case "subscription.scheduled_cancel": {
          const providerRef = str(o.id);
          return providerRef ? [{ type: "cancelled", providerRef, validUntil: time(o.current_period_end_date) }] : [];
        }
        case "subscription.expired":
        case "subscription.unpaid": {
          const providerRef = str(o.id);
          return providerRef ? [{ type: "ended", providerRef }] : [];
        }
        case "refund.created":
        case "dispute.created": {
          const providerRef = str(subscription?.id) ?? str(o.subscription);
          return providerRef ? [{ type: "refunded", providerRef }] : [];
        }
        default:
          return [];
      }
    },

    async portalUrl(customerRef) {
      const r = await call("opening the customer portal", "/customers/billing", { customer_id: customerRef });
      const url = str(r?.customer_portal_link);
      if (!url) throw new Error("creem: no customer_portal_link");
      return url;
    },

    async cancel(providerRef) {
      if (!providerRef.startsWith("sub_")) return;
      await call("cancelling a subscription", `/subscriptions/${encodeURIComponent(providerRef)}/cancel`, { mode: "immediate" });
    },
  };
}
