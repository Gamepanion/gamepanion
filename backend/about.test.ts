// The about tool (#111): the instance's own pages over MCP, read by the same function as the website, the plans as the provider holds
// them, and the licenses; a page the instance doesn't have is said to be missing, never made up.
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test, vi } from "vitest";
import { thirdPartyLicenses } from "./licenses";
import { toolByName } from "./tools";

const dir = mkdtempSync(join(tmpdir(), "gamepanion-about-"));
const run = (args: unknown) => toolByName("about")!.run({ id: "p" }, args);
const next = (out: Record<string, unknown>) => (out.next as string[]).join(" ");
afterEach(() => vi.unstubAllEnvs());

test("terms come as the operator wrote them, in the player's language, with the page's link", async () => {
  writeFileSync(join(dir, "terms.en.md"), "# Terms\n\nYou can cancel at any time.");
  writeFileSync(join(dir, "terms.de.md"), "# AGB\n\nDu kannst jederzeit kündigen.");
  vi.stubEnv("GAMEPANION_TERMS_FILE", join(dir, "terms.{lang}.md"));
  const out = await run({ page: "terms" });
  expect(out).toMatchObject({ page: "terms", url: "/terms", text: "# Terms\n\nYou can cancel at any time." });
  expect(next(out)).toMatch(/Answer from this text alone/);
  expect((await run({ page: "terms", language: "de" })).text).toContain("jederzeit kündigen");
});

test("a page the instance doesn't have is null, and next says not to fill it in", async () => {
  const out = await run({ page: "privacy" });
  expect(out).toMatchObject({ url: null, text: null });
  expect(next(out)).toMatch(/no privacy page.*don't fill in/);
});

test("pricing carries the plans where something is sold, and none where nothing is", async () => {
  expect((await run({ page: "pricing" })).plans).toEqual([]);
  vi.stubEnv("GAMEPANION_PAYMENT_PROVIDER", "fake");
  vi.stubEnv("GAMEPANION_FAKE_WEBHOOK_SECRET", "s");
  const out = await run({ page: "pricing" });
  expect(out.url).toBe("/subscribe");
  expect(out.plans).toContainEqual({ tier: "standard", period: "month", name: "Monthly", amount: 499, currency: "EUR", taxIncluded: true });
  expect(next(out)).toMatch(/minor units/);
});

test("licenses: Gamepanion's own and every shipped package with its license, without the texts", async () => {
  const out = await run({ page: "licenses" });
  expect(out.own).toEqual({ name: "Gamepanion", license: "AGPL-3.0-only", source: "https://github.com/gamepanion/gamepanion" });
  expect((out.packages as unknown[]).length).toBe(thirdPartyLicenses.length);
  expect(JSON.stringify(out)).not.toContain("Permission is hereby granted");
  expect(out.url).toBe("https://docs.gamepanion.app/reference/licenses/");
});
