// The export (#106): everything the player filed, spoilers included, as one document over the REST API and the account page's download,
// and the MCP tool's link to that download; nothing of another player's. That the stored key stays out is keys.test.ts's, over every read-only tool.
import { beforeEach, expect, test } from "vitest";
import { resetAuthForTests } from "./auth/auth";
import { exportDownloadRoute, exportLog, EXPORTED_TABLES } from "./export";
import { A_FIRST, B_FIRST, FULL, HINT, SPOILER_ITEM, SPOILER_SOURCE, seed, type Seed } from "./testing/fixtures";
import { toolByName } from "./tools";

let s: Seed;
beforeEach(async () => {
  s = await seed();
});

test("the export holds every table of the player's log, spoilers and transcripts included, and nothing of another player's", async () => {
  const doc = await exportLog(s.a);
  expect(Object.keys(doc)).toEqual(["format", "exportedAt", ...EXPORTED_TABLES]);
  const text = JSON.stringify(doc);
  for (const w of [A_FIRST, HINT, FULL, SPOILER_ITEM, SPOILER_SOURCE]) expect(text).toContain(w);
  expect(text).not.toContain(B_FIRST);
  expect(text).not.toContain("Elden Ring");
  expect(text).not.toContain(s.b.id);
  expect(doc.playthroughs[0]).toMatchObject({ id: s.liesOfP, spoilers: expect.any(String), background: expect.any(String) });
  expect(doc.games[0].sources).toEqual(expect.any(Array));
  expect(doc.games[0]).not.toHaveProperty("playerId");
  expect(doc.games[0]).not.toHaveProperty("norm");
  const b = JSON.stringify(await exportLog(s.b));
  expect(b).toContain("Elden Ring");
  expect(b).not.toContain(A_FIRST);
});

test("the export tool returns only the link to the download, never the log", async () => {
  const out = await toolByName("export")!.run(s.a, {});
  expect(out.url).toBe("/account/export");
  expect(JSON.stringify(out)).not.toContain(A_FIRST);
  expect((out.next as string[]).join(" ")).toMatch(/\/account\/export/);
});

test("the download needs a session", async () => {
  await resetAuthForTests();
  expect((await exportDownloadRoute(new Request("http://localhost/account/export"))).status).toBe(401);
});
