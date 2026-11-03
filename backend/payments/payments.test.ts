// The payment providers (#48): the fake signs and parses its own events; Creem's signature, events, checkout, plans, portal and cancel,
// against a stand-in fetch.
import { createHmac } from "node:crypto";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { config } from "../config";
import { createCreem, resetPlansForTests } from "./creem";
import { createFake, fakeSignature } from "./fake";
import { WebhookRejectedError } from "./types";

afterEach(() => vi.unstubAllEnvs());
beforeEach(() => resetPlansForTests());

test("payment provider: empty is off, unknown is refused, creem names what is missing", () => {
  vi.stubEnv("GAMEPANION_PAYMENT_PROVIDER", "");
  expect(config.paymentProvider()).toBe("");
  vi.stubEnv("GAMEPANION_PAYMENT_PROVIDER", "stripe");
  expect(() => config.paymentProvider()).toThrow(/use creem/);
  vi.stubEnv("GAMEPANION_PAYMENT_PROVIDER", "creem");
  vi.stubEnv("GAMEPANION_CREEM_API_KEY", "creem_x");
  expect(() => config.creem()).toThrow("GAMEPANION_PAYMENT_PROVIDER=creem needs GAMEPANION_CREEM_PRODUCT_ID, GAMEPANION_CREEM_WEBHOOK_SECRET");
});

test("the fake signs and parses its own events; plans are a monthly and a yearly plan", async () => {
  const f = createFake("s3cret");
  const body = JSON.stringify([{ type: "renewed", providerRef: "sub_1", validUntil: 5 }]);
  expect(await f.parseWebhook(body, new Headers({ "x-fake-signature": fakeSignature("s3cret", body) }))).toEqual([
    { type: "renewed", providerRef: "sub_1", validUntil: 5 },
  ]);
  await expect(f.parseWebhook(body, new Headers({ "x-fake-signature": "nope" }))).rejects.toBeInstanceOf(WebhookRejectedError);
  expect((await f.plans()).map((p) => [p.period, p.amount, p.currency, p.taxIncluded])).toEqual([
    ["month", 499, "EUR", true],
    ["year", 4990, "EUR", true],
  ]);
});

const SECRET = "whsec";
const sign = (body: string) => createHmac("sha256", SECRET).update(body).digest("hex");
type Call = { url: string; init?: RequestInit };
function creem(handler: (c: Call) => Response | Promise<Response>, apiKey = "creem_test_k") {
  const calls: Call[] = [];
  const f = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return handler({ url, init });
  }) as unknown as typeof fetch;
  return { p: createCreem({ apiKey, productId: "prod_m", yearlyProductId: "prod_y", webhookSecret: SECRET, fetch: f }), calls };
}
const event = (eventType: string, object: unknown) => JSON.stringify({ eventType, object });
const parse = async (p: ReturnType<typeof creem>["p"], body: string) => p.parseWebhook(body, new Headers({ "creem-signature": sign(body) }));

test("a bad signature is rejected; the signature is HMAC-SHA256 hex over the raw body in creem-signature", async () => {
  const { p } = creem(() => new Response());
  const body = event("subscription.paid", { id: "sub_1" });
  await expect(p.parseWebhook(body, new Headers({ "creem-signature": "00" }))).rejects.toBeInstanceOf(WebhookRejectedError);
  expect(await parse(p, body)).toEqual([{ type: "renewed", providerRef: "sub_1", validUntil: null }]);
});

test("checkout.completed becomes started with the player from metadata; without one it is rejected", async () => {
  const { p } = creem(() => new Response());
  const end = "2026-12-03T00:00:00.000Z";
  expect(
    await parse(
      p,
      event("checkout.completed", { metadata: { player_id: "p1" }, customer: { id: "cust_1" }, subscription: { id: "sub_1", current_period_end_date: end } }),
    ),
  ).toEqual([{ type: "started", providerRef: "sub_1", playerId: "p1", customerRef: "cust_1", validUntil: Date.parse(end) }]);
  expect(await parse(p, event("checkout.completed", { request_id: "p2", subscription: { id: "sub_2" } }))).toMatchObject([{ playerId: "p2" }]);
  await expect(parse(p, event("checkout.completed", { subscription: { id: "sub_3" } }))).rejects.toBeInstanceOf(WebhookRejectedError);
});

