// The free limit (#48, ADR 0023): one active game for a free player where the instance sells, every game for a subscriber, a free player
// or an instance without a provider; the rest frozen, readable and correctable. The Review Focus of the plan, case by case.
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { accessOf, chooseActiveGame, SubscriptionRequiredError } from "./access";
import { receiveWebhook, setEmailLookupForTests } from "./billing/flow";
import { billing, resetBillingForTests } from "./billing/store";
import { correct } from "./correct";
import { NotFoundError } from "./errors";
import { getPlaythrough, listPlaythroughs } from "./games";
import { fakeSignature } from "./payments";
import { record } from "./record";
import { seed, type Seed } from "./testing/fixtures";
import { toolByName } from "./tools";

let s: Seed;
const SECRET = "fake-secret";

beforeEach(async () => {
  s = await seed();
  await resetBillingForTests();
  vi.stubEnv("GAMEPANION_PAYMENT_PROVIDER", "fake");
  vi.stubEnv("GAMEPANION_FAKE_WEBHOOK_SECRET", SECRET);
  setEmailLookupForTests(async (id) => (id === s.a.id ? "ada@example.com" : "ben@example.com"));
});
afterEach(() => {
  vi.unstubAllEnvs();
  setEmailLookupForTests(null);
});

const file = (p: { id: string }, ref: { game?: string; playthroughId?: string; label?: string }) =>
  record(p, { ...ref, summary: "Played.", transcript: "Played a bit." });
const webhook = (events: unknown[]) => {
  const body = JSON.stringify(events);
  return receiveWebhook(body, new Headers({ "x-fake-signature": fakeSignature(SECRET, body) }));
};
const DAY = 86_400_000;

test("without a provider every game is open", async () => {
  vi.stubEnv("GAMEPANION_PAYMENT_PROVIDER", "");
  expect(await accessOf(s.a)).toEqual({ limited: false, subscribed: false, activeGameId: null });
  await file(s.a, { game: "Hollow Knight" });
  expect((await listPlaythroughs(s.a)).length).toBe(2);
});

test("a free player starts one game, and a second is refused with the subscribe link", async () => {
  const fresh = { id: "new-player" };
  await file(fresh, { game: "Hollow Knight" });
  const err = await file(fresh, { game: "Celeste" }).catch((e) => e);
  expect(err).toBeInstanceOf(SubscriptionRequiredError);
  expect(err.message).toMatch(/Free players keep one game, and Celeste would be a second.*\/subscribe.*call subscription.*Nothing was filed\./);
  expect((await listPlaythroughs(fresh)).map((t) => t.game.title)).toEqual(["Hollow Knight"]);
  // All the playthroughs of the free game are fine: an NG+ too.
  await file(fresh, { game: "Hollow Knight", label: "NG+" });
});

test("existing players keep one active game: the one played last stays, the others are frozen", async () => {
  vi.stubEnv("GAMEPANION_PAYMENT_PROVIDER", "");
  await record(s.a, { game: "Hollow Knight", summary: "x", transcript: "x", playedOn: "2026-10-01" });
  vi.stubEnv("GAMEPANION_PAYMENT_PROVIDER", "fake");
  const lies = await getPlaythrough(s.a, s.liesOfP);
  expect((await accessOf(s.a)).activeGameId).toBe(lies.game.id);
  await file(s.a, { playthroughId: s.liesOfP });
  await expect(file(s.a, { game: "Hollow Knight" })).rejects.toThrow(/Hollow Knight is frozen.*active game is Lies of P/);
});

test("record by id into a frozen game is refused", async () => {
  vi.stubEnv("GAMEPANION_PAYMENT_PROVIDER", "");
  const hk = await record(s.a, { game: "Hollow Knight", summary: "x", transcript: "x", playedOn: "2026-10-01" });
  vi.stubEnv("GAMEPANION_PAYMENT_PROVIDER", "fake");
  await expect(file(s.a, { playthroughId: hk.playthrough.id })).rejects.toBeInstanceOf(SubscriptionRequiredError);
  const brief = await toolByName("briefing")!.run(s.a, { playthroughId: hk.playthrough.id });
  expect((brief.next as string[]).join("\n")).toMatch(/This game is frozen/);
});

