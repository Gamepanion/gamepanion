// POST /api/chat and POST /api/chat/voice: the in-app chat (ADR 0013), for the web app only. The signed-in browser's session cookie;
// an access token is refused, so scripts and Claude keep REST and MCP. Not in the REST table or OpenAPI. Without an API key there is no
// chat: 404, and the app shows no button; without a transcription server, no microphone.
import * as z from "zod";
import { playerFromHeaders } from "./auth/session";
import type { Player } from "./types";
import { ABOUT_KINDS, anthropicModel, chat, MAX_PICTURE_CHARS, MAX_PICTURES, MAX_TURNS, PICTURE_TYPES, type ChatModel } from "./chat";
import { config } from "./config";
import { NotFoundError } from "./errors";
import { processState } from "./state";
import { transcriber } from "./transcribe";
import { keyStorageEnabled, playerKey } from "./keys";
import { countUsage, HOSTED_RULES, operatorAi, quotaLeft, takeRate } from "./hosted-ai";

const MAX_CHARS = 200_000;
// All turns of one message together: a long session fits, a runaway history doesn't (each tool round resends it).
export const MAX_TOTAL_CHARS = 250_000;
// The player's pictures (ADR 0027): base64 of a supported type, at most MAX_PICTURES, on their latest turn only.
const Picture = z.object({
  mediaType: z.enum(PICTURE_TYPES),
  data: z
    .string()
    .min(1)
    .max(MAX_PICTURE_CHARS)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/, "a picture must be base64"),
});
const Turn = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(MAX_CHARS),
    filed: z.boolean().optional(),
    pictures: z.array(Picture).max(MAX_PICTURES).optional(),
    shared: z.number().int().min(0).max(MAX_PICTURES).optional(),
  })
  .refine((t) => t.content.trim() || t.pictures?.length || t.shared, "a turn needs words or a picture");
const Body = z.object({
  turns: z
    .array(Turn)
    .min(1)
    .max(MAX_TURNS)
    .refine((t) => t[t.length - 1].role === "user", "the last turn must be the player's")
    .refine((t) => t.slice(0, -1).every((x) => !x.pictures?.length), "pictures go with the latest message only")
    .refine((t) => t.reduce((n, x) => n + x.content.length, 0) <= MAX_TOTAL_CHARS, `at most ${MAX_TOTAL_CHARS} characters in all`),
  context: z
    .object({
      playthroughId: z.string().max(100).optional(),
      about: z.object({ kind: z.enum(ABOUT_KINDS), id: z.string().max(100) }).optional(),
      language: z.enum(["en", "de"]).optional(),
    })
    .optional(),
});

const state = processState("chat", () => ({ override: null as ChatModel | null, factory: null as ((apiKey: string) => ChatModel) | null }));
/** Tests stand in for Claude here; null goes back to the configured model. */
export const setChatModelForTests = (m: ChatModel | null) => {
  state.override = m;
};
/** Tests stand in for the Anthropic client a key makes; null goes back to the real one. */
export const setChatClientForTests = (f: ((apiKey: string) => ChatModel) | null) => {
  state.factory = f;
};

/**
 * What a player's message runs on (ADR 0021, 0024): their own key when they stored one (never counted, and a refused one is never
 * replaced by the instance's); else the instance's, where they may use it (everyone without a payment provider; with one, only on the
 * hosted-AI plan, `counted` against its quota); else `needsKey`: the chat says what it needs. Null: no chat at all.
 */
export async function chatPlan(p: Player): Promise<{ model: ChatModel; counted: boolean } | { needsKey: true } | null> {
  const make = state.factory ?? anthropicModel;
  const own = await playerKey(p);
  if (own) return { model: { ...make(own), own: true }, counted: false };
  const instance = state.override ?? (config.anthropicKey() ? make(config.anthropicKey()!) : null);
  const ai = await operatorAi(p);
  if (instance && ai.allowed) return { model: instance, counted: ai.counted };
  // Where the instance sells, a player without the hosted-AI plan or a key of their own is told what the chat needs.
  return config.paymentProvider() && (instance || keyStorageEnabled()) ? { needsKey: true } : null;
}

/** What the chat runs on for `p` without a key of their own, for the account page's key section (see chatPlan): the instance's key
 * (`instance`), nothing until they add a key or take the hosted-AI plan (`needsKey`), or there is no chat without a key (`none`). */
export async function chatWithoutOwnKey(p: Player): Promise<"instance" | "needsKey" | "none"> {
  const instance = state.override ?? config.anthropicKey();
  if (instance && (await operatorAi(p)).allowed) return "instance";
  return config.paymentProvider() && (instance || keyStorageEnabled()) ? "needsKey" : "none";
}

/** The model a player's message runs on; null without one (see chatPlan). */
export async function chatModelFor(p: Player): Promise<ChatModel | null> {
  const plan = await chatPlan(p);
  return plan && "model" in plan ? plan.model : null;
}

/** Whether the app offers the chat to `p`; `needsKey`: it opens to say what it needs. */
export async function chatEnabled(p: Player): Promise<boolean> {
  return (await chatPlan(p)) !== null;
}
export async function chatNeedsKey(p: Player): Promise<boolean> {
  const plan = await chatPlan(p);
  return !!plan && "needsKey" in plan;
}
/** Whether the chat offers speaking a message: a transcription server is set up, and the chat runs (on the hosted-AI plan, where the
 * instance sells). */
