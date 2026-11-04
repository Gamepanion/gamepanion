// Creem's deliveries (#107), signed with generateSignature and sent to /api/payments/webhook as Creem sends them, into the billing store: who
// paid, paid-until, cancelling that keeps the paid period, ending, refunds that end access and cancel at Creem; twice or out of order
// changes nothing. The shapes are Creem's (https://docs.creem.io/learn/webhooks/event-types, the types of @creem_io/webhook-types).
import { generateSignature } from "@creem_io/webhook-types";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { accessOf } from "../access";
import { paymentsWebhookRoute, setEmailLookupForTests } from "../billing/flow";
import { billing, resetBillingForTests } from "../billing/store";
import { resetDbForTests } from "../db/testing";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  setEmailLookupForTests(null);
});
beforeEach(async () => {
  // The free-players check asks for the address; not the sign-in database here.
  setEmailLookupForTests(async () => "p1@example.com");
  await resetDbForTests();
  await resetBillingForTests();
});

const SECRET = "whsec";
const DAY = 86_400_000;
const END = new Date(Date.now() + 30 * DAY).toISOString();
const LATER = new Date(Date.now() + 60 * DAY).toISOString();

function sellWithCreem() {
  vi.stubEnv("GAMEPANION_PAYMENT_PROVIDER", "creem");
  vi.stubEnv("GAMEPANION_CREEM_API_KEY", "creem_test_k");
  vi.stubEnv("GAMEPANION_CREEM_PRODUCT_ID", "prod_m");
  vi.stubEnv("GAMEPANION_CREEM_HOSTED_AI_PRODUCT_ID", "prod_ai");
  vi.stubEnv("GAMEPANION_CREEM_WEBHOOK_SECRET", SECRET);
}

// Deliveries in the shape Creem sends them (https://docs.creem.io/learn/webhooks/event-types; the types of @creem_io/webhook-types).
const product = (id: string) => ({ id, object: "product", name: "Gamepanion", price: 499, currency: "EUR", mode: "test" });
const customer = { id: "cust_1", object: "customer", email: "p1@example.com", name: "P", country: "DE", mode: "test" };
const subscription = (id: string, end = END, status = "active") => ({
  id,
  object: "subscription",
  product: product("prod_m"),
  customer,
  collection_method: "charge_automatically",
  status,
  current_period_start_date: new Date().toISOString(),
  current_period_end_date: end,
  metadata: { player_id: "p1" },
  mode: "test",
});
const checkout = (o: { player?: string; product?: string; sub?: string }) => ({
  id: "ch_1",
  object: "checkout",
  status: "completed",
  product: product(o.product ?? "prod_m"),
  customer,
  subscription: { ...subscription(o.sub ?? "sub_1"), product: o.product ?? "prod_m", customer: "cust_1" },
  metadata: o.player ? { player_id: o.player } : {},
  mode: "test",
});
const refund = (sub: string) => ({
  id: "ref_1",
  object: "refund",
  status: "succeeded",
  refund_amount: 499,
  refund_currency: "EUR",
  reason: "requested_by_customer",
  transaction: { id: "tran_1", object: "transaction" },
  subscription: sub,
  mode: "test",
});

let n = 0;
async function deliver(eventType: string, object: unknown, signature?: string) {
  const body = JSON.stringify({ id: `evt_${++n}`, eventType, created_at: Date.now(), object });
  const res = await paymentsWebhookRoute(
    new Request("http://localhost/api/payments/webhook", {
      method: "POST",
      body,
      headers: { "creem-signature": signature ?? (await generateSignature(body, SECRET)), "content-type": "application/json" },
    }),
  );
  return res.status;
}
const subs = async () => (await billing()).ofPlayer("p1");
const p1 = { id: "p1" };

test("a delivery with a bad signature is refused and changes nothing", async () => {
  sellWithCreem();
  expect(await deliver("checkout.completed", checkout({ player: "p1" }), "00")).toBe(400);
  expect(await subs()).toEqual([]);
});