test("correct still edits and removes rows in a frozen game", async () => {
  vi.stubEnv("GAMEPANION_PAYMENT_PROVIDER", "");
  const hk = await record(s.a, { game: "Hollow Knight", summary: "x", transcript: "x", playedOn: "2026-10-01", quests: [{ name: "Grubs" }] });
  vi.stubEnv("GAMEPANION_PAYMENT_PROVIDER", "fake");
  await correct(s.a, [{ what: "quest", id: hk.quests[0].id, name: "Grubfather" }]);
  await correct(s.a, [{ what: "quest", id: hk.quests[0].id, remove: true }]);
});

test("a subscriber files into any game; after the subscription ends the most recently played game stays active", async () => {
  await webhook([{ type: "started", providerRef: "sub_1", playerId: s.a.id, customerRef: "c1", validUntil: Date.now() + 30 * DAY }]);
  expect(await accessOf(s.a)).toMatchObject({ limited: false, subscribed: true });
  await record(s.a, { game: "Hollow Knight", summary: "x", transcript: "x", playedOn: "2026-11-01" });
  await webhook([{ type: "ended", providerRef: "sub_1" }]);
  const a = await accessOf(s.a);
  const hk = (await listPlaythroughs(s.a)).find((t) => t.game.title === "Hollow Knight")!;
  expect(a).toMatchObject({ limited: true, activeGameId: hk.game.id });
  await expect(file(s.a, { playthroughId: s.liesOfP })).rejects.toBeInstanceOf(SubscriptionRequiredError);
  // Subscribing again unfreezes everything.
  await webhook([{ type: "started", providerRef: "sub_2", playerId: s.a.id, customerRef: "c1", validUntil: null }]);
  await file(s.a, { playthroughId: s.liesOfP });
});

test("a chosen game stays active; choosing someone else's is not found", async () => {
  vi.stubEnv("GAMEPANION_PAYMENT_PROVIDER", "");
  const hk = await record(s.a, { game: "Hollow Knight", summary: "x", transcript: "x", playedOn: "2026-11-01" });
  vi.stubEnv("GAMEPANION_PAYMENT_PROVIDER", "fake");
  const lies = await getPlaythrough(s.a, s.liesOfP);
  await chooseActiveGame(s.a, lies.game.id);
  expect((await accessOf(s.a)).activeGameId).toBe(lies.game.id);
  await expect(file(s.a, { playthroughId: hk.playthrough.id })).rejects.toBeInstanceOf(SubscriptionRequiredError);
  const elden = await getPlaythrough(s.b, s.eldenRing);
  await expect(chooseActiveGame(s.a, elden.game.id)).rejects.toBeInstanceOf(NotFoundError);
});

test("free players are exempt", async () => {
  vi.stubEnv("GAMEPANION_FREE_PLAYERS", "@example.com");
  expect((await accessOf(s.a)).limited).toBe(false);
  await file(s.a, { game: "Hollow Knight" });
});

test("deleting the only game lets a new one start; deleting the chosen game falls back to the most recent", async () => {
  const fresh = { id: "new-player" };
  const hk = await file(fresh, { game: "Hollow Knight" });
  await correct(fresh, [{ what: "game", id: hk.playthrough.game.id, remove: true }]);
  await file(fresh, { game: "Celeste" });

  vi.stubEnv("GAMEPANION_PAYMENT_PROVIDER", "");
  const later = await record(s.a, { game: "Hollow Knight", summary: "x", transcript: "x", playedOn: "2026-11-01" });
  vi.stubEnv("GAMEPANION_PAYMENT_PROVIDER", "fake");
  const lies = await getPlaythrough(s.a, s.liesOfP);
  await chooseActiveGame(s.a, lies.game.id);
  await correct(s.a, [{ what: "game", id: lies.game.id, remove: true }]);
  expect((await accessOf(s.a)).activeGameId).toBe(later.playthrough.game.id);
});

test("POST /api/v1/sessions for a second game answers 402 subscription_required", async () => {
  const { errorReply } = await import("./http/errors");
  const err = await file(s.a, { game: "Hollow Knight" }).catch((e) => e);
  expect(errorReply(err)).toMatchObject({ status: 402, body: { code: "subscription_required" } });
});

test("accessOf of one player ignores the other's games and choices", async () => {
  const elden = await getPlaythrough(s.b, s.eldenRing);
  await (await billing()).chooseGame(s.a.id, elden.game.id);
  const lies = await getPlaythrough(s.a, s.liesOfP);
  expect((await accessOf(s.a)).activeGameId).toBe(lies.game.id);
  expect((await accessOf(s.b)).activeGameId).toBe(elden.game.id);
});
