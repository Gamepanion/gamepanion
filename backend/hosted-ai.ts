// The hosted-AI tier (#56, ADR 0024): where the instance sells, its own Anthropic key serves only players on "Subscription + hosted AI",
// within a monthly quota of tokens and transcription minutes, a per-minute rate and a reply-length cap, and with a system prompt that keeps
// the chat on the player's own game. Everyone else runs the chat on their own key (ADR 0021), which never counts. Without a payment
// provider nothing here applies: the instance's key serves everyone, as before (V7).
import { subscriptionOf } from "./billing/flow";
import { billing } from "./billing/store";
import { config } from "./config";
import { today } from "./dates";
import { processState } from "./state";
import type { Player } from "./types";

/** May the player's chat run on the instance's key? `counted`: their use counts against the hosted-AI quota and its guardrails apply. */
export async function operatorAi(p: Player): Promise<{ allowed: boolean; counted: boolean }> {
  if (!config.paymentProvider()) return { allowed: true, counted: false };
  return (await subscriptionOf(p)).hostedAi ? { allowed: true, counted: true } : { allowed: false, counted: false };
}

const month = (now = new Date()) => today(now).slice(0, 7);

/** What is left of the player's quota this calendar month; it starts afresh on the first. */
export async function quotaLeft(p: Player, now = new Date()): Promise<{ tokens: number; seconds: number }> {
  const used = await (await billing()).usageOf(p.id, month(now));
  return { tokens: config.aiMonthlyTokens() - used.tokens, seconds: config.aiMonthlyMinutes() * 60 - used.seconds };
}

/** Counts use of the instance's AI against this month. */
export async function countUsage(p: Player, used: { tokens?: number; seconds?: number }, now = new Date()): Promise<void> {
  await (await billing()).addUsage(p.id, month(now), used);
}

// Messages per player in the last minute, kept in the process: a limit against runaway use, not an account.
const recent = processState("ai-rate", () => new Map<string, number[]>());

/** Takes one message of the player's per-minute allowance; false when it is used up. */
export function takeRate(p: Player, now = Date.now()): boolean {
  const kept = (recent.get(p.id) ?? []).filter((t) => now - t < 60_000);
  if (kept.length >= config.aiPerMinute()) {
    recent.set(p.id, kept);
    return false;
  }
  recent.set(p.id, [...kept, now]);
  return true;
}

export const resetRateForTests = () => recent.clear();

/** The guardrails for the instance's AI, added to the chat's system prompt. */
export const HOSTED_RULES = `
This chat runs on Gamepanion's own AI for a player on the hosted-AI plan. Keep to the player's own game and this playthrough: a short comparison or aside is fine, but steer back politely and don't take on unrelated tasks (writing, coding, homework, other topics). Use only Gamepanion's tools, and look things up only on the sources the player keeps for the game. Keep replies short.`;
