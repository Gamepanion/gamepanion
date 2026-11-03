// To-dos (ADR 0020): filed through record as the player says them, ticked off only when they say so, fixed through correct, suggested
// ones kept apart, carried to an NG+, and read back in briefing, open_threads and on the quest, item or codex entry they are about.
import { beforeEach, expect, test } from "vitest";
import { briefing } from "./briefing";
import { codexOf } from "./codex";
import { correct } from "./correct";
import { record } from "./record";
import { seed, SPOILER_ITEM, type Seed } from "./testing/fixtures";
import { todosOf } from "./todos";
import { toolByName } from "./tools";

let s: Seed;

beforeEach(async () => {
  s = await seed();
});

const session = { summary: "Planned errands.", transcript: "Remind me to come back to the station with the key." };

async function addStationTodo() {
  const r = await record(s.a, {
    ...session,
    playthroughId: s.liesOfP,
    codex: [{ kind: "place", name: "Krat Central Station" }],
    todos: [{ text: "Come back with the key", about: { what: "codex", name: "Krat Central Station" } }],
  });
  return r;
}

test("a to-do linked to a place shows on the place and in the briefing", async () => {
  const r = await addStationTodo();
  expect(r.todos.map((t) => [t.text, t.status, t.created])).toEqual([["Come back with the key", "open", true]]);
  const [place] = await codexOf(s.a, s.liesOfP, { name: "Krat Central Station" });
  expect(place.todos.map((t) => t.text)).toEqual(["Come back with the key"]);
  const b = await briefing(s.a, { playthroughId: s.liesOfP });
  expect(b.todos.map((t) => [t.text, t.about?.name, t.about?.url])).toEqual([["Come back with the key", "Krat Central Station", place.url]]);
  expect(b.todos[0].addedIn?.id).toBe(r.sessionId);
});

test("done leaves the briefing and open_threads, and keeps the session it was done in", async () => {
  const { todos } = await addStationTodo();
  const closed = await record(s.a, { ...session, playthroughId: s.liesOfP, todos: [{ id: todos[0].id, status: "done" }] });
  expect((await briefing(s.a, { playthroughId: s.liesOfP })).todos).toEqual([]);
  const threads = await toolByName("open_threads")!.run(s.a, { playthroughId: s.liesOfP });
  expect(threads.todos).toEqual([]);
  const [done] = await todosOf(s.a, s.liesOfP, { statuses: ["done"] });
  expect(done.closedIn?.id).toBe(closed.sessionId);
  const [place] = await codexOf(s.a, s.liesOfP, { name: "Krat Central Station" });
  expect(place.todos).toEqual([]);
});

test("correct drops one, edits its text, accepts a suggested one, and removes one", async () => {
  const { todos } = await record(s.a, {
    ...session,
    playthroughId: s.liesOfP,
    todos: [{ text: "Farm 5 crystals" }, { text: "Try the boss with fire", suggested: true }, { text: "Buy the amulet" }],
  });
  const [farm, fire, amulet] = todos;
  await correct(s.a, [
    { what: "todo", id: farm.id, status: "dropped" },
    { what: "todo", id: amulet.id, text: "Buy the amulet once I have 3000 ergo" },
  ]);
  let b = await briefing(s.a, { playthroughId: s.liesOfP });
  expect(b.todos.map((t) => t.text)).toEqual(["Buy the amulet once I have 3000 ergo"]);
  expect(b.suggestedTodos.map((t) => t.text)).toEqual(["Try the boss with fire"]);
  await correct(s.a, [{ what: "todo", id: fire.id, suggested: false }]);
  b = await briefing(s.a, { playthroughId: s.liesOfP });
  // In the order they were added.
  expect(b.todos.map((t) => t.text)).toEqual(["Try the boss with fire", "Buy the amulet once I have 3000 ergo"]);
  expect(b.suggestedTodos).toEqual([]);
  const removed = await correct(s.a, [{ what: "todo", id: amulet.id, remove: true }]);
  expect(removed[0].removed).toBe(true);
  expect((await todosOf(s.a, s.liesOfP)).map((t) => t.text)).toEqual(["Try the boss with fire", "Farm 5 crystals"]);
});

