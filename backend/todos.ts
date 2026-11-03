// To-dos (ADR 0020): the errands a player keeps while playing that are neither a quest nor a goal ("farm 5 crystals", "come back with
// the key"). Each belongs to a playthrough, may point at one quest, item or codex entry, and is open until the player says it is done
// (values V4). One Claude proposes is `suggested` and shown apart until the player takes it. Every read and every look-up for a write goes
// through the gate (spoilers.ts); a to-do pointing at something the read may not show keeps its words but loses the link.
import { sql, type Kysely, type Transaction } from "kysely";
import { db, newId, now } from "./db";
import type { Schema } from "./db/schema";
import { InvalidInputError, NotFoundError } from "./errors";
import { getPlaythrough } from "./games";
import { norm } from "./names";
import { seen } from "./spoilers";
import { resolveByWords } from "./search";
import { TODO_STATUSES, type Player, type SpoilerLevel, type TodoStatus } from "./types";
import { codexPath, itemPath, questPath, sessionPath } from "./urls";

type Db = Kysely<Schema> | Transaction<Schema>;

/** What a to-do can point at. */
export const TODO_TARGETS = ["quest", "item", "codex"] as const;
export type TodoTarget = (typeof TODO_TARGETS)[number];

const TABLE = { quest: "quests", item: "items", codex: "codex" } as const;
const PATH = { quest: questPath, item: itemPath, codex: codexPath } as const;

export type TodoView = {
  id: string;
  /** The player's words. */
  text: string;
  /** The same in the game's own language, when its names differ (values V8). */
  localText: string | null;
  status: TodoStatus;
  /** Proposed by Claude, not taken by the player yet. */
  suggested: boolean;
  spoiler: SpoilerLevel;
  /** What it is about; null when it points at nothing, or at something this read may not show. */
  about: { what: TodoTarget; id: string; name: string; url: string } | null;
  /** The session it was added in, and the one it was closed in. */
  addedIn: { id: string; url: string } | null;
  closedIn: { id: string; url: string } | null;
};

/** A to-do as a quest, item or codex entry lists it. */
export type TodoRef = { id: string; text: string; localText: string | null; suggested: boolean };

export type TodoInput = {
  /** An existing to-do, to close or change. */
  id?: string;
  text?: string;
  localText?: string;
  /** What it is about: a quest, item or codex entry of the playthrough, by id or exact name. */
  about?: { what: TodoTarget; id?: string; name?: string };
  status?: TodoStatus;
  suggested?: boolean;
  spoiler?: SpoilerLevel;
};

export type FiledTodo = { id: string; text: string; status: TodoStatus; suggested: boolean; created: boolean };

const session = (id: string | null) => (id ? { id, url: sessionPath(id) } : null);

/**
 * The to-dos of one of the player's playthroughs with one of `statuses` (default all), showing no more than `reveal`: open first (the
 * player's, then suggestions), each group in the order they were added; then done and dropped, the latest closed first.
 */
export async function todosOf(p: Player, playthroughId: string, opts: { reveal?: SpoilerLevel; statuses?: readonly TodoStatus[] } = {}): Promise<TodoView[]> {
  const reveal = opts.reveal ?? "none";
  await getPlaythrough(p, playthroughId); // NotFoundError for another player's
  const d = await db();
  const rows = await seen(d.selectFrom("todos"), p, "todos", reveal)
    .selectAll()
    .where("playthrough_id", "=", playthroughId)
    .where("status", "in", [...(opts.statuses ?? TODO_STATUSES)])
    .orderBy(sql`todos.rowid`)
    .execute();
  const names = await linkedNames(d, p, rows, reveal);
  const views = rows.map((r): TodoView => ({
    id: r.id,
    text: r.text,
    localText: r.local_text,
    status: r.status as TodoStatus,
    suggested: r.suggested === 1,
    spoiler: r.spoiler as SpoilerLevel,
    about:
      r.what && r.row_id && names.has(`${r.what}:${r.row_id}`)
        ? { what: r.what as TodoTarget, id: r.row_id, name: names.get(`${r.what}:${r.row_id}`)!, url: PATH[r.what as TodoTarget](playthroughId, r.row_id) }
        : null,
    addedIn: session(r.session_id),
    closedIn: session(r.closed_session_id),
  }));
  const updated = new Map(rows.map((r) => [r.id, r.updated_at]));
  const open = views.filter((v) => v.status === "open");
  const closed = views.filter((v) => v.status !== "open").sort((a, b) => updated.get(b.id)! - updated.get(a.id)!);
  return [...open.filter((v) => !v.suggested), ...open.filter((v) => v.suggested), ...closed];
}

