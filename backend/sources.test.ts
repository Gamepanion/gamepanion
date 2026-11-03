// Trust in sources (#58): filed with a level, read back by level, high first, kept when filed again without one, changed by correct,
// carried by a background line, and handed to Claude with how to weigh it.
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

test("a low source filed through record reads back as low through briefing, item and codex", async () => {
  await record(s.a, {
    ...base,
    playthroughId: s.liesOfP,
    sources: [{ url: "https://forum.example/weight", title: "A Steam comment", trust: "low" }],
    items: [{ name: "Puppet Saber", sources: [{ url: "https://forum.example/saber", trust: "low" }] }],
    codex: [{ kind: "boss", name: "Parade Master", sources: [{ url: "https://forum.example/parade", trust: "low" }] }],
  });
  const brief = await toolByName("briefing")!.run(s.a, { playthroughId: s.liesOfP });
  const sources = (brief.playthrough as { game: { sources: { url: string; trust: string }[] } }).game.sources;
  expect(sources.find((x) => x.url === "https://forum.example/weight")?.trust).toBe("low");
  expect((await itemsOf(s.a, s.liesOfP, { name: "Puppet Saber" }))[0].sources[0].trust).toBe("low");
  expect((await codexOf(s.a, s.liesOfP, { name: "Parade Master" }))[0].sources[0].trust).toBe("low");
});

test("a source stored without trust reads as medium, and sources are ordered high, medium, low", async () => {
  const t = await getPlaythrough(s.a, s.liesOfP);
  // As stored before trust existed: without the field.
  const d = await db();
  const raw = await seen(d.selectFrom("games"), s.a, "games").select("sources").where("id", "=", t.game.id).executeTakeFirstOrThrow();
  await d
    .updateTable("games")
    .set({ sources: JSON.stringify(JSON.parse(raw.sources).map((x: { trust?: string }) => ({ ...x, trust: undefined }))) })
    .where("id", "=", t.game.id)
    .execute();
  expect((await getPlaythrough(s.a, s.liesOfP)).game.sources.map((x) => x.trust)).toEqual(["medium"]);
  await record(s.a, {
    ...base,
    playthroughId: s.liesOfP,
    sources: [
      { url: "https://forum.example", title: "Forum", trust: "low" },
      { url: "https://official.example", title: "Official", trust: "high" },
    ],
  });
  expect((await getPlaythrough(s.a, s.liesOfP)).game.sources.map((x) => [x.title, x.trust])).toEqual([
    ["Official", "high"],
    ["Lies Wiki", "medium"],
    ["Forum", "low"],
  ]);
});

test("filed again without trust a source keeps its own; with one it changes; correct changes it too", async () => {
  await record(s.a, { ...base, playthroughId: s.liesOfP, sources: [{ url: "https://forum.example", title: "Forum", trust: "low" }] });
  await record(s.a, { ...base, playthroughId: s.liesOfP, sources: [{ url: "https://forum.example", title: "Forum, again" }] });
  const trustOf = async () => (await getPlaythrough(s.a, s.liesOfP)).game.sources.find((x) => x.url === "https://forum.example")?.trust;
  expect(await trustOf()).toBe("low");
  await record(s.a, { ...base, playthroughId: s.liesOfP, sources: [{ url: "https://forum.example", trust: "medium" }] });
  expect(await trustOf()).toBe("medium");
  const t = await getPlaythrough(s.a, s.liesOfP);
  await correct(s.a, [
    {
      what: "game",
      id: t.game.id,
      sources: t.game.sources.map((x) => ({ url: x.url, title: x.title ?? undefined, trust: x.url === "https://forum.example" ? "low" : undefined })),
    },
  ]);
  expect(await trustOf()).toBe("low");
  expect((await getPlaythrough(s.a, s.liesOfP)).game.sources.find((x) => x.title === "Lies Wiki")?.trust).toBe("medium");
});

test("next lists the sources by trust and says to mark a low source's claims as one person's", async () => {
  await record(s.a, {
    ...base,
    playthroughId: s.liesOfP,
    sources: [
      { url: "https://forum.example", title: "Forum", trust: "low" },
      { url: "https://official.example", title: "Official", trust: "high" },
    ],
  });
  const out = next(await toolByName("item")!.run(s.a, { playthroughId: s.liesOfP }));
  expect(out).toMatch(/by trust: Official \(https:\/\/official.example\), trust high; Lies Wiki .*trust medium; Forum .*trust low/);
  expect(out).toMatch(/low source .* as one person's claim, not as fact/);
});

test("a background line from a source keeps the source's trust", async () => {
  await record(s.a, { ...base, playthroughId: s.liesOfP, sources: [{ url: "https://forum.example/thread", title: "Forum", trust: "low" }] });
  await record(s.a, {
    ...base,
    playthroughId: s.liesOfP,
    items: [
      {
        name: "Puppet Saber",
        background: [
          { text: "Heavy from 69 % load.", source: { url: "https://forum.example/thread", title: "Forum" } },
          { text: "Scales with Motivity.", source: { url: "https://wiki.example/saber", title: "Wiki", trust: "high" } },
        ],
      },
    ],
  });
  const [saber] = await itemsOf(s.a, s.liesOfP, { name: "Puppet Saber" });
  expect(saber.background.map((l) => [l.text, l.source?.trust])).toEqual([
    ["Heavy from 69 % load.", "low"],
    ["Scales with Motivity.", "high"],
  ]);
});
