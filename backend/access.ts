// Who may file into which game (#48, ADR 0023): the only place the free limit lives. Without a payment provider every game is open (V7).
// With one, a subscriber files into any game, and so does a player in GAMEPANION_FREE_PLAYERS; everyone else keeps one active game with
// all its playthroughs: the one they chose, else the one played last. Their other games stay readable, exportable and correctable, but
// frozen: no new session goes in. Called from the one place record resolves its playthrough, so MCP, REST and the in-app chat agree.
import type { Kysely, Transaction } from "kysely";
import { playerEmail } from "./billing/flow";
import { billing } from "./billing/store";
import { config, mayJoin } from "./config";
import { db } from "./db";
import type { Schema } from "./db/schema";
import { GamepanionError, InvalidInputError, NotFoundError } from "./errors";
import { seen } from "./spoilers";
import type { Player } from "./types";
import { accountPath, siteUrl, subscribePath } from "./urls";

type Db = Kysely<Schema> | Transaction<Schema>;

/** `limited` false: every game is open. Otherwise only `activeGameId` takes new sessions (null: the player has no game yet). */
export type Access = { limited: boolean; subscribed: boolean; activeGameId: string | null };

/** A refusal to file into a game past the free one; MCP hands its text to Claude, REST answers 402. */
export class SubscriptionRequiredError extends GamepanionError {
  constructor(message: string) {
    super("subscription_required", message);
  }
}

const subscribedNow = async (p: Player) =>
  (await (await billing()).ofPlayer(p.id)).some((s) => s.status === "active" && (s.validUntil === null || s.validUntil > Date.now()));

/** The game that stays active for a limited player: the chosen one while it exists, else the one with the latest played playthrough. */
async function activeGame(p: Player, d: Db): Promise<string | null> {
  const chosen = await (await billing()).chosenGame(p.id);
  if (chosen && (await seen(d.selectFrom("games"), p, "games").select("id").where("id", "=", chosen).executeTakeFirst())) return chosen;
  const latest = await seen(d.selectFrom("playthroughs"), p, "playthroughs")
    .select("game_id")
    .orderBy((eb) => eb.fn.coalesce("last_played_on", eb.val("")), "desc")
    .orderBy("created_at", "desc")
    .executeTakeFirst();
  if (latest) return latest.game_id;
  return (await seen(d.selectFrom("games"), p, "games").select("id").orderBy("created_at", "desc").executeTakeFirst())?.id ?? null;
}

export async function accessOf(p: Player, d?: Db): Promise<Access> {
  if (!config.paymentProvider()) return { limited: false, subscribed: false, activeGameId: null };
  const subscribed = await subscribedNow(p);
  if (subscribed) return { limited: false, subscribed, activeGameId: null };
  const email = await playerEmail(p.id);
  if (email && mayJoin(email, config.freePlayers())) return { limited: false, subscribed, activeGameId: null };
  return { limited: true, subscribed, activeGameId: await activeGame(p, d ?? (await db())) };
}

/**
 * Throws SubscriptionRequiredError when `p` may not file into `game` (null: a new game called `title`). Reading, correcting and removing
 * never come here.
 */
export async function assertMayFile(trx: Transaction<Schema>, p: Player, game: { id: string; title: string } | null, title: string): Promise<void> {
  const a = await accessOf(p, trx);
  if (!a.limited) return;
  const subscribe = `${siteUrl()}${subscribePath()}`;
  if (!game) {
    if (a.activeGameId === null) return; // the first game is free
    throw new SubscriptionRequiredError(
      `Free players keep one game, and ${title} would be a second. Tell the player that more games need a subscription and give them this link: ${subscribe}. Nothing was filed.`,
    );
  }
  if (game.id === a.activeGameId) return;
  const active = a.activeGameId
    ? (await seen(trx.selectFrom("games"), p, "games").select("title").where("id", "=", a.activeGameId).executeTakeFirst())?.title
    : undefined;
  throw new SubscriptionRequiredError(
    `${game.title} is frozen: the subscription ended, and the player's active game is ${active ?? "another one"}. Reading it still works. Tell the player they can subscribe again (${subscribe}) or make ${game.title} their active game on ${siteUrl()}${accountPath()} (it can change once every ${ACTIVE_GAME_CHANGE_DAYS} days). Nothing was filed.`,
  );
}

/** Whether a game is frozen for the player: payments on, the player limited, and it isn't their active game. */
export async function isFrozen(p: Player, gameId: string): Promise<boolean> {
  const a = await accessOf(p);
  return a.limited && a.activeGameId !== null && a.activeGameId !== gameId;
}

/** How often a limited player may change their active game: once in this many days, so the free game is one game, not whichever is
 * being played tonight. The first choice is free. */
export const ACTIVE_GAME_CHANGE_DAYS = 30;
const CHANGE_MS = ACTIVE_GAME_CHANGE_DAYS * 86_400_000;

/** When the player may next change their active game (ms); null when they may now. */
export async function nextActiveGameChange(p: Player): Promise<number | null> {
  const c = await (await billing()).choice(p.id);
  const next = c ? c.chosenAt + CHANGE_MS : null;
  return next !== null && next > Date.now() ? next : null;
}

/** Makes one of the player's games the active one (the account page): once in ACTIVE_GAME_CHANGE_DAYS. NotFoundError for a game that
 * isn't theirs; InvalidInputError, with the day, before the next change is due. Choosing the game that is already chosen changes nothing. */
export async function chooseActiveGame(p: Player, gameId: string): Promise<void> {
  if (
    !(await seen((await db()).selectFrom("games"), p, "games")
      .select("id")
      .where("id", "=", gameId)
      .executeTakeFirst())
  )
    throw new NotFoundError("No such game");
  const b = await billing();
  if ((await b.choice(p.id))?.gameId === gameId) return;
  const next = await nextActiveGameChange(p);
  if (next !== null)
    throw new InvalidInputError(`The active game can change once every ${ACTIVE_GAME_CHANGE_DAYS} days; next on ${new Date(next).toISOString().slice(0, 10)}`);
  await b.chooseGame(p.id, gameId);
}
