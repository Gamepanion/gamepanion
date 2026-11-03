// Finding what the player means (ADR 0022): full-text search (SQLite FTS5) over the names, local names and descriptions of quests, items
// and codex entries, for when their words differ from the stored name ("the puppet sword", a German name, a partial name). It returns
// ranked candidates, never a pick: one clear match is used, several go back to Claude to ask (values V4). The index query is scoped to
// the player, and every candidate is read again through the gate (spoilers.ts) at the read's spoiler level, so search can't get around it.
import { sql, type Kysely, type Transaction } from "kysely";
import { db } from "./db";
import type { Schema } from "./db/schema";
import { AmbiguousError } from "./errors";
import { seen } from "./spoilers";
import type { Player, SpoilerLevel } from "./types";
import { codexPath, itemPath, questPath } from "./urls";

type Db = Kysely<Schema> | Transaction<Schema>;

export const SEARCH_KINDS = ["quest", "item", "codex"] as const;
export type SearchKind = (typeof SEARCH_KINDS)[number];
export type Candidate = { kind: SearchKind; id: string; name: string; url: string };

const TABLE = { quest: "quests", item: "items", codex: "codex" } as const;
const PATH = { quest: questPath, item: itemPath, codex: codexPath } as const;

// The player's words as an FTS5 query: each word a quoted prefix, so no word can be read as FTS syntax. `all`: every word must match.
function ftsQuery(words: string, all: boolean): string | null {
  // Lower case only: the index's tokenizer folds diacritics on both sides (unicode61 remove_diacritics).
  const tokens = words
    .normalize("NFC")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 1);
  if (!tokens.length) return null;
  return tokens.map((t) => `"${t}"*`).join(all ? " " : " OR ");
}

/**
 * Candidates in one of the player's playthroughs for `words`, best first (BM25): those matching every word, else any. Only rows a read at
 * `reveal` may show; at most `limit`.
 */
export async function search(
  p: Player,
  playthroughId: string,
  words: string,
  opts: { kinds?: readonly SearchKind[]; reveal?: SpoilerLevel; limit?: number; except?: string[] } = {},
  d?: Db,
): Promise<Candidate[]> {
  const conn = d ?? (await db());
  const kinds = opts.kinds ?? SEARCH_KINDS;
  for (const all of [true, false]) {
    const q = ftsQuery(words, all);
    if (!q) return [];
    const hits = await seen(conn.selectFrom("search_index"), p, "search_index")
      .select(["what", "row_id"])
      .where("playthrough_id", "=", playthroughId)
      .where("what", "in", [...kinds])
      .where(sql<boolean>`search_index match ${q}`)
      .orderBy(sql`bm25(search_index, 0, 0, 0, 0, 10, 10, 1)`)
      .limit(50)
      .execute();
    const ranked = hits.filter((h) => !opts.except?.includes(h.row_id));
    if (!ranked.length) continue;
    // Read again through the gate: the player's own rows, at the read's spoiler level.
    const names = new Map<string, string>();
    for (const kind of kinds) {
      const ids = ranked.filter((h) => h.what === kind).map((h) => h.row_id);
      if (!ids.length) continue;
      const rows = await seen(conn.selectFrom(TABLE[kind]), p, TABLE[kind], opts.reveal ?? "none")
        .select(["id", "name"])
        .where("playthrough_id", "=", playthroughId)
        .where("id", "in", ids)
        .execute();
      for (const r of rows) names.set(`${kind}:${r.id}`, r.name);
    }
    const out = ranked
      .filter((h) => names.has(`${h.what}:${h.row_id}`))
      .map((h) => ({
        kind: h.what as SearchKind,
        id: h.row_id,
        name: names.get(`${h.what}:${h.row_id}`)!,
        url: PATH[h.what as SearchKind](playthroughId, h.row_id),
      }));
    if (out.length) return out.slice(0, opts.limit ?? 5);
  }
  return [];
}

/**
 * The id of the one row of `kind` the player's words name, for a write that needs an existing row: null when nothing fits; two or more
 * that fit are for the player to settle (AmbiguousError naming them), never a guess. Called after the exact name found nothing.
 */
export async function resolveByWords(trx: Transaction<Schema>, p: Player, playthroughId: string, kind: SearchKind, words: string): Promise<string | null> {
  const found = await search(p, playthroughId, words, { kinds: [kind], reveal: "full" }, trx);
  if (found.length > 1)
    throw new AmbiguousError(
      `No ${kind} is called ${words}, and several could be meant: ${found.map((c) => `${c.name} (id ${c.id})`).join("; ")}. Ask the player which one`,
    );
  return found[0]?.id ?? null;
}
