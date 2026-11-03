// The links `next` hands Claude (#82): built by the path builders, made absolute like every url, to the page that fits each flow.
import { readFileSync } from "node:fs";
import { beforeEach, expect, test, vi } from "vitest";
import { correct } from "./correct";
import { resetDbForTests } from "./db/testing";
import { seed, type Seed } from "./testing/fixtures";
import { toolByName } from "./tools";
import { absoluteUrls } from "./urls";

const BASE = "https://gamepanion.example";
let s: Seed;

beforeEach(async () => {
  s = await seed();
});

// What an MCP client gets: the result made absolute as mcp.ts does it.
const run = async (name: string, p: { id: string }, args: unknown) => absoluteUrls(BASE, await toolByName(name)!.run(p, args));
const next = (out: Record<string, unknown>) => (out.next as string[]).join("\n");

test("record links the session it filed", async () => {
  const out = await run("record", s.a, { playthroughId: s.liesOfP, summary: "Ran.", transcript: "Ran around." });
  expect(next(out)).toContain(`with its link: ${out.url}.`);
  expect(out.url).toMatch(new RegExp(`^${BASE}/s/`));
});

test("background and spoiler settings point at the playthrough's Settings tab", async () => {
  await correct(s.a, [{ what: "playthrough", id: s.liesOfP, background: "light" }]);
  const filed = await run("record", s.a, { playthroughId: s.liesOfP, summary: "x", transcript: "x", items: [{ name: "Torch" }] });
  expect(next(filed)).toContain(`Settings tab: ${BASE}/p/${s.liesOfP}/settings.`);
  // Hints are filed for Lies of P above the player's setting, so the threads offer more and say where the setting is.
  const threads = await run("open_threads", s.a, { playthroughId: s.liesOfP });
  expect(next(threads)).toContain(`Settings tab: ${BASE}/p/${s.liesOfP}/settings.`);
});

test("chat_key links the account page's key section", async () => {
  vi.stubEnv("GAMEPANION_KEY_ENCRYPTION_KEY", "ab".repeat(32));
  const out = await run("chat_key", s.a, {});
  expect(out.url).toBe(`${BASE}/account#key`);
  expect(next(out)).toContain(`${BASE}/account#key`);
  vi.unstubAllEnvs();
});

test("briefing links the playthrough's Overview; with nothing filed, the home page", async () => {
  expect(next(await run("briefing", s.a, { playthroughId: s.liesOfP }))).toContain(`Overview of the playthrough's page: ${BASE}/p/${s.liesOfP}.`);
  await resetDbForTests();
  expect(next(await run("briefing", { id: "new-player" }, {}))).toContain(`home page shows how to start: ${BASE}/.`);
});

test("no next text carries a hard-coded path: they all come from the path builders", () => {
  const src = readFileSync(new URL("./tools.ts", import.meta.url), "utf8");
  expect(src).not.toMatch(/["`'(]\/(p|s|account)\b/);
});
