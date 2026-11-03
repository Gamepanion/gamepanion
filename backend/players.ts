// A player is Better Auth's user (ADR 0004). Their log lives in gamepanion.sqlite with their id on every row; this is what goes when they go.
import { db } from "./db";
import { seen } from "./spoilers";
import type { Player } from "./types";

/** Deletes everything the player recorded, and their stored key (ADR 0021). Games cascade to playthroughs, and playthroughs to sessions,
 * quests, builds and items. */
export async function deletePlayerLog(p: Player): Promise<void> {
  const d = await db();
  await seen(d.deleteFrom("games"), p, "games").execute();
  await seen(d.deleteFrom("player_keys"), p, "player_keys").execute();
}
