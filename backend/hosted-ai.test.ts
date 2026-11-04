// The hosted-AI tier (#56, ADR 0024): the instance's key only for players on "Subscription + hosted AI" where the instance sells, within a
// monthly quota, a per-minute rate and a reply cap; everyone else on their own key; nothing changes without a payment provider.
import Anthropic from "@anthropic-ai/sdk";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { receiveWebhook, setEmailLookupForTests } from "./billing/flow";
import { resetBillingForTests } from "./billing/store";
import type { ChatModel } from "./chat";
import { chatFor, chatPlan, chatWithoutOwnKey, setChatModelForTests, voiceFor, voiceEnabled } from "./chat-route";
import { countUsage, quotaLeft, resetRateForTests, takeRate } from "./hosted-ai";
import { saveKey } from "./keys";
import { fakeSignature } from "./payments";
import { seed, type Seed } from "./testing/fixtures";
import { setTranscriberForTests } from "./transcribe";

const SECRET = "fake-secret";
let s: Seed;

type Params = Anthropic.Beta.MessageCreateParamsNonStreaming;
const calls: Params[] = [];
const model: ChatModel = {
  async create(params) {
    calls.push(structuredClone(params));
    return {
      id: "m",
      type: "message",
      role: "assistant",
      model: "fake",
      usage: { input_tokens: 700, output_tokens: 300 },
      stop_reason: "end_turn",
      content: [{ type: "text", text: "Hi.", citations: null }],
    } as unknown as Anthropic.Beta.BetaMessage;
  },
};

beforeEach(async () => {
  s = await seed();
  await resetBillingForTests();
  resetRateForTests();
  calls.length = 0;
  setChatModelForTests(model);
  setEmailLookupForTests(async () => "player@example.com");
});
afterEach(() => {
  vi.unstubAllEnvs();
  setChatModelForTests(null);
  setEmailLookupForTests(null);
  setTranscriberForTests(null);
});

const sell = () => {
  vi.stubEnv("GAMEPANION_PAYMENT_PROVIDER", "fake");
  vi.stubEnv("GAMEPANION_FAKE_WEBHOOK_SECRET", SECRET);
};
const subscribe = async (p: { id: string }, tier: "standard" | "hostedAi") => {
  const body = JSON.stringify([{ type: "started", providerRef: `sub_${p.id}`, playerId: p.id, customerRef: null, validUntil: null, tier }]);
  await receiveWebhook(body, new Headers({ "x-fake-signature": fakeSignature(SECRET, body) }));
};
const ask = () => new Request("http://localhost/api/chat", { method: "POST", body: JSON.stringify({ turns: [{ role: "user", content: "Where was I?" }] }) });
const code = async (r: Response) => ((await r.json()) as { code?: string }).code;

test("without a payment provider, behaviour is unchanged: the instance's key for everyone, nothing counted", async () => {
  expect(await chatPlan(s.a)).toMatchObject({ counted: false });
  expect((await chatFor(s.a, ask())).status).toBe(200);
  expect(calls[0].max_tokens).toBe(16000);
});

test("a free or plain subscriber without a key can't reach the instance's key: the chat says what it needs", async () => {
  sell();
  expect(await chatPlan(s.a)).toEqual({ needsKey: true });
  expect(await code(await chatFor(s.a, ask()))).toBe("needs_key");
  await subscribe(s.a, "standard");
  expect(await code(await chatFor(s.a, ask()))).toBe("needs_key");
  expect(calls).toHaveLength(0);
  // Their own key works, and never counts.
  vi.stubEnv("GAMEPANION_KEY_ENCRYPTION_KEY", "ab".repeat(32));
  await saveKey(s.a, "sk-ant-api03-" + "x".repeat(40));
  expect(await chatPlan(s.a)).toMatchObject({ counted: false });
});

