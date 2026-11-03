// "Where was I?": for one playthrough, the last session, the open quests, the open to-dos, the build and what is equipped. A briefing never asks the gate
// for spoilers (values V1): it shows only what the player found and told.
import { buildOf, type SnapshotView } from "./builds";
import type { GoalView } from "./goals";
import { codexOf, type CodexView } from "./codex";
import { findPlaythrough, listPlaythroughs, type PlaythroughRef, type PlaythroughView } from "./games";
import { itemsOf, type ItemView } from "./items";
import { questsOf, type QuestView } from "./quests";
import { sessionsOf, type SessionSummary } from "./sessions";
import { todosOf, type TodoView } from "./todos";
import { OPEN_STATUSES, type Player } from "./types";

/**
 * The parts of a briefing, in the order both MCP's briefing and the playthrough's Overview tab show them (#79): where the player left
 * off, the next steps, the to-dos, the plan, what is in the way, what is equipped. One read, so the two can't drift.
 */
export const BRIEFING_SECTIONS = ["lastSession", "openQuests", "todos", "suggestedTodos", "goals", "bosses", "equipped"] as const;
export type BriefingSection = (typeof BRIEFING_SECTIONS)[number];

/** The ids a briefing shows, part by part, in order: what the Overview tab renders and the MCP tool returns. */
export const briefingIds = (b: Briefing): Record<BriefingSection, string[]> => ({
  lastSession: b.lastSession ? [b.lastSession.id] : [],
  openQuests: b.openQuests.map((q) => q.id),
  todos: b.todos.map((t) => t.id),
  suggestedTodos: b.suggestedTodos.map((t) => t.id),
  goals: b.build.goals.filter((g) => g.status === "open").map((g) => g.id),
  bosses: b.bosses.map((x) => x.id),
  equipped: b.equipped.map((i) => i.id),
});

/** The playthrough the home page's Continue card is for (#79): the one played most recently among those being played; null for none. */
export const continuePlaythrough = (runs: PlaythroughView[]): PlaythroughView | null => runs.find((t) => t.status === "playing") ?? null;

export type Briefing = {
  /** Null when the player has no playthrough (of the game asked for). */
  playthrough: PlaythroughView | null;
  lastSession: SessionSummary | null;
  /** Open first, then blocked; each with its latest next step and log. */
  openQuests: QuestView[];
  build: {
    plan: { summary: string | null; mainStat: string | null; targets: Record<string, number> } | null;
    /** Open goals by rank (the player's, then suggestions), then the reached ones. */
    goals: GoalView[];
    current: SnapshotView | null;
  };
  /** The player's open to-dos (ADR 0020), in the order they were added. */
  todos: TodoView[];
  /** Open to-dos Claude proposed and the player hasn't taken yet, apart from theirs. */
  suggestedTodos: TodoView[];
  equipped: ItemView[];
  /** Bosses met and not beaten yet. */
  bosses: CodexView[];
  /** The player's other playthroughs, most recently played first. */
  others: PlaythroughView[];
};

export async function briefing(p: Player, ref: PlaythroughRef = {}): Promise<Briefing> {
  const t = await findPlaythrough(p, ref);
  const others = (await listPlaythroughs(p)).filter((x) => x.id !== t?.id);
  if (!t)
    return {
      playthrough: null,
      lastSession: null,
      openQuests: [],
      build: { plan: null, goals: [], current: null },
      todos: [],
      suggestedTodos: [],
      equipped: [],
      bosses: [],
      others,
    };
  const [sessions, quests, build, equipped, bosses, todos] = await Promise.all([
    sessionsOf(p, t.id, 1),
    // As far as the player's spoiler setting goes (ADR 0016), never further: a briefing never asks for more.
    questsOf(p, t.id, { statuses: OPEN_STATUSES, reveal: t.settings.spoilers }),
    buildOf(p, t.id, 1),
    itemsOf(p, t.id, { equippedOnly: true, reveal: t.settings.spoilers }),
    codexOf(p, t.id, { kind: "boss", statuses: ["met"], reveal: t.settings.spoilers }),
    todosOf(p, t.id, { statuses: ["open"], reveal: t.settings.spoilers }),
  ]);
  return {
    playthrough: t,
    lastSession: sessions[0] ?? null,
    openQuests: [...quests.filter((q) => q.status === "open"), ...quests.filter((q) => q.status === "blocked")],
    build: { plan: build.plan, goals: build.goals, current: build.snapshots[0] ?? null },
    todos: todos.filter((x) => !x.suggested),
    suggestedTodos: todos.filter((x) => x.suggested),
    equipped,
    bosses,
    others,
  };
}
