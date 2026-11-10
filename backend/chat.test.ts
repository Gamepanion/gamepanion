// The in-app chat (ADR 0013): the tool loop runs as the player, a card's row goes along read through the gate, record's transcript is
// the player's own words, and the daily limit and API failures end a message cleanly. Claude is a scripted stand-in.
import Anthropic from "@anthropic-ai/sdk";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { chat, linksOf, type ChatModel } from "./chat";
import { chatFor, chatRoute, setChatModelForTests, voiceRoute } from "./chat-route";
import { itemsOf } from "./items";
import { sessionsOf } from "./sessions";
import { seed, SPOILER_ITEM, type Seed } from "./testing/fixtures";
import { setTranscriberForTests, whisperTranscriber } from "./transcribe";

let s: Seed;
beforeEach(async () => {
  s = await seed();
});
afterEach(() => {
  vi.unstubAllEnvs();
  delete process.env.GAMEPANION_CHAT_DAILY_LIMIT;
  setChatModelForTests(null);
  setTranscriberForTests(null);
});

type Params = Anthropic.Beta.MessageCreateParamsNonStreaming;
const message = (content: unknown[], stop_reason: string) =>
  ({ id: "m", type: "message", role: "assistant", model: "fake", usage: {}, stop_reason, content }) as unknown as Anthropic.Beta.BetaMessage;
const say = (text: string) => message([{ type: "text", text, citations: null }], "end_turn");
const use = (name: string, input: unknown) => message([{ type: "tool_use", id: `use_${name}`, name, input }], "tool_use");

/** A stand-in that answers with `script` in turn and keeps every request it got. */
function scripted(...script: Anthropic.Beta.BetaMessage[]): ChatModel & { calls: Params[] } {
  const calls: Params[] = [];
  return {
    calls,
    async create(p) {
      calls.push(structuredClone(p));
      return script.shift() ?? say("Done.");
    },
  };
}
const situation = (p: Params) => (p.system as Anthropic.Beta.BetaTextBlockParam[])[1].text;
const ask = (content: string) => [{ role: "user" as const, content }];

test("a reply comes back; the situation names the playthrough and the row the chat was opened on, read without spoilers", async () => {
  const saber = (await itemsOf(s.a, s.liesOfP)).find((i) => i.name === "Puppet Saber")!;
  const m = scripted(say("It's your sword."));
  const out = await chat(s.a, ask("What is this?"), { playthroughId: s.liesOfP, about: { kind: "item", id: saber.id }, language: "de" }, m);
  expect(out).toEqual({ reply: "It's your sword.", links: [], filed: false });
  const text = situation(m.calls[0]);
  expect(text).toMatch(/Lies of P/);
  expect(text).toMatch(/German/);
  expect(text).toMatch(new RegExp(`what=item, id ${saber.id}`));
  expect(text).toMatch(/Puppet Saber/);
  expect(JSON.stringify(m.calls[0])).not.toContain(SPOILER_ITEM);
});

test("another player's playthrough or row tells Claude nothing about it", async () => {
  const m = scripted(say("Which game?"));
  await chat(s.a, ask("Hi"), { playthroughId: s.eldenRing, about: { kind: "quest", id: s.ranni } }, m);
  expect(situation(m.calls[0])).toMatch(/contents page/);
  expect(JSON.stringify(m.calls[0])).not.toMatch(/Ranni|Elden/);
});

test("a correction runs as the player; what it changed comes back as links and filed", async () => {
  const saber = (await itemsOf(s.a, s.liesOfP)).find((i) => i.name === "Puppet Saber")!;
  const m = scripted(use("correct", { changes: [{ what: "item", id: saber.id, quantity: 2 }] }), say("Fixed: you have two."));
  const out = await chat(s.a, ask("I have two of these"), { playthroughId: s.liesOfP, about: { kind: "item", id: saber.id } }, m);
  expect(out).toMatchObject({ reply: "Fixed: you have two.", filed: true, links: [{ name: "Puppet Saber" }] });
  expect((await itemsOf(s.a, s.liesOfP)).find((i) => i.id === saber.id)!.quantity).toBe(2);
  // The tool's result went back to Claude in the same conversation, after its own turn.
  const second = m.calls[1].messages;
  expect(second[1].role).toBe("assistant");
  expect(JSON.stringify(second[2].content)).toMatch(/tool_result/);
});