test("checkout.completed makes the player from metadata a subscriber until paid-until, with the tier from the product; twice is one row", async () => {
  sellWithCreem();
  expect(await deliver("checkout.completed", checkout({ player: "p1", product: "prod_ai" }))).toBe(200);
  expect(await deliver("checkout.completed", checkout({ player: "p1", product: "prod_ai" }))).toBe(200);
  expect(await subs()).toMatchObject([
    { providerRef: "sub_1", playerId: "p1", customerRef: "cust_1", tier: "hostedAi", status: "active", validUntil: Date.parse(END) },
  ]);
  expect((await accessOf(p1)).subscribed).toBe(true);
});

test("a completed checkout that names no player, or a body that isn't a delivery, is refused and files nothing", async () => {
  sellWithCreem();
  expect(await deliver("checkout.completed", checkout({ sub: "sub_3" }))).toBe(400);
  expect(await deliver("checkout.completed", "not an object")).toBe(400);
  expect(await subs()).toEqual([]);
});

test("paid moves paid-until on; canceled and scheduled_cancel keep access until then; expired ends it", async () => {
  sellWithCreem();
  await deliver("checkout.completed", checkout({ player: "p1" }));
  await deliver("subscription.paid", subscription("sub_1", LATER));
  expect((await subs())[0].validUntil).toBe(Date.parse(LATER));
  // Out of order: an older period never moves it back.
  await deliver("subscription.active", subscription("sub_1", END));
  expect((await subs())[0].validUntil).toBe(Date.parse(LATER));
  await deliver("subscription.canceled", subscription("sub_1", LATER, "canceled"));
  await deliver("subscription.scheduled_cancel", subscription("sub_1", LATER, "scheduled_cancel"));
  expect((await accessOf(p1)).subscribed).toBe(true);
  await deliver("subscription.expired", subscription("sub_1", LATER, "expired"));
  expect((await accessOf(p1)).subscribed).toBe(false);
});

test("paused and unpaid end access; a delivery for a subscription nobody bought here changes nothing", async () => {
  sellWithCreem();
  await deliver("checkout.completed", checkout({ player: "p1" }));
  await deliver("subscription.paused", subscription("sub_1"));
  expect((await subs())[0].status).toBe("lapsed");
  await deliver("checkout.completed", checkout({ player: "p1", sub: "sub_9" }));
  await deliver("subscription.unpaid", subscription("sub_9"));
  expect((await subs()).every((s) => s.status === "lapsed")).toBe(true);
  expect(await deliver("subscription.paid", subscription("sub_unknown"))).toBe(200);
  expect(await deliver("subscription.past_due", subscription("sub_1"))).toBe(200);
});

test("refund.created and dispute.created end access at once and cancel the subscription at Creem", async () => {
  sellWithCreem();
  const cancelled: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: Request | string | URL, init?: RequestInit) => {
      const req = input instanceof Request ? input : new Request(input, init);
      cancelled.push(`${req.method} ${new URL(req.url).pathname} ${await req.text()}`);
      return Response.json(subscription("sub_1", END, "canceled"));
    }),
  );
  await deliver("checkout.completed", checkout({ player: "p1" }));
  expect(await deliver("refund.created", refund("sub_1"))).toBe(200);
  expect((await accessOf(p1)).subscribed).toBe(false);
  expect(cancelled).toEqual(['POST /v1/subscriptions/sub_1/cancel {"mode":"immediate"}']);
  await deliver("checkout.completed", checkout({ player: "p1", sub: "sub_d" }));
  expect(await deliver("dispute.created", { ...refund("sub_d"), id: "disp_1", object: "dispute", amount: 499, currency: "EUR" })).toBe(200);
  expect((await subs()).find((s) => s.providerRef === "sub_d")?.status).toBe("lapsed");
});
