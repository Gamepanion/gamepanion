// From checkout to subscriber (#48, ADR 0023): the checkout carries the player's id, the provider's signed webhook turns into the billing
// store's rows (idempotent, never moving a period backwards), a refund also ends the subscription at the provider, and a subscriber gets
// a link to their own portal. Without a payment provider there is nothing to buy: every entry here is "not found".
import { emailOf } from "../auth/session";
import { InvalidInputError, NotFoundError } from "../errors";
import { logger } from "../log";
import { paymentProvider, WebhookRejectedError, type PaymentEvent, type Period, type Plan } from "../payments";
import { processState } from "../state";
import type { Player } from "../types";
import { siteUrl, subscribePath } from "../urls";
import { billing } from "./store";

const log = logger("billing");

const state = processState("billing-email", () => ({ emailOf: null as ((id: string) => Promise<string | null>) | null }));
/** Tests stand in for the sign-in database's addresses here. */
export const setEmailLookupForTests = (f: ((id: string) => Promise<string | null>) | null) => {
  state.emailOf = f;
};
/** The player's sign-in address. */
export const playerEmail = (id: string) => (state.emailOf ?? emailOf)(id);

/** Where the player goes to pay for `period`; they come back to /subscribe. */
export async function startCheckout(p: Player, period: Period): Promise<{ url: string }> {
  const provider = paymentProvider();
  if (!provider) throw new NotFoundError("Nothing is sold on this instance");
  if (!(await provider.plans()).some((x) => x.period === period)) throw new InvalidInputError(`No plan per ${period} is sold`);
  return provider.createCheckout({ period, playerId: p.id, email: await playerEmail(p.id), successUrl: `${siteUrl()}${subscribePath()}` });
}

async function apply(e: PaymentEvent): Promise<void> {
  const b = await billing();
  switch (e.type) {
    case "started":
      return b.upsertStarted(e);
    case "renewed":
      if (!(await b.setPeriod(e.providerRef, e.validUntil, "active"))) log.warn({ ref: e.providerRef }, "renewed: unknown subscription, skipped");
      return;
    case "cancelled":
      // Paid until the period's end: it stays active until then.
      if (!(await b.setPeriod(e.providerRef, e.validUntil))) log.warn({ ref: e.providerRef }, "cancelled: unknown subscription, skipped");
      return;
    case "ended":
      if (!(await b.lapse(e.providerRef))) log.warn({ ref: e.providerRef }, "ended: unknown subscription, skipped");
      return;
    case "refunded": {
      if (!(await b.lapse(e.providerRef))) log.warn({ ref: e.providerRef }, "refunded: unknown subscription, skipped");
      // A refund leaves the subscription running at the provider; it must not charge again.
      try {
        await paymentProvider()?.cancel(e.providerRef);
      } catch (err) {
        log.error({ err, ref: e.providerRef }, "cancelling a refunded subscription failed");
      }
      return;
    }
  }
}

/** Applies a webhook's events; how many there were. Throws WebhookRejectedError for a bad signature. */
export async function receiveWebhook(rawBody: string, headers: Headers): Promise<number> {
  const provider = paymentProvider();
  if (!provider) throw new NotFoundError("Nothing is sold on this instance");
  const events = await provider.parseWebhook(rawBody, headers);
  for (const e of events) await apply(e);
  return events.length;
}

/** POST /api/payments/webhook: 200 {"received":n}; 400 for a bad signature; 404 without a provider. */
export async function paymentsWebhookRoute(req: Request): Promise<Response> {
  if (req.method !== "POST") return Response.json({ error: "method not allowed" }, { status: 405 });
  try {
    return Response.json({ received: await receiveWebhook(await req.text(), req.headers) });
  } catch (e) {
    if (e instanceof WebhookRejectedError) return Response.json({ error: e.message }, { status: 400 });
    if (e instanceof NotFoundError) return Response.json({ error: "not found" }, { status: 404 });
    throw e;
  }
}

/** The signed-in player's own portal at the provider; null before they ever bought. */
export async function portalFor(p: Player): Promise<string | null> {
  const provider = paymentProvider();
  if (!provider) return null;
  const ref = (await (await billing()).ofPlayer(p.id)).find((s) => s.customerRef)?.customerRef;
  return ref ? provider.portalUrl(ref) : null;
}

/** The plans for the subscribe page, yearly first, and what the yearly one saves against twelve months, in percent. */
export async function pricingPlans(): Promise<{ plans: Plan[]; yearlySavingPercent: number | null }> {
  const plans = (await paymentProvider()?.plans()) ?? [];
  return { plans: [...plans].sort((a) => (a.period === "year" ? -1 : 1)), yearlySavingPercent: yearlySaving(plans) };
}

export const yearlySaving = (plans: Plan[]): number | null => {
  const month = plans.find((x) => x.period === "month");
  const year = plans.find((x) => x.period === "year");
  return month && year && month.amount > 0 ? Math.round(100 * (1 - year.amount / (12 * month.amount))) : null;
};

/** What the account and subscribe pages show (#48): whether anything is sold, whether the player subscribes and until when, and whether
 * they have a portal. */
export async function subscriptionOf(p: Player): Promise<{ sold: boolean; subscribed: boolean; validUntil: number | null; portal: boolean }> {
  if (!paymentProvider()) return { sold: false, subscribed: false, validUntil: null, portal: false };
  const subs = await (await billing()).ofPlayer(p.id);
  const live = subs.find((s) => s.status === "active" && (s.validUntil === null || s.validUntil > Date.now()));
  return { sold: true, subscribed: !!live, validUntil: live?.validUntil ?? null, portal: subs.some((s) => s.customerRef) };
}
