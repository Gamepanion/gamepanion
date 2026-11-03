"use server";
// The account page's own writes for the player's Anthropic key (ADR 0021). The key comes in here and goes no further than the backend's
// encryption; what goes back to the browser is only whether it worked.
import { InvalidInputError, NotFoundError, removeKey, saveKey, testKey } from "@/backend";
import { pagePlayer } from "../viewer";

export type KeyResult = "works" | "rejected" | "unreachable" | "invalid" | "saved" | "removed" | "off";

const failed = (e: unknown): KeyResult => {
  if (e instanceof InvalidInputError) return "invalid";
  if (e instanceof NotFoundError) return "off";
  throw e;
};

export async function testKeyAction(key: string): Promise<KeyResult> {
  try {
    const r = await testKey(await pagePlayer(), key);
    return r.ok ? "works" : r.reason;
  } catch (e) {
    return failed(e);
  }
}

export async function saveKeyAction(key: string): Promise<KeyResult> {
  try {
    await saveKey(await pagePlayer(), key);
    return "saved";
  } catch (e) {
    return failed(e);
  }
}

export async function removeKeyAction(): Promise<KeyResult> {
  await removeKey(await pagePlayer());
  return "removed";
}
