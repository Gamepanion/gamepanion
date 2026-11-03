// Full-text search (ADR 0022): a partial or local-language name finds what it belongs to; several plausible matches come back as
// candidates, never a pick; the index follows renames and deletions; and the gate holds: no other player's rows, nothing above the read's
// spoiler level.
import { beforeEach, expect, test } from "vitest";
import { correct } from "./correct";
import { AmbiguousError } from "./errors";
import { itemsOf } from "./items";
import { record } from "./record";
import { search } from "./search";
import { seed, SPOILER_ITEM, type Seed } from "./testing/fixtures";
import { toolByName } from "./tools";

let s: Seed;
beforeEach(async () => {
  s = await seed();
  await record(s.a, {
    playthroughId: s.liesOfP,
    summary: "Found things.",
    transcript: "Picked up a sword and met a boss.",
    items: [
      { name: "Wintry Rapier", localName: "Winterliches Rapier", description: "A thin blade that freezes on hit" },
      { name: "Frozen Greatsword", description: "A heavy blade rimed with frost" },
    ],
    codex: [{ kind: "boss", name: "King of Puppets", localName: "Marionettenkönig" }],
  });
});

const names = (cs: { name: string }[]) => cs.map((c) => c.name);

test("a partial or local-language name finds the row it belongs to", async () => {
  expect(names(await search(s.a, s.liesOfP, "rapier"))).toEqual(["Wintry Rapier"]);
  expect(names(await search(s.a, s.liesOfP, "winterliches"))).toEqual(["Wintry Rapier"]);
  expect(names(await search(s.a, s.liesOfP, "marionettenkonig"))).toEqual(["King of Puppets"]);
  expect(names(await search(s.a, s.liesOfP, "the puppet king", { kinds: ["codex"] }))).toEqual(["King of Puppets"]);
  // The item tool falls back to search when no name contains the words, and uses the one match.
  const out = await toolByName("item")!.run(s.a, { playthroughId: s.liesOfP, name: "rapier that freezes" });
  expect((out.items as { name: string }[]).map((i) => i.name)).toEqual(["Wintry Rapier"]);
});

test("two plausible matches come back as candidates with a next that asks, never as a pick", async () => {
  const out = await toolByName("item")!.run(s.a, { playthroughId: s.liesOfP, name: "blade" });
  expect(out.items).toEqual([]);
  expect(names(out.candidates as { name: string }[]).sort()).toEqual(["Frozen Greatsword", "Wintry Rapier"]);
  expect((out.next as string[]).join("\n")).toMatch(/several could be meant: .*Ask the player which one/);
  await expect(
    record(s.a, { playthroughId: s.liesOfP, summary: "x", transcript: "x", goals: [{ kind: "item", item: "blade", text: "Upgrade it" }] }),
  ).rejects.toBeInstanceOf(AmbiguousError);
  // One clear match is used.
  const r = await record(s.a, {
    playthroughId: s.liesOfP,
    summary: "x",
    transcript: "x",
    todos: [{ text: "Upgrade it", about: { what: "item", name: "rapier" } }],
  });
  expect(r.todos).toHaveLength(1);
});

test("exact names behave as before: an exact match wins, and a new name in record still starts a new row", async () => {
  const before = (await itemsOf(s.a, s.liesOfP)).length;
  const r = await toolByName("record")!.run(s.a, { playthroughId: s.liesOfP, summary: "x", transcript: "x", codex: [{ kind: "boss", name: "Puppet King" }] });
  expect((r.codex as { created: boolean }[])[0].created).toBe(true);
  expect((r.next as string[]).join("\n")).toMatch(/Similar names already there: Puppet King could be King of Puppets/);
  expect((await itemsOf(s.a, s.liesOfP)).length).toBe(before);
});

test("renaming or deleting a row updates the index", async () => {
  const [rapier] = await search(s.a, s.liesOfP, "rapier");
  await correct(s.a, [{ what: "item", id: rapier.id, name: "Glacial Estoc" }]);
  expect(await search(s.a, s.liesOfP, "rapier", { kinds: ["item"] })).toEqual(
    // The local name still says Rapier.
    [expect.objectContaining({ name: "Glacial Estoc" })],
  );
  expect(names(await search(s.a, s.liesOfP, "estoc"))).toEqual(["Glacial Estoc"]);
  await correct(s.a, [{ what: "item", id: rapier.id, remove: true }]);
  expect(await search(s.a, s.liesOfP, "estoc")).toEqual([]);
});

test("search never returns another player's rows or rows above the read's spoiler level", async () => {
  expect(await search(s.b, s.liesOfP, "rapier")).toEqual([]);
  expect(await search(s.b, s.eldenRing, "rapier")).toEqual([]);
  expect(names(await search(s.b, s.eldenRing, "moonveil"))).toEqual(["Moonveil"]);
  expect(await search(s.a, s.eldenRing, "moonveil")).toEqual([]);
  expect(await search(s.a, s.liesOfP, "workshop key", { kinds: ["item"] })).toEqual([]);
  expect(names(await search(s.a, s.liesOfP, "workshop key", { kinds: ["item"], reveal: "full" }))).toEqual([SPOILER_ITEM]);
  const out = JSON.stringify(await toolByName("item")!.run(s.a, { playthroughId: s.liesOfP, name: "workshop key" }));
  expect(out).not.toContain(SPOILER_ITEM);
});
