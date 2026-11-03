// From checkout to subscriber (#48): webhook events in any order, refunds cancelled at the provider, the route's answers, account
// deletion, and the yearly saving.
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { accessOf } from "../access";
import { resetDbForTests } from "../db/testing";
import { fakeCancelled, fakeSignature } from "../payments";
import { deletePlayerLog } from "../players";
import { pricingPlans, paymentsWebhookRoute, receiveWebhook, setEmailLookupForTests, startCheckout, yearlySaving } from "./flow";
import { billing, resetBillingForTests } from "./store";

const SECRET = "fake-secret";
const p = { id: "p1" };
const DAY = 86_400_000;

beforeEach(async () => {
  await resetDbForTests();
  await resetBillingForTests();
  vi.stubEnv("GAMEPANION_PAYMENT_PROVIDER", "fake");
  vi.stubEnv("GAMEPANION_FAKE_WEBHOOK_SECRET", SECRET);
  setEmailLookupForTests(async () => "p1@example.com");
});
afterEach(() => {
  vi.unstubAllEnvs();
  setEmailLookupForTests(null);
});

const post = (events: unknown[], signature?: string) => {
  const body = JSON.stringify(events);
  return new Request("http://localhost/api/payments/webhook", {
    method: "POST",
    body,
    headers: { "x-fake-signature": signature ?? fakeSignature(SECRET, body) },
  });
};
const send = async (events: unknown[]) => {
  const body = JSON.stringify(events);
  return receiveWebhook(body, new Headers({ "x-fake-signature": fakeSignature(SECRET, body) }));
};

test("a started event makes the player a subscriber until validUntil", async () => {
  await send([{ type: "started", providerRef: "sub_1", playerId: "p1", customerRef: "c1", validUntil: Date.now() + DAY }]);
  expect((await accessOf(p)).subscribed).toBe(true);
});

test("renewed before started is skipped without an error; started twice is one row", async () => {
  await expect(send([{ type: "renewed", providerRef: "sub_1", validUntil: Date.now() + DAY }])).resolves.toBe(1);
  await send([{ type: "started", providerRef: "sub_1", playerId: "p1", customerRef: null, validUntil: Date.now() + DAY }]);
  await send([{ type: "started", providerRef: "sub_1", playerId: "p1", customerRef: null, validUntil: Date.now() + DAY }]);
  expect(await (await billing()).ofPlayer("p1")).toHaveLength(1);
});

test("cancelled keeps access until validUntil; ended lapses at once; cancelled after ended causes no error", async () => {
  await send([{ type: "started", providerRef: "sub_1", playerId: "p1", customerRef: null, validUntil: Date.now() + DAY }]);
  await send([{ type: "cancelled", providerRef: "sub_1", validUntil: Date.now() + DAY }]);
  expect((await accessOf(p)).subscribed).toBe(true);
  await send([{ type: "ended", providerRef: "sub_1" }]);
  expect((await accessOf(p)).subscribed).toBe(false);
  await expect(send([{ type: "cancelled", providerRef: "sub_1", validUntil: null }])).resolves.toBe(1);
});

test("refunded lapses and cancels at the provider", async () => {
  await send([{ type: "started", providerRef: "sub_9", playerId: "p1", customerRef: null, validUntil: null }]);
  await send([{ type: "refunded", providerRef: "sub_9" }]);
  expect((await accessOf(p)).subscribed).toBe(false);
  expect(fakeCancelled).toContain("sub_9");
});

test("the route answers 400 for a bad signature and 404 without a provider", async () => {
  expect((await paymentsWebhookRoute(post([], "nope"))).status).toBe(400);
  expect(await (await paymentsWebhookRoute(post([]))).json()).toEqual({ received: 0 });
  vi.stubEnv("GAMEPANION_PAYMENT_PROVIDER", "");
  expect((await paymentsWebhookRoute(post([]))).status).toBe(404);
  await expect(startCheckout(p, "month")).rejects.toThrow(/Nothing is sold/);
});

test("the checkout goes back to /subscribe, carrying the player", async () => {
  expect((await startCheckout(p, "year")).url).toMatch(/\/subscribe\?checkout_id=fake_standard_p1$/);
  expect((await startCheckout(p, "month", "hostedAi")).url).toMatch(/checkout_id=fake_hostedAi_p1$/);
});

test("deleting a player's log forgets their billing rows", async () => {
  await send([{ type: "started", providerRef: "sub_1", playerId: "p1", customerRef: null, validUntil: null }]);
  await deletePlayerLog(p);
  expect(await (await billing()).ofPlayer("p1")).toEqual([]);
});

test("pricingPlans computes the yearly saving from the two plans, yearly first", async () => {
  const { plans, yearlySavingPercent, hostedAiSavingPercent } = await pricingPlans();
  expect(plans.map((x) => `${x.tier} ${x.period}`)).toEqual(["standard year", "standard month", "hostedAi year", "hostedAi month"]);
  expect([yearlySavingPercent, hostedAiSavingPercent]).toEqual([17, 17]);
  expect(yearlySaving([{ period: "month", tier: "standard", name: "m", amount: 499, currency: "EUR", taxIncluded: true }])).toBeNull();
});
