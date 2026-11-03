// A player's own Anthropic API key for the in-app chat (#76, ADR 0021). Pasted on the account page (/account#key), never through Claude
// or a transcript; stored encrypted with AES-256-GCM under GAMEPANION_KEY_ENCRYPTION_KEY; decrypted only here, on the server, when the
// chat calls Anthropic. Nothing that leaves the server carries it: reads say only whether one is stored and its last four characters.
import Anthropic from "@anthropic-ai/sdk";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { config } from "./config";
import { db, now } from "./db";
import { InvalidInputError, NotFoundError } from "./errors";
import { log } from "./log";
import { seen } from "./spoilers";
import { processState } from "./state";
import type { Player } from "./types";

/** Whether this instance stores players' keys: only with GAMEPANION_KEY_ENCRYPTION_KEY set. */
export const keyStorageEnabled = (): boolean => !!config.keyEncryptionKey();

/** What a page may know about a stored key. */
export type KeyStatus = { last4: string; savedAt: number };

// iv (12 bytes) · tag (16 bytes) · ciphertext, as base64. The player's id is the additional data, so a row copied to another player
// doesn't decrypt.
function encrypt(plain: string, playerId: string, key: Buffer): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  c.setAAD(Buffer.from(playerId));
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), ct]).toString("base64");
}

function decrypt(stored: string, playerId: string, key: Buffer): string {
  const raw = Buffer.from(stored, "base64");
  const d = createDecipheriv("aes-256-gcm", key, raw.subarray(0, 12));
  d.setAAD(Buffer.from(playerId));
  d.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8");
}

function storageKey(): Buffer {
  const k = config.keyEncryptionKey();
  if (!k) throw new NotFoundError("This instance doesn't store players' keys (GAMEPANION_KEY_ENCRYPTION_KEY is unset)");
  return k;
}

const clean = (key: string) => {
  const k = key.trim();
  // An Anthropic API key: sk-ant-…, no spaces. A loose check: the test call says whether it works.
  if (!/^sk-ant-[A-Za-z0-9_-]{20,}$/.test(k)) throw new InvalidInputError("That doesn't look like an Anthropic API key (sk-ant-…)");
  return k;
};

/** Stores `key` as the player's, replacing one they had. */
export async function saveKey(p: Player, key: string): Promise<KeyStatus> {
  const k = clean(key);
  const at = now();
  const row = { ciphertext: encrypt(k, p.id, storageKey()), last4: k.slice(-4), updated_at: at };
  await (
    await db()
  )
    .insertInto("player_keys")
    .values({ player_id: p.id, created_at: at, ...row })
    .onConflict((oc) => oc.column("player_id").doUpdateSet(row))
    .execute();
  return { last4: row.last4, savedAt: at };
}

/** Removes the player's key; the chat goes back to the instance's own. */
export async function removeKey(p: Player): Promise<void> {
  await seen((await db()).deleteFrom("player_keys"), p, "player_keys").execute();
}

/** Whether the player has a key stored, and its last four characters; never the key. */
export async function keyStatus(p: Player): Promise<KeyStatus | null> {
  if (!keyStorageEnabled()) return null;
  const r = await seen((await db()).selectFrom("player_keys"), p, "player_keys")
    .select(["last4", "updated_at"])
    .executeTakeFirst();
  return r ? { last4: r.last4, savedAt: r.updated_at } : null;
}

/** The player's key in the clear, for the chat's call to Anthropic only. Null without one, or when the instance stores none. */
export async function playerKey(p: Player): Promise<string | null> {
  const k = config.keyEncryptionKey();
  if (!k) return null;
  const r = await seen((await db()).selectFrom("player_keys"), p, "player_keys")
    .select("ciphertext")
    .executeTakeFirst();
  if (!r) return null;
  try {
    return decrypt(r.ciphertext, p.id, k);
  } catch {
    // Encrypted under another GAMEPANION_KEY_ENCRYPTION_KEY: as if there were none; the player pastes it again.
    log.warn("a stored player key doesn't decrypt with this GAMEPANION_KEY_ENCRYPTION_KEY");
    return null;
  }
}

export type KeyCheck = { ok: true } | { ok: false; reason: "rejected" | "unreachable" };
type Checker = (key: string) => Promise<KeyCheck>;

// One cheap call: list one model. 401/403 is a key that doesn't work; anything else unexpected is Anthropic not answering.
const anthropicCheck: Checker = async (key) => {
  try {
    await new Anthropic({ apiKey: key, maxRetries: 0, timeout: 15_000 }).models.list({ limit: 1 });
    return { ok: true };
  } catch (e) {
    if (e instanceof Anthropic.APIError && (e.status === 401 || e.status === 403)) return { ok: false, reason: "rejected" };
    return { ok: false, reason: "unreachable" };
  }
};

const state = processState("keys", () => ({ checker: null as Checker | null }));
/** Tests stand in for Anthropic here; null goes back to the real call. */
export const setKeyCheckerForTests = (c: Checker | null) => {
  state.checker = c;
};

/** Tests `key` (given, else the player's stored one) with one cheap call to Anthropic. */
export async function testKey(p: Player, key?: string): Promise<KeyCheck> {
  const k = key?.trim() ? clean(key) : await playerKey(p);
  if (!k) throw new NotFoundError("No key to test: paste one first");
  return (state.checker ?? anthropicCheck)(k);
}
