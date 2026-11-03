// Background (ADR 0016): what Claude adds on its own about an item, a codex entry or a quest, as far as the playthrough's background
// setting asks. Each line has its own spoiler level, because a line can give away more than the row it is about (the item is found, the
// fate of its owner is a spoiler), and so goes through the gate by itself. A line from the game's sources keeps its link (ADR 0008).
import { sql, type Kysely, type Transaction } from "kysely";
import { newId, now } from "./db";
import type { Schema } from "./db/schema";
import { NotFoundError } from "./errors";
import { seen } from "./spoilers";
import { gameOfRow, type TagTarget } from "./tags";
import { parseSources, trustOf, trustOfUrl } from "./sources";
import type { Player, SpoilerLevel, Trust } from "./types";

type Db = Kysely<Schema> | Transaction<Schema>;

export type BackgroundLine = { id: string; text: string; spoiler: SpoilerLevel; source: { url: string; title: string; trust: Trust } | null };
export type BackgroundInput = { text: string; spoiler?: SpoilerLevel; source?: { url: string; title: string; trust?: Trust } };

/** Adds lines to one of the player's rows; a line whose text the row has already is skipped. The ids of the lines added. */
export async function addBackground(trx: Transaction<Schema>, p: Player, what: TagTarget, rowId: string, lines: BackgroundInput[]): Promise<string[]> {
  const gameId = await gameOfRow(trx, p, what, rowId);
  if (!gameId) throw new NotFoundError(`No ${what} with id ${rowId}`);
  // A line from one of the game's sources keeps that source's trust, unless the line says otherwise (#58).
  const game = await seen(trx.selectFrom("games"), p, "games").select("sources").where("id", "=", gameId).executeTakeFirstOrThrow();
  const sources = parseSources(game.sources);
  const had = new Set(
    (await seen(trx.selectFrom("background"), p, "background", "full").select("text").where("what", "=", what).where("row_id", "=", rowId).execute()).map((l) =>
      l.text.trim(),
    ),
  );
  const added: string[] = [];
  for (const l of lines) {
    const text = l.text.trim();
    if (!text || had.has(text)) continue;
    had.add(text);
    const id = newId();
    await trx
      .insertInto("background")
      .values({
        id,
        player_id: p.id,
        what,
        row_id: rowId,
        text,
        spoiler: l.spoiler ?? "none",
        source_url: l.source?.url ?? null,
        source_title: l.source?.title ?? null,
        source_trust: l.source ? (l.source.trust ?? trustOfUrl(sources, l.source.url) ?? "medium") : null,
        created_at: now(),
      })
      .execute();
    added.push(id);
  }
  return added;
}

/** The lines on each of `rowIds` a read at `reveal` may show, oldest first. Rows without any are missing from the map. */
export async function backgroundOf(d: Db, p: Player, what: TagTarget, rowIds: string[], reveal: SpoilerLevel): Promise<Map<string, BackgroundLine[]>> {
  const out = new Map<string, BackgroundLine[]>();
  if (!rowIds.length) return out;
  const rows = await seen(d.selectFrom("background"), p, "background", reveal)
    .selectAll()
    .where("what", "=", what)
    .where("row_id", "in", rowIds)
    // In the order they were added: rowid, as several lines come within one millisecond.
    .orderBy(sql`rowid`)
    .execute();
  for (const r of rows)
    out.set(r.row_id, [
      ...(out.get(r.row_id) ?? []),
      {
        id: r.id,
        text: r.text,
        spoiler: r.spoiler as SpoilerLevel,
        source: r.source_url ? { url: r.source_url, title: r.source_title ?? r.source_url, trust: trustOf(r.source_trust) } : null,
      },
    ]);
  return out;
}
