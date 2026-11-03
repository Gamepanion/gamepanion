// References and sources (ADR 0008, #58, #95). A reference is a site kept for a game, where Claude looks things up, with a trust level
// (an official guide above a Steam discussion). A source is a page Claude found and took facts from, on an item or a codex entry; it has
// no trust of its own. Gamepanion stores both and fetches neither.
import { TRUST_LEVELS, type Reference, type ReferenceInput, type Source, type SourceInput, type Trust } from "./types";

const key = (url: string) => url.trim().replace(/\/+$/, "");

/** A reference's trust as stored; one kept before trust existed, or without one, is `medium`. */
export const trustOf = (t: unknown): Trust => (TRUST_LEVELS.includes(t as Trust) ? (t as Trust) : "medium");

/** References by trust, high first; the order within a level stays. */
export const byTrust = <T extends { trust: Trust }>(refs: T[]): T[] => [...refs].sort((a, b) => TRUST_LEVELS.indexOf(a.trust) - TRUST_LEVELS.indexOf(b.trust));

/** A row's sources as stored (JSON text); a trust stored on one by an earlier version is dropped. */
export const parseSources = (json: string): Source[] =>
  (JSON.parse(json) as Source[]).map(({ url, title, facts, on }) => ({ url, title: title ?? null, facts: facts ?? null, on: on ?? null }));

/** A game's references as stored (JSON text), by trust, high first. */
export const parseReferences = (json: string): Reference[] =>
  byTrust(
    (JSON.parse(json) as Reference[]).map(({ url, title, facts, on, trust }) => ({
      url,
      title: title ?? null,
      facts: facts ?? null,
      on: on ?? null,
      trust: trustOf(trust),
    })),
  );

/** `before` with `added` merged in: a link already there is replaced by the new one (fresher facts), a new one goes last. */
export function mergeSources(before: Source[], added: SourceInput[], on: string): Source[] {
  const out = [...before];
  for (const a of added) {
    const s = { url: a.url.trim(), title: a.title?.trim() || null, facts: a.facts?.trim() || null, on };
    const i = out.findIndex((x) => key(x.url) === key(s.url));
    if (i === -1) out.push(s);
    else out[i] = { ...s, title: s.title ?? out[i].title, facts: s.facts ?? out[i].facts };
  }
  return out;
}

/** As mergeSources, for references: a trust given changes it, none keeps the one it had (medium for a new one). */
export function mergeReferences(before: Reference[], added: ReferenceInput[], on: string): Reference[] {
  const merged = mergeSources(before, added, on);
  return merged.map((s) => {
    const given = added.findLast((a) => key(a.url) === key(s.url))?.trust;
    const was = before.find((b) => key(b.url) === key(s.url))?.trust;
    return { ...s, trust: given ?? was ?? "medium" };
  });
}