test("record files the player's own words since the last filing as the session's transcript", async () => {
  const before = (await sessionsOf(s.a, s.liesOfP)).length;
  const m = scripted(use("record", { playthroughId: s.liesOfP, summary: "Beat the boss." }), say("Filed."));
  const turns = [
    { role: "user" as const, content: "Old news" },
    { role: "assistant" as const, content: "Filed.", filed: true },
    { role: "user" as const, content: "Beat the Parade Master" },
    { role: "assistant" as const, content: "Nice! Which weapon?" },
    { role: "user" as const, content: "The saber" },
  ];
  await chat(s.a, turns, { playthroughId: s.liesOfP }, m);
  const sessions = await sessionsOf(s.a, s.liesOfP);
  expect(sessions.length).toBe(before + 1);
  const { getSession } = await import("./sessions");
  expect((await getSession(s.a, sessions[0].id)).transcript).toBe("Beat the Parade Master\n\nThe saber");
  expect(JSON.stringify(m.calls[0].tools)).not.toMatch(/"transcript"/);
});

test("pictures go to Claude with the latest message only; an earlier message's are a note, and the transcript marks them", async () => {
  const picture = { mediaType: "image/jpeg" as const, data: "AAAA" };
  const m = scripted(use("record", { playthroughId: s.liesOfP, summary: "Stats." }), say("Filed."));
  const turns = [
    { role: "user" as const, content: "My stats", shared: 1 },
    { role: "assistant" as const, content: "Vigor 20?" },
    { role: "user" as const, content: "", pictures: [picture, picture] },
  ];
  await chat(s.a, turns, { playthroughId: s.liesOfP }, m);
  const sent = m.calls[0].messages;
  expect(sent[0].content).toBe("[A picture was shared with this message; it is no longer attached.]\nMy stats");
  expect(sent[2].content).toEqual([
    { type: "image", source: { type: "base64", media_type: "image/jpeg", data: "AAAA" } },
    { type: "image", source: { type: "base64", media_type: "image/jpeg", data: "AAAA" } },
  ]);
  const sessions = await sessionsOf(s.a, s.liesOfP);
  const { getSession } = await import("./sessions");
  expect((await getSession(s.a, sessions[0].id)).transcript).toBe("[picture] My stats\n\n[2 pictures]");
});

test("the route takes pictures on the latest message only, of a picture type, base64, at most four", async () => {
  setChatModelForTests(scripted());
  const post = (turns: unknown[]) => chatFor(s.a, new Request("http://localhost/api/chat", { method: "POST", body: JSON.stringify({ turns }) }));
  const pic = { mediaType: "image/png", data: "iVBORw0KGgo=" };
  expect((await post([{ role: "user", content: "", pictures: [pic] }])).status).toBe(200);
  expect(
    (
      await post([
        { role: "user", content: "x", pictures: [pic] },
        { role: "assistant", content: "y" },
        { role: "user", content: "z" },
      ])
    ).status,
  ).toBe(400);
  expect((await post([{ role: "user", content: "x", pictures: [{ mediaType: "image/svg+xml", data: "AAAA" }] }])).status).toBe(400);
  expect((await post([{ role: "user", content: "x", pictures: [{ mediaType: "image/png", data: "<script>" }] }])).status).toBe(400);
  expect((await post([{ role: "user", content: "x", pictures: Array(5).fill(pic) }])).status).toBe(400);
  expect((await post([{ role: "user", content: " " }])).status).toBe(400);
});