test("subscription and refund events map to renewed, cancelled, ended and refunded; other kinds to nothing", async () => {
  const { p } = creem(() => new Response());
  const kinds = async (k: string, o: unknown) => (await parse(p, event(k, o))).map((e) => e.type);
  expect(await kinds("subscription.active", { id: "sub_1" })).toEqual(["renewed"]);
  expect(await kinds("subscription.canceled", { id: "sub_1" })).toEqual(["cancelled"]);
  expect(await kinds("subscription.scheduled_cancel", { id: "sub_1" })).toEqual(["cancelled"]);
  expect(await kinds("subscription.expired", { id: "sub_1" })).toEqual(["ended"]);
  expect(await kinds("subscription.unpaid", { id: "sub_1" })).toEqual(["ended"]);
  expect(await kinds("refund.created", { subscription: { id: "sub_1" } })).toEqual(["refunded"]);
  expect(await kinds("dispute.created", { subscription: "sub_1" })).toEqual(["refunded"]);
  expect(await kinds("subscription.trialing", { id: "sub_1" })).toEqual([]);
});

test("createCheckout sends product, success_url, request_id and metadata.player_id, to the sandbox for a test key", async () => {
  const { p, calls } = creem(() => Response.json({ checkout_url: "https://pay.example/c" }));
  expect(await p.createCheckout({ period: "year", playerId: "p1", email: "a@b.c", successUrl: "https://g.example/subscribe" })).toEqual({
    url: "https://pay.example/c",
  });
  expect(calls[0].url).toBe("https://test-api.creem.io/v1/checkouts");
  expect(JSON.parse(String(calls[0].init?.body))).toEqual({
    product_id: "prod_y",
    success_url: "https://g.example/subscribe",
    request_id: "p1",
    metadata: { player_id: "p1" },
    customer: { email: "a@b.c" },
  });
  const live = creem(() => Response.json({ checkout_url: "https://pay.example/c" }), "creem_live");
  await live.p.createCheckout({ period: "month", playerId: "p1", email: null, successUrl: "https://g.example/subscribe" });
  expect(live.calls[0].url).toBe("https://api.creem.io/v1/checkouts");
  const monthOnly = createCreem({
    apiKey: "creem_test_k",
    productId: "prod_m",
    webhookSecret: SECRET,
    fetch: (async () => new Response()) as unknown as typeof fetch,
  });
  await expect(monthOnly.createCheckout({ period: "year", playerId: "p1", email: null, successUrl: "x" })).rejects.toThrow(/no product/);
});

test("plans() reads both products, keeps them five minutes, and keeps the last list while Creem is down", async () => {
  vi.useFakeTimers();
  let down = false;
  const { p, calls } = creem(({ url }) => {
    if (down) throw new Error("down");
    const id = new URL(url).searchParams.get("product_id");
    return Response.json({
      status: "active",
      name: id === "prod_m" ? "Monthly" : "Yearly",
      price: id === "prod_m" ? 499 : 4990,
      currency: "EUR",
      tax_mode: "inclusive",
    });
  });
  const plans = await p.plans();
  expect(plans.map((x) => [x.period, x.amount])).toEqual([
    ["month", 499],
    ["year", 4990],
  ]);
  await p.plans();
  expect(calls).toHaveLength(2);
  vi.advanceTimersByTime(6 * 60 * 1000);
  down = true;
  expect(await p.plans()).toEqual(plans);
  vi.useRealTimers();
  resetPlansForTests();
  const never = creem(() => {
    throw new Error("down");
  });
  expect(await never.p.plans()).toEqual([]);
});

test("portalUrl posts the customer to /customers/billing; cancel ends a sub_ subscription at once and ignores other references", async () => {
  const { p, calls } = creem(({ url }) =>
    url.endsWith("/customers/billing") ? Response.json({ customer_portal_link: "https://portal.example" }) : Response.json({}),
  );
  expect(await p.portalUrl("cust_1")).toBe("https://portal.example");
  expect(JSON.parse(String(calls[0].init?.body))).toEqual({ customer_id: "cust_1" });
  await p.cancel("sub_1");
  expect(calls[1].url).toBe("https://test-api.creem.io/v1/subscriptions/sub_1/cancel");
  expect(JSON.parse(String(calls[1].init?.body))).toEqual({ mode: "immediate" });
  await p.cancel("ord_1");
  expect(calls).toHaveLength(2);
});
