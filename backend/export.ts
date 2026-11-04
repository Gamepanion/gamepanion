// The player's whole log as one JSON document (#106; GDPR Art. 20): every game, playthrough with its settings, session with its
// transcript, quest and its entries, item, build, goal, codex entry, note, plan, tag, source and to-do they filed. Read through the gate
// like every read, with every spoiler level: it is the player's own log, nothing in it is hidden from them. Free on every tier, frozen
// games included (ADR 0023). Left out: the search index (built from the rest), the stored Anthropic key and the chat's daily counter.
import type { Kysely } from "kysely";
import { playerFromHeaders } from "./auth/session";
import { db, type Schema } from "./db";
import { seen } from "./spoilers";
import type { Player } from "./types";

/** The tables of the log, in the order they are written out: each one's rows point only at tables above it. */
export const EXPORTED_TABLES = [
  "games",
  "playthroughs",
  "sessions",
  "quests",
  "quest_entries",
  "build_plans",
  "goals",
  "stat_snapshots",
  "items",
  "codex",
  "item_uses",
  "tags",
  "tag_links",
  "background",
  "todos",
] as const satisfies readonly (keyof Schema)[];
export type ExportedTable = (typeof EXPORTED_TABLES)[number];

/** Bumped when the document's shape changes in a way a reader would notice. */
export const EXPORT_FORMAT = 1;

export type LogExport = { format: number; exportedAt: string } & Record<ExportedTable, Record<string, unknown>[]>;

// Lists and objects are stored as JSON text, flags as 0/1; the document has them as JSON. `norm` is a matching key built from the name,
// `player_id` is the same on every row: both left out.
const JSON_COLUMNS = new Set(["stats", "item_kinds", "sources", "targets", "attributes", "weaknesses", "resistances"]);
const FLAG_COLUMNS = new Set(["equipped", "suggested"]);
const DROPPED = new Set(["player_id", "norm"]);
const camel = (s: string) => s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

function row(r: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(r)) {
    if (DROPPED.has(k)) continue;
    let value = v;
    if (JSON_COLUMNS.has(k) && typeof v === "string") {
      try {
        value = JSON.parse(v);
      } catch {
        // Kept as stored.
      }
    } else if (FLAG_COLUMNS.has(k) && typeof v === "number") value = v === 1;
    out[camel(k)] = value;
  }
  return out;
}

async function rows(d: Kysely<Schema>, p: Player, table: ExportedTable): Promise<Record<string, unknown>[]> {
  // Oldest first; a table without created_at (build_plans, tag_links) keeps the order SQLite gives.
  const found = (await seen(d.selectFrom(table as never), p, table, "full")
    .selectAll()
    .execute()) as Record<string, unknown>[];
  return found.map(row).sort((a, b) => Number(a.createdAt ?? 0) - Number(b.createdAt ?? 0));
}

/** Everything `p` filed, as one document. */
export async function exportLog(p: Player): Promise<LogExport> {
  const d = await db();
  const doc = { format: EXPORT_FORMAT, exportedAt: new Date().toISOString() } as LogExport;
  for (const t of EXPORTED_TABLES) doc[t] = await rows(d, p, t);
  return doc;
}

/** The download's file name: gamepanion-export-YYYY-MM-DD.json. */
export const exportFileName = (now = new Date()) => `gamepanion-export-${now.toISOString().slice(0, 10)}.json`;

/** GET /account/export: the signed-in browser's download of the same document, by its session cookie. */
export async function exportDownloadRoute(req: Request): Promise<Response> {
  const p = await playerFromHeaders(req.headers);
  if (!p) return Response.json({ error: "not signed in" }, { status: 401 });
  return new Response(JSON.stringify(await exportLog(p), null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${exportFileName()}"`,
      "cache-control": "no-store",
    },
  });
}