test("a tool error goes back to Claude as an error result; an unknown tool too", async () => {
  const m = scripted(use("correct", { changes: [{ what: "item", id: "nope", quantity: 1 }] }), use("drop_tables", {}), say("Couldn't find it."));
  const out = await chat(s.a, ask("fix it"), { playthroughId: s.liesOfP }, m);
  expect(out).toEqual({ reply: "Couldn't find it.", links: [], filed: false });
  expect(JSON.stringify(m.calls[1].messages.at(-1))).toMatch(/"is_error":true/);
  expect(JSON.stringify(m.calls[2].messages.at(-1))).toMatch(/No tool named drop_tables/);
});

test("the daily limit counts messages; a failing API and a refusal end the message with a code", async () => {
  process.env.GAMEPANION_CHAT_DAILY_LIMIT = "1";
  expect(await chat(s.a, ask("one"), {}, scripted(say("ok")))).toMatchObject({ reply: "ok" });
  expect(await chat(s.a, ask("two"), {}, scripted(say("ok")))).toEqual({ code: "chat_limit" });
  expect(await chat(s.b, ask("Ben's first"), {}, scripted(say("ok")))).toMatchObject({ reply: "ok" });
  delete process.env.GAMEPANION_CHAT_DAILY_LIMIT;
  const down: ChatModel = {
    async create() {
      throw new Anthropic.APIConnectionError({ message: "down" });
    },
  };
  expect(await chat(s.a, ask("three"), {}, down)).toEqual({ code: "chat_unavailable" });
  expect(await chat(s.a, ask("four"), {}, scripted(message([], "refusal")))).toEqual({ code: "chat_refused" });
});

test("links are the rows a result names with a url", () => {
  expect(linksOf({ changes: [{ name: "Saber", url: "/p/x#item-1" }, { name: "no url" }], next: ["…"] })).toEqual([{ name: "Saber", url: "/p/x#item-1" }]);
});

test("the routes: a bearer token or no session is refused, with or without a model", async () => {
  // Looking for a session opens the sign-in database: a fresh one, not the default /data.
  vi.stubEnv("DATA_DIR", mkdtempSync(join(tmpdir(), "gamepanion-")));
  const post = (path: string, headers: Record<string, string> = {}, body = "{}") => new Request(`http://localhost${path}`, { method: "POST", headers, body });
  // Who asks is checked first: whether there is a model depends on the player (their own key, ADR 0021).
  expect((await chatRoute(post("/api/chat"))).status).toBe(401);
  setChatModelForTests(scripted());
  expect((await chatRoute(post("/api/chat", { authorization: "Bearer x" }))).status).toBe(401);
  expect((await chatRoute(post("/api/chat"))).status).toBe(401);
  expect((await voiceRoute(post("/api/chat/voice"))).status).toBe(401);
  setTranscriberForTests({ transcribe: async () => ({ text: "hi" }) });
  expect((await voiceRoute(post("/api/chat/voice", { "content-type": "audio/webm" }))).status).toBe(401);
});

test("the Whisper transcriber posts the recording and returns its words; a failure is an error, not a throw", async () => {
  let sent: FormData | null = null;
  const ok = whisperTranscriber("http://whisper:8000", "m", {
    fetch: (async (url: string, init: RequestInit) => {
      expect(url).toBe("http://whisper:8000/v1/audio/transcriptions");
      sent = init.body as FormData;
      return Response.json({ text: " Beat the boss. " });
    }) as unknown as typeof fetch,
  });
  expect(await ok.transcribe(new Uint8Array([1, 2]), "audio/webm")).toEqual({ text: "Beat the boss." });
  expect(sent!.get("model")).toBe("m");
  const bad = whisperTranscriber("http://whisper:8000", "m", { fetch: (async () => new Response("no", { status: 500 })) as unknown as typeof fetch });
  expect(await bad.transcribe(new Uint8Array([1]), "audio/webm")).toEqual({ error: "transcription failed (HTTP 500)" });
});
