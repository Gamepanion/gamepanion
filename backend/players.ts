// A player is Better Auth's user (ADR 0004). Their log lives in gamepanion.sqlite with their id on every row; this is what goes when they go.
import { db } from "./db";
import { seen } from "./spoilers";
import type { Player } from "./types";
import { billing } from "./billing/store";
import { config } from "./config";
import { paymentProvider } from "./payments";

/** Deletes everything the player recorded, and their stored key (ADR 0021). Games cascade to playthroughs, and playthroughs to sessions,
 * quests, builds and items. */
export async function deletePlayerLog(p: Player): Promise<void> {
  const d = await db();
  await seen(d.deleteFrom("games"), p, "games").execute();
  await seen(d.deleteFrom("player_keys"), p, "player_keys").execute();
  // The billing rows (#48), where an instance sells; billing.sqlite isn't opened on one that doesn't.
  if (config.paymentProvider()) await (await billing()).forgetPlayer(p.id);
}

/** Ends the player's running subscriptions at the provider at once (#106), before their account is deleted: nothing charges a player
 * who is gone. Throws when the provider can't be reached. */
export async function cancelSubscriptions(p: Player): Promise<void> {
  const provider = paymentProvider();
  if (!provider) return;
  for (const s of await (await billing()).ofPlayer(p.id)) if (s.status === "active") await provider.cancel(s.providerRef);
}