export async function voiceEnabled(p: Player): Promise<boolean> {
  if (!transcriber()) return false;
  const plan = await chatPlan(p);
  if (!plan || !("model" in plan)) return false;
  // Where the instance sells, speaking runs on its whisper for those its key serves: the hosted-AI plan and GAMEPANION_FREE_PLAYERS.
  return !config.paymentProvider() || plan.counted || !plan.model.own;
}

const STATUS = {
  chat_limit: 429,
  chat_unavailable: 502,
  chat_refused: 200,
  chat_too_long: 200,
  own_key_rejected: 200,
  needs_key: 200,
  quota_used: 200,
  rate_limited: 429,
} as const;
const json = (body: unknown, status = 200) => Response.json(body, { status });

// The body, or null when it is longer than `max` bytes: read in chunks, so a lying or missing Content-Length can't make it bigger.
async function readCapped(req: Request, max: number): Promise<Uint8Array | null> {
  if (Number(req.headers.get("content-length") ?? 0) > max) return null;
  if (!req.body) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of req.body as unknown as AsyncIterable<Uint8Array>) {
    size += chunk.byteLength;
    if (size > max) return null;
    chunks.push(chunk);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return out;
}

// Who may call either route: the signed-in browser, never a bearer token.
async function caller(req: Request): Promise<{ p: Player } | { error: Response }> {
  if (req.headers.has("authorization")) return { error: json({ error: "the chat is for the web app", code: "unauthorized" }, 401) };
  const p = await playerFromHeaders(req.headers);
  return p ? { p } : { error: json({ error: "sign-in required", code: "unauthorized" }, 401) };
}

export async function chatRoute(req: Request): Promise<Response> {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  const who = await caller(req);
  if ("error" in who) return who.error;
  return chatFor(who.p, req);
}

/** A chat message from a signed-in player: the route after the caller is known (tests call it as a player). */
export async function chatFor(player: Player, req: Request): Promise<Response> {
  const who = { p: player };
  const plan = await chatPlan(who.p);
  if (!plan) return json({ error: "not found", code: "not_found" }, 404);
  if ("needsKey" in plan) return json({ code: "needs_key" }, STATUS.needs_key);
  const bytes = await readCapped(req, 4 * MAX_TOTAL_CHARS + MAX_PICTURES * (MAX_PICTURE_CHARS + 100));
  if (!bytes) return json({ error: "The conversation is too long", code: "invalid_request" }, 413);
  let parsed: z.infer<typeof Body>;
  try {
    const r = Body.safeParse(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)));
    if (!r.success) return json({ error: z.prettifyError(r.error), code: "invalid_request" }, 400);
    parsed = r.data;
  } catch {
    return json({ error: "The request body must be JSON", code: "invalid_request" }, 400);
  }
  try {
    // On the hosted-AI plan: the per-minute rate, the monthly quota, a shorter reply and the guardrails (ADR 0024).
    if (plan.counted && !takeRate(who.p)) return json({ code: "rate_limited" }, STATUS.rate_limited);
    if (plan.counted && (await quotaLeft(who.p)).tokens <= 0) return json({ code: "quota_used" }, STATUS.quota_used);
    const reply = await chat(
      who.p,
      parsed.turns,
      parsed.context ?? {},
      plan.model,
      new Date(),
      plan.counted ? { maxTokens: config.aiReplyTokens(), extraRules: HOSTED_RULES, onUsage: (tokens) => countUsage(who.p, { tokens }) } : {},
    );
    return "code" in reply ? json(reply, STATUS[reply.code]) : json(reply);
  } catch (e) {
    if (e instanceof NotFoundError) return json({ error: e.message, code: "not_found" }, 404);
    throw e;
  }
}

/** The longest spoken message taken: a few minutes of Opus or AAC from the browser is well under this. */
const MAX_VOICE = 15 * 1024 * 1024;

// A message spoken into the chat (the body, as the browser recorded it), turned into its words by the instance's own Whisper and handed
// back, for the app to send as the player's message. The recording is never stored.
export async function voiceRoute(req: Request): Promise<Response> {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  const who = await caller(req);
  if ("error" in who) return who.error;
  return voiceFor(who.p, req);
}

/** A spoken message from a signed-in player: the route after the caller is known (tests call it as a player). */
export async function voiceFor(player: Player, req: Request): Promise<Response> {
  const who = { p: player };
  const t = (await voiceEnabled(who.p)) ? transcriber() : null;
  if (!t) return json({ error: "not found", code: "not_found" }, 404);
  const plan = await chatPlan(who.p);
  const counted = !!plan && "model" in plan && plan.counted;
  // The recording's length, as the browser measured it: what counts against the hosted-AI quota's minutes.
  const seconds = Math.min(900, Math.max(1, Math.ceil(Number(req.headers.get("x-audio-seconds")) || 1)));
  if (counted && (await quotaLeft(who.p)).seconds < seconds) return json({ error: "The month's transcription minutes are used up", code: "quota_used" }, 429);
  const bytes = await readCapped(req, MAX_VOICE);
  if (!bytes) return json({ error: "The recording is too long", code: "voice_too_long" }, 413);
  if (!bytes.byteLength) return json({ error: "The recording is empty", code: "voice_empty" }, 400);
  const type = (req.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!type.startsWith("audio/")) return json({ error: "Send the recording as audio/*", code: "invalid_request" }, 400);
  const heard = await t.transcribe(bytes, type);
  if ("error" in heard) return json({ error: heard.error, code: "voice_unavailable" }, 502);
  if (counted) await countUsage(who.p, { seconds });
  return json({ text: heard.text });
}