// The names of the rows the to-dos point at, as far as `reveal` shows them, keyed by "what:id".
async function linkedNames(d: Db, p: Player, rows: { what: string | null; row_id: string | null }[], reveal: SpoilerLevel) {
  const out = new Map<string, string>();
  for (const what of TODO_TARGETS) {
    const ids = [...new Set(rows.filter((r) => r.what === what && r.row_id).map((r) => r.row_id!))];
    if (!ids.length) continue;
    const found = await seen(d.selectFrom(TABLE[what]), p, TABLE[what], reveal).select(["id", "name"]).where("id", "in", ids).execute();
    for (const f of found) out.set(`${what}:${f.id}`, f.name);
  }
  return out;
}

/** The open to-dos pointing at each of `rowIds` (quests, items or codex entries) a read at `reveal` may show; rows without any are missing. */
export async function todosAbout(d: Db, p: Player, what: TodoTarget, rowIds: string[], reveal: SpoilerLevel): Promise<Map<string, TodoRef[]>> {
  const out = new Map<string, TodoRef[]>();
  if (!rowIds.length) return out;
  const rows = await seen(d.selectFrom("todos"), p, "todos", reveal)
    .select(["id", "row_id", "text", "local_text", "suggested"])
    .where("what", "=", what)
    .where("row_id", "in", rowIds)
    .where("status", "=", "open")
    .orderBy(sql`todos.rowid`)
    .execute();
  for (const r of rows) out.set(r.row_id!, [...(out.get(r.row_id!) ?? []), { id: r.id, text: r.text, localText: r.local_text, suggested: r.suggested === 1 }]);
  return out;
}

/** The row a to-do points at, in the playthrough, by id or exact name; through the gate, at any spoiler level, as every look-up for a write. */
async function resolveAbout(trx: Transaction<Schema>, p: Player, playthroughId: string, about: NonNullable<TodoInput["about"]>): Promise<string> {
  if (!TODO_TARGETS.includes(about.what)) throw new InvalidInputError(`todos: about.what is one of ${TODO_TARGETS.join(", ")}`);
  const key = about.id?.trim() || about.name?.trim();
  if (!key) throw new InvalidInputError("todos: about needs the id or the exact name of what it is about");
  const table = TABLE[about.what];
  const exact = await seen(trx.selectFrom(table), p, table, "full")
    .select("id")
    .where("playthrough_id", "=", playthroughId)
    .where((eb) => (about.id ? eb("id", "=", about.id) : eb("norm", "=", norm(key))))
    .executeTakeFirst();
  // A name that isn't exact: the one row the player's words find (ADR 0022), never a guess between several.
  const byWords = exact || about.id ? null : await resolveByWords(trx, p, playthroughId, about.what, key);
  const row = exact ?? (byWords ? { id: byWords } : undefined);
  if (!row) throw new NotFoundError(`todos: no ${about.what} ${key} in this playthrough; file it first`);
  return row.id;
}

/**
 * Files `inputs` into a playthrough, as said in `sessionId`. One with an id is changed: closing it (done, dropped) records the session it
 * was closed in, opening it again clears that. One without an id is added, open unless it says otherwise.
 */
