// The subscription tool (#114): over MCP, the player's subscription and the way to Creem's own pages, to buy (a checkout made for them)
// or to see and cancel (their customer portal); nothing to buy where nothing is sold; payment never in the chat.
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { receiveWebhook, setEmailLookupForTests } from "./billing/flow";
import { resetBillingForTests } from "./billing/store";
import { InvalidInputError } from "./errors";
import { fakeSignature } from "./payments";
import { seed, type Seed } from "./testing/fixtures";
import { toolByName } from "./tools";

const SECRET = "fake-secret";
let s: Seed;
const run = (p: { id: string }, args: unknown) => toolByName("subscription")!.run(p, args);
const next = (out: Record<string, unknown>) => (out.next as string[]).join(" ");

beforeEach(async () => {
  s = await seed();
  await resetBillingForTests();
  setEmailLookupForTests(async () => "player@example.com");
});
afterEach(() => {
  vi.unstubAllEnvs();
  setEmailLookupForTests(null);
});
const sell = () => {
  vi.stubEnv("GAMEPANION_PAYMENT_PROVIDER", "fake");
  vi.stubEnv("GAMEPANION_FAKE_WEBHOOK_SECRET", SECRET);
};

test("where nothing is sold there is nothing to buy, and no link", async () => {
  const out = await run(s.a, {});
  expect(out).toMatchObject({ sold: false, url: null, plans: [] });
  expect(next(out)).toMatch(/sells nothing/);
});

test("a free player gets the plans and the plans page; with plan and period, a link straight to the checkout", async () => {
  sell();
  const out = await run(s.a, {});
  expect(out).toMatchObject({ sold: true, subscribed: false, plan: null, url: "http://localhost:3000/subscribe" });
  expect((out.plans as unknown[]).length).toBe(4);
  expect(next(out)).toMatch(/Never ask for card/);
  const buy = await run(s.a, { plan: "hostedAi", period: "year" });
  expect(buy.url).toContain(`checkout_id=fake_hostedAi_${s.a.id}`);
  expect(next(buy)).toMatch(/call subscription again to check/);
  await expect(run(s.a, { plan: "standard" })).rejects.toBeInstanceOf(InvalidInputError);
});

test("a subscriber gets their plan, until when, and their own Creem portal", async () => {
  sell();
  const body = JSON.stringify([
    { type: "started", providerRef: "sub_1", playerId: s.a.id, customerRef: "cust_1", validUntil: Date.UTC(2027, 10, 4), tier: "standard" },
  ]);
  await receiveWebhook(body, new Headers({ "x-fake-signature": fakeSignature(SECRET, body) }));
  const out = await run(s.a, {});
  expect(out).toMatchObject({ subscribed: true, plan: "standard", validUntil: "2027-11-04", url: "https://fake.invalid/portal/cust_1" });
  expect(next(out)).toMatch(/cancel/);
  // Another player sees nothing of it.
  expect(await run(s.b, {})).toMatchObject({ subscribed: false, plan: null });
});
