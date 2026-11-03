// A player's own Anthropic key (#76, ADR 0021): stored encrypted, shown only by its last four characters, used by the chat instead of the
// instance's key, never replaced by the instance's when Anthropic refuses it, never read by another player, and gone with the account.
import Anthropic from "@anthropic-ai/sdk";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { chat, type ChatModel } from "./chat";
import { chatEnabled, chatModelFor, setChatClientForTests, setChatModelForTests } from "./chat-route";
import { db } from "./db/testing";
import { keyStatus, playerKey, removeKey, saveKey, setKeyCheckerForTests, testKey } from "./keys";
import { deletePlayerLog } from "./players";
import { seed, type Seed } from "./testing/fixtures";
import { TOOLS, toolByName } from "./tools";

const KEY = "sk-ant-api03-" + "x".repeat(40) + "WXYZ";
const OPERATOR = "sk-ant-operator-key";
let s: Seed;

beforeEach(async () => {
  s = await seed();
  vi.stubEnv("GAMEPANION_KEY_ENCRYPTION_KEY", "ab".repeat(32));
});
afterEach(() => {
  vi.unstubAllEnvs();
  setChatClientForTests(null);
  setChatModelForTests(null);
  setKeyCheckerForTests(null);
});

const ask = [{ role: "user" as const, content: "Where was I?" }];
const refusing = (status: number, message = "nope"): ChatModel => ({
  async create() {
    throw Anthropic.APIError.generate(status, { error: { message } }, message, new Headers());
  },
});

test("saving a key stores only ciphertext; reads show its last four characters", async () => {
  expect(await saveKey(s.a, ` ${KEY} `)).toMatchObject({ last4: "WXYZ" });
  const rows = await (await db()).selectFrom("player_keys").selectAll().execute();
  expect(rows).toHaveLength(1);
  expect(JSON.stringify(rows)).not.toContain(KEY);
  expect(JSON.stringify(rows)).not.toContain("x".repeat(40));
  expect(await keyStatus(s.a)).toMatchObject({ last4: "WXYZ" });
  expect(await playerKey(s.a)).toBe(KEY);
  await expect(saveKey(s.a, "not a key")).rejects.toThrow(/Anthropic API key/);
});

test("without GAMEPANION_KEY_ENCRYPTION_KEY nothing is stored and nothing is read", async () => {
  vi.stubEnv("GAMEPANION_KEY_ENCRYPTION_KEY", "");
  await expect(saveKey(s.a, KEY)).rejects.toThrow(/doesn't store/);
  expect(await keyStatus(s.a)).toBeNull();
  vi.stubEnv("GAMEPANION_KEY_ENCRYPTION_KEY", "short");
  await expect(saveKey(s.a, KEY)).rejects.toThrow(/64 hex characters/);
});

test("the chat runs on the player's key when set, on the instance's when not", async () => {
  vi.stubEnv("GAMEPANION_ANTHROPIC_API_KEY", OPERATOR);
  const made: string[] = [];
  setChatClientForTests((apiKey) => (made.push(apiKey), { create: async () => ({}) as Anthropic.Beta.BetaMessage }));
  expect((await chatModelFor(s.a))?.own).toBeFalsy();
  await saveKey(s.a, KEY);
  expect((await chatModelFor(s.a))?.own).toBe(true);
  expect((await chatModelFor(s.b))?.own).toBeFalsy();
  expect(made).toEqual([OPERATOR, KEY, OPERATOR]);
  await removeKey(s.a);
  expect((await chatModelFor(s.a))?.own).toBeFalsy();
});

test("a player with a key gets the chat on an instance without a key of its own", async () => {
  vi.stubEnv("GAMEPANION_ANTHROPIC_API_KEY", "");
  expect(await chatEnabled(s.a)).toBe(false);
  await saveKey(s.a, KEY);
  expect(await chatEnabled(s.a)).toBe(true);
  expect(await chatEnabled(s.b)).toBe(false);
});

test("a refused or out-of-credit player key ends with own_key_rejected, and the instance's key is never tried", async () => {
  vi.stubEnv("GAMEPANION_ANTHROPIC_API_KEY", OPERATOR);
  await saveKey(s.a, KEY);
  const made: string[] = [];
  setChatClientForTests((apiKey) => (made.push(apiKey), refusing(401)));
  const m = (await chatModelFor(s.a))!;
  expect(await chat(s.a, ask, {}, m)).toEqual({ code: "own_key_rejected" });
  expect(made).toEqual([KEY]);
  expect(await chat(s.a, ask, {}, { ...refusing(400, "Your credit balance is too low"), own: true })).toEqual({ code: "own_key_rejected" });
  // The instance's key failing is the instance's problem, not the player's.
  expect(await chat(s.b, ask, {}, refusing(401))).toEqual({ code: "chat_unavailable" });
});

test("test key makes one call with the given or the stored key", async () => {
  const tried: string[] = [];
  setKeyCheckerForTests(async (k) => (tried.push(k), k === KEY ? { ok: true } : { ok: false, reason: "rejected" }));
  expect(await testKey(s.a, KEY)).toEqual({ ok: true });
  await expect(testKey(s.a)).rejects.toThrow(/No key to test/);
  await saveKey(s.a, KEY);
  expect(await testKey(s.a)).toEqual({ ok: true });
  expect(await testKey(s.a, "sk-ant-api03-" + "y".repeat(40))).toEqual({ ok: false, reason: "rejected" });
  expect(tried).toHaveLength(3);
});

test("the MCP tool hands out the settings link and nothing of the key; no tool result carries a key", async () => {
  await saveKey(s.a, KEY);
  const out = await toolByName("chat_key")!.run(s.a, {});
  expect(out.url).toBe("/account#key");
  expect(out.keyStorage).toBe(true);
  expect((out.next as string[]).join(" ")).toMatch(/Never ask for the key in this chat/);
  for (const t of TOOLS.filter((x) => x.annotations.readOnlyHint && x.name !== "missed")) {
    const body = JSON.stringify(await t.run(s.a, { playthroughId: s.liesOfP }));
    expect(body).not.toContain(KEY);
    expect(body).not.toContain("WXYZ");
  }
});

test("another player never reads or uses someone's key, and a copied row doesn't decrypt", async () => {
  await saveKey(s.a, KEY);
  expect(await keyStatus(s.b)).toBeNull();
  expect(await playerKey(s.b)).toBeNull();
  const d = await db();
  const row = await d.selectFrom("player_keys").selectAll().where("player_id", "=", s.a.id).executeTakeFirstOrThrow();
  await d
    .insertInto("player_keys")
    .values({ ...row, player_id: s.b.id })
    .execute();
  expect(await playerKey(s.b)).toBeNull();
  await removeKey(s.b);
  expect(await playerKey(s.a)).toBe(KEY);
});

test("deleting the account deletes the stored key", async () => {
  await saveKey(s.a, KEY);
  await deletePlayerLog(s.a);
  expect(await (await db()).selectFrom("player_keys").selectAll().execute()).toEqual([]);
});