export async function writeTodos(
  trx: Transaction<Schema>,
  p: Player,
  playthroughId: string,
  sessionId: string | null,
  inputs: TodoInput[],
): Promise<FiledTodo[]> {
  const out: FiledTodo[] = [];
  const at = now();
  for (const t of inputs) {
    const text = t.text?.trim() || undefined;
    if (t.status !== undefined && !TODO_STATUSES.includes(t.status)) throw new InvalidInputError(`todos: status is one of ${TODO_STATUSES.join(", ")}`);
    const rowId = t.about ? await resolveAbout(trx, p, playthroughId, t.about) : undefined;
    if (t.id) {
      const row = await seen(trx.selectFrom("todos"), p, "todos", "full")
        .selectAll()
        .where("id", "=", t.id)
        .where("playthrough_id", "=", playthroughId)
        .executeTakeFirst();
      if (!row) throw new NotFoundError(`No to-do with id ${t.id} in this playthrough`);
      const status = t.status ?? (row.status as TodoStatus);
      await seen(trx.updateTable("todos"), p, "todos", "full")
        .set({
          ...(text ? { text } : {}),
          ...(t.localText !== undefined ? { local_text: t.localText.trim() || null } : {}),
          ...(rowId ? { what: t.about!.what, row_id: rowId } : {}),
          ...(t.suggested !== undefined ? { suggested: t.suggested ? 1 : 0 } : {}),
          ...(t.spoiler ? { spoiler: t.spoiler } : {}),
          status,
          closed_session_id: status === "open" ? null : status !== row.status ? sessionId : row.closed_session_id,
          updated_at: at,
        })
        .where("id", "=", t.id)
        .execute();
      out.push({ id: t.id, text: text ?? row.text, status, suggested: t.suggested ?? row.suggested === 1, created: false });
      continue;
    }
    if (!text) throw new InvalidInputError("todos: a new to-do needs text, the player's words");
    const id = newId();
    const status = t.status ?? "open";
    await trx
      .insertInto("todos")
      .values({
        id,
        player_id: p.id,
        playthrough_id: playthroughId,
        text,
        local_text: t.localText?.trim() || null,
        what: rowId ? t.about!.what : null,
        row_id: rowId ?? null,
        status,
        suggested: t.suggested ? 1 : 0,
        spoiler: t.spoiler ?? "none",
        session_id: sessionId,
        closed_session_id: status === "open" ? null : sessionId,
        created_at: at,
        updated_at: at,
      })
      .execute();
    out.push({ id, text, status, suggested: !!t.suggested, created: true });
  }
  return out;
}

/** A to-do's text and playthrough, through the gate; NotFoundError for one that isn't the player's. */
export async function todoRow(trx: Transaction<Schema>, p: Player, id: string) {
  const row = await seen(trx.selectFrom("todos"), p, "todos", "full").select(["id", "text", "playthrough_id"]).where("id", "=", id).executeTakeFirst();
  if (!row) throw new NotFoundError(`No to-do with id ${id}`);
  return row;
}

/** Removes a to-do for good (correct, remove). */
export async function removeTodo(trx: Transaction<Schema>, p: Player, id: string): Promise<void> {
  await seen(trx.deleteFrom("todos"), p, "todos", "full").where("id", "=", id).execute();
}

/** Points a to-do at nothing (correct, about null). */
export async function unlinkTodo(trx: Transaction<Schema>, p: Player, id: string): Promise<void> {
  await seen(trx.updateTable("todos"), p, "todos", "full").set({ what: null, row_id: null, updated_at: now() }).where("id", "=", id).execute();
}

/**
 * Copies the open to-dos of `fromId` the player took (not suggested) into `toId`, a new run of the same game (NG+), in their order. What
 * they point at belongs to the old run, so the copies point at nothing. Returns how many came along.
 */
export async function carryTodos(trx: Transaction<Schema>, p: Player, fromId: string, toId: string, sessionId: string): Promise<number> {
  const open = await seen(trx.selectFrom("todos"), p, "todos", "full")
    .selectAll()
    .where("playthrough_id", "=", fromId)
    .where("status", "=", "open")
    .where("suggested", "=", 0)
    .orderBy(sql`todos.rowid`)
    .execute();
  const at = now();
  for (const t of open)
    await trx
      .insertInto("todos")
      .values({
        ...t,
        id: newId(),
        playthrough_id: toId,
        what: null,
        row_id: null,
        session_id: sessionId,
        closed_session_id: null,
        created_at: at,
        updated_at: at,
      })
      .execute();
  return open.length;
}