test("a player in GAMEPANION_FREE_PLAYERS runs on the instance's key, uncounted, and may speak; others on the free tier don't", async () => {
  sell();
  setTranscriberForTests({ transcribe: async () => ({ text: "Hi." }) });
  vi.stubEnv("GAMEPANION_FREE_PLAYERS", "@gamepanion.app,me@example.com");
  setEmailLookupForTests(async (id) => (id === s.a.id ? "Crew@Gamepanion.app" : "player@example.com"));
  expect(await chatPlan(s.a)).toMatchObject({ counted: false });
  expect((await chatFor(s.a, ask())).status).toBe(200);
  expect(calls[0].max_tokens).toBe(16000);
  expect(await voiceEnabled(s.a)).toBe(true);
  expect(await chatPlan(s.b)).toEqual({ needsKey: true });
  expect(await voiceEnabled(s.b)).toBe(false);
});

test("a hosted-AI player runs on the instance's key with the cap and the guardrails, and every round counts", async () => {
  sell();
  await subscribe(s.a, "hostedAi");
  expect(await chatPlan(s.a)).toMatchObject({ counted: true });
  expect((await chatFor(s.a, ask())).status).toBe(200);
  expect(calls[0].max_tokens).toBe(4000);
  expect(JSON.stringify(calls[0].system)).toMatch(/Keep to the player's own game/);
  expect((await quotaLeft(s.a)).tokens).toBe(2_000_000 - 1000);
});

test("over quota a hosted-AI player is refused with the offer of their own key; next month the counter resets", async () => {
  sell();
  await subscribe(s.a, "hostedAi");
  const nov = new Date("2026-11-20T12:00:00Z");
  await countUsage(s.a, { tokens: 2_000_000 }, nov);
  expect((await quotaLeft(s.a, nov)).tokens).toBe(0);
  vi.useFakeTimers({ now: nov, toFake: ["Date"] });
  expect(await code(await chatFor(s.a, ask()))).toBe("quota_used");
  vi.useRealTimers();
  expect((await quotaLeft(s.a, new Date("2026-12-01T12:00:00Z"))).tokens).toBe(2_000_000);
});

test("the per-minute rate is enforced", async () => {
  vi.stubEnv("GAMEPANION_AI_PER_MINUTE", "2");
  expect([takeRate(s.a, 0), takeRate(s.a, 1000), takeRate(s.a, 2000), takeRate(s.b, 2000), takeRate(s.a, 61_000)]).toEqual([true, true, false, true, true]);
  sell();
  await subscribe(s.a, "hostedAi");
  resetRateForTests();
  await chatFor(s.a, ask());
  await chatFor(s.a, ask());
  const third = await chatFor(s.a, ask());
  expect([third.status, await code(third)]).toEqual([429, "rate_limited"]);
});

test("transcription is for hosted-AI players where the instance sells, and counts its seconds", async () => {
  setTranscriberForTests({ transcribe: async () => ({ text: "Beat the boss." }) });
  const speak = (seconds: number) =>
    new Request("http://localhost/api/chat/voice", {
      method: "POST",
      body: new Uint8Array([1, 2, 3]),
      headers: { "content-type": "audio/webm", "x-audio-seconds": String(seconds) },
    });
  expect(await voiceEnabled(s.a)).toBe(true); // no provider: as before
  sell();
  expect(await voiceEnabled(s.a)).toBe(false);
  expect((await voiceFor(s.a, speak(30))).status).toBe(404);
  await subscribe(s.a, "hostedAi");
  expect(await (await voiceFor(s.a, speak(30))).json()).toEqual({ text: "Beat the boss." });
  expect((await quotaLeft(s.a)).seconds).toBe(60 * 60 - 30);
  await countUsage(s.a, { seconds: 60 * 60 - 40 });
  const over = await voiceFor(s.a, speak(30));
  expect([over.status, await code(over)]).toEqual([429, "quota_used"]);
});

test("the account page knows what the chat runs on without a key: the instance's, nothing until a key or the AI plan, or no chat", async () => {
  expect(await chatWithoutOwnKey(s.a)).toBe("instance");
  sell();
  expect(await chatWithoutOwnKey(s.a)).toBe("needsKey");
  await subscribe(s.a, "standard");
  expect(await chatWithoutOwnKey(s.a)).toBe("needsKey");
  await subscribe(s.a, "hostedAi");
  expect(await chatWithoutOwnKey(s.a)).toBe("instance");
  vi.unstubAllEnvs();
  setChatModelForTests(null);
  expect(await chatWithoutOwnKey(s.b)).toBe("none");
});
