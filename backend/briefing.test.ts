// The briefing (#79): one read behind MCP's briefing and the Overview tab, so the two show the same items in the same order.
import { beforeEach, expect, test } from "vitest";
import { resetDbForTests } from "./db/testing";
import { listPlaythroughs } from "./games";
import { record } from "./record";
import { BRIEFING_SECTIONS, briefing, briefingIds, continuePlaythrough } from "./briefing";
import { correct } from "./correct";
import { DEMO_SESSIONS } from "./testing/demo";
import { toolByName } from "./tools";

const player = { id: "demo-player" };

beforeEach(async () => {
  await resetDbForTests();
  for (const s of DEMO_SESSIONS) await record(player, s);
});

const ids = (xs: unknown) => (xs as { id: string }[]).map((x) => x.id);

test("for the demo seed, the Overview's read and MCP's briefing hold the same items in the same order", async () => {
  for (const t of await listPlaythroughs(player)) {
    const overview = briefingIds(await briefing(player, { playthroughId: t.id }));
    const tool = await toolByName("briefing")!.run(player, { playthroughId: t.id });
    const build = tool.build as { goals: { id: string; status: string }[] };
    expect({
      lastSession: tool.lastSession ? [(tool.lastSession as { id: string }).id] : [],
      openQuests: ids(tool.openQuests),
      todos: ids(tool.todos),
      suggestedTodos: ids(tool.suggestedTodos),
      goals: build.goals.filter((g) => g.status === "open").map((g) => g.id),
      bosses: ids(tool.bosses),
      equipped: ids(tool.equipped),
    }).toEqual(overview);
    // The tool returns the parts in the Overview's order.
    const keys = Object.keys(tool).map((k) => (k === "build" ? "goals" : k));
    const order = BRIEFING_SECTIONS.map((s) => keys.indexOf(s));
    expect(order.every((x) => x >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  }
  const lies = (await listPlaythroughs(player)).find((t) => t.game.title === "Lies of P")!;
  const b = briefingIds(await briefing(player, { playthroughId: lies.id }));
  expect(b.todos.length).toBe(2);
  expect(b.suggestedTodos.length).toBe(1);
});

test("the Continue card is for the playthrough played most recently among those being played, and none without one", async () => {
  const runs = await listPlaythroughs(player);
  expect(continuePlaythrough(runs)?.game.title).toBe("Elden Ring");
  const elden = runs.find((t) => t.game.title === "Elden Ring")!;
  await correct(player, [{ what: "playthrough", id: elden.id, status: "finished" }]);
  expect(continuePlaythrough(await listPlaythroughs(player))?.game.title).toBe("Lies of P");
  const lies = runs.find((t) => t.game.title === "Lies of P")!;
  await correct(player, [{ what: "playthrough", id: lies.id, status: "dropped" }]);
  expect(continuePlaythrough(await listPlaythroughs(player))).toBeNull();
});