test("suggested to-dos come back marked and apart in every read", async () => {
  await record(s.a, {
    ...session,
    playthroughId: s.liesOfP,
    todos: [
      { text: "Mine", about: { what: "quest", id: s.venigni } },
      { text: "Yours", suggested: true, about: { what: "quest", id: s.venigni } },
    ],
  });
  const b = await briefing(s.a, { playthroughId: s.liesOfP });
  expect([b.todos.map((t) => t.text), b.suggestedTodos.map((t) => [t.text, t.suggested])]).toEqual([["Mine"], [["Yours", true]]]);
  const threads = await toolByName("open_threads")!.run(s.a, { playthroughId: s.liesOfP });
  expect((threads.suggestedTodos as { text: string }[]).map((t) => t.text)).toEqual(["Yours"]);
  const tool = await toolByName("briefing")!.run(s.a, { playthroughId: s.liesOfP });
  const venigni = (tool.openQuests as { id: string; todos: { text: string; suggested: boolean }[] }[]).find((q) => q.id === s.venigni)!;
  expect(venigni.todos.map((t) => [t.text, t.suggested])).toEqual([
    ["Mine", false],
    ["Yours", true],
  ]);
});

test("a new playthrough with carryFrom takes the open to-dos, unlinked; done, dropped and suggested ones stay behind", async () => {
  await addStationTodo();
  const { todos } = await record(s.a, {
    ...session,
    playthroughId: s.liesOfP,
    todos: [
      { text: "Done one", status: "done" },
      { text: "Dropped one", status: "dropped" },
      { text: "Suggested one", suggested: true },
    ],
  });
  expect(todos.map((t) => t.status)).toEqual(["done", "dropped", "open"]);
  const ng = await record(s.a, { ...session, game: "Lies of P", label: "NG+", carryFrom: s.liesOfP });
  expect(ng.carriedTodos).toBe(1);
  const carried = await todosOf(s.a, ng.playthrough.id);
  expect(carried.map((t) => [t.text, t.status, t.about])).toEqual([["Come back with the key", "open", null]]);
  const out = await toolByName("record")!.run(s.a, { ...session, game: "Lies of P", label: "NG++", carryFrom: s.liesOfP });
  expect((out.next as string[]).join("\n")).toMatch(/1 open to-do\b/);
});

test("a to-do needs words, and points only at what is in the playthrough", async () => {
  await expect(record(s.a, { ...session, playthroughId: s.liesOfP, todos: [{}] })).rejects.toThrow(/needs text/);
  await expect(record(s.a, { ...session, playthroughId: s.liesOfP, todos: [{ text: "x", about: { what: "quest", id: s.ranni } }] })).rejects.toThrow(
    /no quest/,
  );
});

test("a to-do about something above the read's spoiler level keeps its words and loses the link", async () => {
  await record(s.a, { ...session, playthroughId: s.liesOfP, todos: [{ text: "Use the key", about: { what: "item", name: SPOILER_ITEM } }] });
  const quiet = await todosOf(s.a, s.liesOfP);
  expect(quiet.map((t) => [t.text, t.about])).toEqual([["Use the key", null]]);
  expect(JSON.stringify(quiet)).not.toContain(SPOILER_ITEM);
  const full = await todosOf(s.a, s.liesOfP, { reveal: "full" });
  expect(full[0].about?.name).toBe(SPOILER_ITEM);
});

test("removing the quest a to-do is about unlinks it, and the to-do stays", async () => {
  await record(s.a, { ...session, playthroughId: s.liesOfP, todos: [{ text: "Ask about the record", about: { what: "quest", id: s.antonia } }] });
  await correct(s.a, [{ what: "quest", id: s.antonia, remove: true }]);
  expect((await todosOf(s.a, s.liesOfP)).map((t) => [t.text, t.about])).toEqual([["Ask about the record", null]]);
});
