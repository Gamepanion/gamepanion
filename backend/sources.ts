// Sources (ADR 0008): links the player keeps, with the facts Claude took from them and how far they are trusted (#58). Gamepanion stores
// them and never fetches them.
import { TRUST_LEVELS, type Source, type SourceInput, type Trust } from "./types";

const key = (url: string) => url.trim().replace(/\/+$/, "");

/** A source's trust as stored; one stored before trust existed, or filed without one, is `medium`. */
export const trustOf = (t: unknown): Trust => (TRUST_LEVELS.includes(t as Trust) ? (t as Trust) : "medium");

/** `sources` by trust, high first; the order within a level stays. */
export const byTrust = <T extends { trust: Trust }>(sources: T[]): T[] =>
  [...sources].sort((a, b) => TRUST_LEVELS.indexOf(a.trust) - TRUST_LEVELS.indexOf(b.trust));

/** The sources stored as JSON text, by trust, high first. */
export const parseSources = (json: string): Source[] => byTrust((JSON.parse(json) as Source[]).map((s) => ({ ...s, trust: trustOf(s.trust) })));

/**
 * `before` with `added` merged in: a link already there is replaced by the new one (fresher facts; a trust given changes it, none keeps
 * the one it had), a new one goes last.
 */
export function mergeSources(before: Source[], added: SourceInput[], on: string): Source[] {
  const out = [...before];
  for (const a of added) {
    const s = { url: a.url.trim(), title: a.title?.trim() || null, facts: a.facts?.trim() || null, on };
    const i = out.findIndex((x) => key(x.url) === key(s.url));
    if (i === -1) out.push({ ...s, trust: trustOf(a.trust) });
    else out[i] = { ...s, title: s.title ?? out[i].title, facts: s.facts ?? out[i].facts, trust: a.trust ?? out[i].trust };
  }
  return out;
}

/** The trust of `url` among `sources`, when it is one of them. */
export const trustOfUrl = (sources: Source[], url: string): Trust | null => sources.find((s) => key(s.url) === key(url))?.trust ?? null;
