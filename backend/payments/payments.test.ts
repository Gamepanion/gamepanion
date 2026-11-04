// The payment providers (#48): the fake signs and parses its own events; Creem's SDK (#107) checkout, plans, portal and cancel against a
// stand-in fetch. Creem's deliveries are app/api/payments/webhook/route.test.ts's.
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { config } from "../config";
import { createCreem, resetPlansForTests } from "./creem-api";
import { createFake, fakeSignature } from "./fake";
import { WebhookRejectedError } from "./types";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
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
  expect(await f.parseWebhook!(body, new Headers({ "x-fake-signature": fakeSignature("s3cret", body) }))).toEqual([
    { type: "renewed", providerRef: "sub_1", validUntil: 5 },
  ]);
  await expect(f.parseWebhook!(body, new Headers({ "x-fake-signature": "nope" }))).rejects.toBeInstanceOf(WebhookRejectedError);
  expect((await f.plans()).map((p) => [p.period, p.tier, p.amount])).toEqual([
    ["month", "standard", 499],
    ["year", "standard", 4990],
    ["month", "hostedAi", 999],
    ["year", "hostedAi", 9990],
  ]);
});

// The SDK, against a stand-in fetch.
type Call = { method: string; url: string; body: string };
function creem(handler: (c: Call) => Response | Promise<Response>, apiKey = "creem_test_k") {
  const calls: Call[] = [];
  vi.stubGlobal("fetch", async (input: Request | string | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init);
    const c = { method: req.method, url: req.url, body: await req.text() };
    calls.push(c);
    return handler(c);
  });
  return { p: createCreem({ apiKey, productId: "prod_m", yearlyProductId: "prod_y" }), calls };
}
const subscriptionJson = {
  id: "sub_1",
  object: "subscription",
  mode: "test",
  product: "prod_m",
  customer: "cust_1",
  collection_method: "charge_automatically",
  status: "canceled",
  created_at: "2026-10-19T00:00:00.000Z",
  updated_at: "2026-10-19T00:00:00.000Z",
};
const productJson = (id: string, price: number) => ({
  id,
  object: "product",
  mode: "test",
  name: id === "prod_m" ? "Monthly" : "Yearly",
  description: "Gamepanion",
  price,
  currency: "EUR",
  billing_type: "recurring",
  billing_period: id === "prod_m" ? "every-month" : "every-year",
  status: "active",
  tax_mode: "inclusive",
  tax_category: "saas",
  created_at: "2026-10-19T00:00:00.000Z",
  updated_at: "2026-10-19T00:00:00.000Z",
});

test("createCheckout sends product, success_url and metadata.player_id, to the sandbox for a test key", async () => {
  const answer = () =>
    Response.json({ id: "ch_1", object: "checkout", mode: "test", status: "pending", product: "prod_y", checkout_url: "https://pay.example/c" });
  const { p, calls } = creem(answer);
  expect(await p.createCheckout({ period: "year", playerId: "p1", email: "a@b.c", successUrl: "https://g.example/subscribe" })).toEqual({
    url: "https://pay.example/c",
  });
  expect(calls[0].url).toBe("https://test-api.creem.io/v1/checkouts");
  expect(JSON.parse(calls[0].body)).toEqual({
    product_id: "prod_y",
    success_url: "https://g.example/subscribe",
    metadata: { player_id: "p1" },
    customer: { email: "a@b.c" },
  });
  const live = creem(answer, "creem_live");
  await live.p.createCheckout({ period: "month", playerId: "p1", email: null, successUrl: "https://g.example/subscribe" });
  expect(live.calls[0].url).toBe("https://api.creem.io/v1/checkouts");
  const monthOnly = createCreem({ apiKey: "creem_test_k", productId: "prod_m" });
  await expect(monthOnly.createCheckout({ period: "year", playerId: "p1", email: null, successUrl: "x" })).rejects.toThrow(/no product/);
});

test("plans() reads both products, keeps them five minutes, and keeps the last list while Creem is down", async () => {
  vi.useFakeTimers();
  let down = false;
  const { p, calls } = creem(({ url }) => {
    if (down) throw new Error("down");
    const id = new URL(url).pathname.split("/").pop()!;
    return Response.json(productJson(id, id === "prod_m" ? 499 : 4990));
  });
  const plans = await p.plans();
  expect(plans.map((x) => [x.period, x.amount, x.taxIncluded])).toEqual([
    ["month", 499, true],
    ["year", 4990, true],
  ]);
  expect(calls[0].url).toBe("https://test-api.creem.io/v1/products/prod_m");
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
  resetPlansForTests();
  const gone = creem(({ url }) =>
    url.endsWith("prod_y") ? Response.json({ error: "not found" }, { status: 404 }) : Response.json(productJson("prod_m", 499)),
  );
  expect((await gone.p.plans()).map((x) => x.period)).toEqual(["month"]);
});

test("portalUrl asks for the customer's billing links; cancel ends the subscription at once", async () => {
  const { p, calls } = creem(({ url }) =>
    url.endsWith("/customers/billing") ? Response.json({ customer_portal_link: "https://portal.example" }) : Response.json(subscriptionJson),
  );
  expect(await p.portalUrl("cust_1")).toBe("https://portal.example");
  expect(JSON.parse(calls[0].body)).toEqual({ customer_id: "cust_1" });
  await p.cancel("sub_1");
  expect(calls[1].url).toBe("https://test-api.creem.io/v1/subscriptions/sub_1/cancel");
  expect(JSON.parse(calls[1].body)).toEqual({ mode: "immediate" });
});
