// References and sources (#58, #95): a game's references carry a trust level, are read back by it, high first, keep it when filed again
// without one and change it through correct; the pages found for an item or a codex entry are sources without any trust; and Claude is
// told that the page on the more trusted reference's site wins.
import { beforeEach, expect, test } from "vitest";
import { codexOf } from "./codex";
import { correct } from "./correct";
import { db } from "./db/testing";
import { getPlaythrough } from "./games";
import { itemsOf } from "./items";
import { record } from "./record";
import { seen } from "./spoilers";
import { seed, type Seed } from "./testing/fixtures";
import { toolByName } from "./tools";

let s: Seed;

beforeEach(async () => {
  s = await seed();
});

const base = { summary: "Looked things up.", transcript: "Found a forum post about the weight class." };
const next = (out: Record<string, unknown>) => (out.next as string[]).join("\n");
const trustOf = async (url: string) => (await getPlaythrough(s.a, s.liesOfP)).game.references.find((x) => x.url === url)?.trust;

test("a low reference filed through record reads back as low through briefing", async () => {
  await record(s.a, {
    ...base,
    playthroughId: s.liesOfP,
    references: [{ url: "https://steam.example/discussions", title: "Steam discussions", trust: "low" }],
  });
  const brief = await toolByName("briefing")!.run(s.a, { playthroughId: s.liesOfP });
  const refs = (brief.playthrough as { game: { references: { url: string; trust: string }[] } }).game.references;
  expect(refs.find((x) => x.url === "https://steam.example/discussions")?.trust).toBe("low");
});

test("the pages found for an item or a codex entry are sources without any trust", async () => {
  await record(s.a, {
    ...base,
    playthroughId: s.liesOfP,
    items: [{ name: "Puppet Saber", sources: [{ url: "https://fextralife.example/Puppet_Saber", facts: "Motivity C" }] }],
    codex: [{ kind: "boss", name: "Parade Master", sources: [{ url: "https://steam.example/parade" }] }],
  });
  expect((await itemsOf(s.a, s.liesOfP, { name: "Puppet Saber" }))[0].sources[0]).not.toHaveProperty("trust");
  expect((await codexOf(s.a, s.liesOfP, { name: "Parade Master" }))[0].sources[0]).not.toHaveProperty("trust");
  // A trust sent along anyway is dropped by the schema, never stored.
  await toolByName("record")!.run(s.a, {
    ...base,
    playthroughId: s.liesOfP,
    items: [{ name: "Puppet Saber", sources: [{ url: "https://x.example", trust: "low" }] }],
  });
  expect(JSON.stringify((await itemsOf(s.a, s.liesOfP, { name: "Puppet Saber" }))[0].sources)).not.toContain("trust");
});

test("a reference stored without trust reads as medium, and references are ordered high, medium, low", async () => {
  const t = await getPlaythrough(s.a, s.liesOfP);
  const d = await db();
  const raw = await seen(d.selectFrom("games"), s.a, "games").select("sources").where("id", "=", t.game.id).executeTakeFirstOrThrow();
  await d
    .updateTable("games")
    .set({ sources: JSON.stringify(JSON.parse(raw.sources).map((x: { trust?: string }) => ({ ...x, trust: undefined }))) })
    .where("id", "=", t.game.id)
    .execute();
  expect((await getPlaythrough(s.a, s.liesOfP)).game.references.map((x) => x.trust)).toEqual(["medium"]);
  await record(s.a, {
    ...base,
    playthroughId: s.liesOfP,
    references: [
      { url: "https://steam.example", title: "Steam discussions", trust: "low" },
      { url: "https://fextralife.example", title: "Fextralife", trust: "high" },
    ],
  });
  expect((await getPlaythrough(s.a, s.liesOfP)).game.references.map((x) => [x.title, x.trust])).toEqual([
    ["Fextralife", "high"],
    ["Lies Wiki", "medium"],
    ["Steam discussions", "low"],
  ]);
});

test("filed again without trust a reference keeps its own; with one it changes; correct changes it too", async () => {
  await record(s.a, { ...base, playthroughId: s.liesOfP, references: [{ url: "https://steam.example", title: "Steam", trust: "low" }] });
  await record(s.a, { ...base, playthroughId: s.liesOfP, references: [{ url: "https://steam.example", title: "Steam, again" }] });
  expect(await trustOf("https://steam.example")).toBe("low");
  await record(s.a, { ...base, playthroughId: s.liesOfP, references: [{ url: "https://steam.example", trust: "medium" }] });
  expect(await trustOf("https://steam.example")).toBe("medium");
  const t = await getPlaythrough(s.a, s.liesOfP);
  await correct(s.a, [
    {
      what: "game",
      id: t.game.id,
      references: t.game.references.map((x) => ({ url: x.url, title: x.title ?? undefined, trust: x.url === "https://steam.example" ? "low" : undefined })),
    },
  ]);
  expect(await trustOf("https://steam.example")).toBe("low");
  expect((await getPlaythrough(s.a, s.liesOfP)).game.references.find((x) => x.title === "Lies Wiki")?.trust).toBe("medium");
});

test("next lists the references by trust and says the page on the more trusted reference's site wins", async () => {
  await record(s.a, {
    ...base,
    playthroughId: s.liesOfP,
    references: [
      { url: "https://steam.example", title: "Steam discussions", trust: "low" },
      { url: "https://fextralife.example", title: "Fextralife", trust: "high" },
    ],
  });
  const out = next(await toolByName("item")!.run(s.a, { playthroughId: s.liesOfP }));
  expect(out).toMatch(/by trust: Fextralife \(https:\/\/fextralife.example\), trust high; Lies Wiki .*trust medium; Steam discussions .*trust low/);
  expect(out).toMatch(/the one on the site of the more trusted reference wins/);
  expect(out).toMatch(/low reference .* as one person's claim, not as fact/);
});

test("a background line keeps the page it came from, without a trust", async () => {
  await record(s.a, {
    ...base,
    playthroughId: s.liesOfP,
    items: [
      { name: "Puppet Saber", background: [{ text: "Scales with Motivity.", source: { url: "https://fextralife.example/saber", title: "Fextralife" } }] },
    ],
  });
  const [saber] = await itemsOf(s.a, s.liesOfP, { name: "Puppet Saber" });
  expect(saber.background.map((l) => l.source)).toEqual([{ url: "https://fextralife.example/saber", title: "Fextralife" }]);
});
