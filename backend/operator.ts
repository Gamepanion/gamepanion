// The operator's pages (#48, convention "Operator pages"): the imprint, privacy policy, terms and the pricing page's words, as Markdown
// files of the operator's own, named by GAMEPANION_IMPRINT_FILE, _PRIVACY_FILE, _TERMS_FILE and _PRICING_FILE. A value may hold `{lang}`,
// replaced by the page's language and falling back to English. Gamepanion ships none of the texts: no file, no page and no footer link.
// Where the instance sells through Creem, all four must be there, or /health says what is missing.
import { readFile, stat } from "node:fs/promises";
import { config } from "./config";

export type OperatorPage = "imprint" | "privacy" | "terms" | "pricing";
export const LEGAL_PAGES = ["imprint", "privacy", "terms"] as const;

// A page of text, not a place to keep files: anything larger is a mistake in the setting.
export const MAX_OPERATOR_BYTES = 256 * 1024;

const setting = (page: OperatorPage) => `GAMEPANION_${page.toUpperCase()}_FILE`;

async function usable(path: string): Promise<boolean> {
  try {
    const info = await stat(/*turbopackIgnore: true*/ path);
    return info.isFile() && info.size <= MAX_OPERATOR_BYTES;
  } catch {
    return false;
  }
}

/** The file for `page` in `locale`: its own language's when there is one, else English; null when there is none usable. */
async function fileFor(page: OperatorPage, locale: string): Promise<string | null> {
  const value = config.operatorFile(page);
  if (!value) return null;
  for (const lang of value.includes("{lang}") ? [locale, "en"] : [locale]) {
    const path = value.replaceAll("{lang}", lang);
    if (await usable(path)) return path;
  }
  return null;
}

/** The page's Markdown, read on every request so an edited file shows at once; null when the page doesn't exist. */
export async function readOperatorPage(page: OperatorPage, locale: string): Promise<string | null> {
  const path = await fileFor(page, locale);
  if (!path) return null;
  try {
    return await readFile(/*turbopackIgnore: true*/ path, "utf8");
  } catch {
    return null;
  }
}

/** The footer's links: only the pages that exist. */
export async function operatorLinks(locale: string): Promise<{ page: (typeof LEGAL_PAGES)[number]; href: string }[]> {
  const out = [];
  for (const page of LEGAL_PAGES) if (await fileFor(page, locale)) out.push({ page, href: `/${page}` });
  return out;
}

/** What keeps an instance that sells through Creem from being set up: the setting by name, never its path or text. Null when nothing does. */
export async function setupProblem(): Promise<string | null> {
  if (config.paymentProvider() !== "creem") return null;
  try {
    config.creem();
  } catch (e) {
    return e instanceof Error ? e.message : "the Creem settings are incomplete";
  }
  for (const page of [...LEGAL_PAGES, "pricing"] as OperatorPage[])
    if (!(await fileFor(page, "en"))) return `GAMEPANION_PAYMENT_PROVIDER=creem needs ${setting(page)} (missing, not a file, or larger than 256 KiB)`;
  return null;
}
