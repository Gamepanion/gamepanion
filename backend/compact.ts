// What Claude reads of a tool result: every field with nothing in it (null, "", [] or {}) left out, at any depth. A long list of items
// carried hundreds of `null`s and `[]`s, each costing tokens and saying nothing; the output schema still says what each field is. The
// structured result and the REST API keep every field.

const empty = (v: unknown) =>
  v === null ||
  v === undefined ||
  v === "" ||
  (Array.isArray(v) && v.length === 0) ||
  (typeof v === "object" && !Array.isArray(v) && Object.keys(v as object).length === 0);

/** A copy of `body` without the fields that hold nothing. */
export function withoutEmpty<T>(body: T): T {
  const walk = (x: unknown): unknown => {
    if (Array.isArray(x)) return x.map(walk);
    if (x === null || typeof x !== "object") return x;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(x)) {
      const w = walk(v);
      if (!empty(w)) out[k] = w;
    }
    return out;
  };
  return walk(body) as T;
}
