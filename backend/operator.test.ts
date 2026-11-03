// The operator's pages (#48): files named by settings, `{lang}` with an English fallback, a size limit, and what an instance selling
// through Creem must have.
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test, vi } from "vitest";
import { MAX_OPERATOR_BYTES, operatorLinks, readOperatorPage, setupProblem } from "./operator";

const dir = mkdtempSync(join(tmpdir(), "gamepanion-operator-"));
const put = (name: string, text: string) => {
  writeFileSync(join(dir, name), text);
  return join(dir, name);
};
afterEach(() => vi.unstubAllEnvs());

test("no setting, no page and no link", async () => {
  expect(await readOperatorPage("imprint", "en")).toBeNull();
  expect(await operatorLinks("en")).toEqual([]);
});

test("{lang} picks the locale's file and falls back to en", async () => {
  put("imprint.en.md", "# Imprint");
  put("imprint.de.md", "# Impressum");
  put("privacy.en.md", "# Privacy");
  vi.stubEnv("GAMEPANION_IMPRINT_FILE", join(dir, "imprint.{lang}.md"));
  vi.stubEnv("GAMEPANION_PRIVACY_FILE", join(dir, "privacy.{lang}.md"));
  expect(await readOperatorPage("imprint", "de")).toBe("# Impressum");
  expect(await readOperatorPage("privacy", "de")).toBe("# Privacy");
  expect((await operatorLinks("de")).map((l) => l.href)).toEqual(["/imprint", "/privacy"]);
});

test("a file above 256 KiB is no page", async () => {
  vi.stubEnv("GAMEPANION_TERMS_FILE", put("terms.md", "x".repeat(MAX_OPERATOR_BYTES + 1)));
  expect(await readOperatorPage("terms", "en")).toBeNull();
});

test("with creem every operator file is required, named by its setting; with fake or none nothing is", async () => {
  expect(await setupProblem()).toBeNull();
  vi.stubEnv("GAMEPANION_PAYMENT_PROVIDER", "fake");
  expect(await setupProblem()).toBeNull();
  vi.stubEnv("GAMEPANION_PAYMENT_PROVIDER", "creem");
  vi.stubEnv("GAMEPANION_CREEM_API_KEY", "k");
  vi.stubEnv("GAMEPANION_CREEM_PRODUCT_ID", "p");
  vi.stubEnv("GAMEPANION_CREEM_WEBHOOK_SECRET", "s");
  for (const page of ["imprint", "privacy", "terms"]) vi.stubEnv(`GAMEPANION_${page.toUpperCase()}_FILE`, put(`${page}.md`, `# ${page}`));
  expect(await setupProblem()).toBe("GAMEPANION_PAYMENT_PROVIDER=creem needs GAMEPANION_PRICING_FILE (missing, not a file, or larger than 256 KiB)");
  vi.stubEnv("GAMEPANION_PRICING_FILE", put("pricing.md", "One game free."));
  expect(await setupProblem()).toBeNull();
});
