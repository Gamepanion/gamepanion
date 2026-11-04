// The third-party packages Gamepanion ships (production dependencies, transitive, the platform's optional binaries left out), with their licenses, for the docs' licenses page (docs_hooks/licenses.py) and the about tool (#48, #111):
// third-party-licenses.json, sorted by name. Made, not committed (git-ignored): `npm run licenses`, run before build, dev, demo and typecheck,
// by vitest (globalSetup) and by the docs build.
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const lock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8"));
const out = new Map();
for (const [path, pkg] of Object.entries(lock.packages ?? {})) {
  // Not dev-only, and not optional: optional packages are the platform-specific binaries, installed only on their platform, which would
  // make the file differ between machines.
  if (!path.startsWith("node_modules/") || pkg.dev || pkg.devOptional || pkg.optional) continue;
  const name = path.slice(path.lastIndexOf("node_modules/") + "node_modules/".length);
  if (out.has(name)) continue;
  const dir = join(root, path);
  let manifest = {};
  try {
    manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  } catch {}
  const file = existsSync(dir) ? readdirSync(dir).find((f) => /^(licen[cs]e|copying)/i.test(f)) : undefined;
  const repo = typeof manifest.repository === "string" ? manifest.repository : (manifest.repository?.url ?? null);
  out.set(name, {
    name,
    version: pkg.version ?? manifest.version ?? null,
    license: pkg.license ?? manifest.license ?? null,
    repository: repo ? repo.replace(/^git\+/, "").replace(/\.git$/, "") : null,
    text: file ? readFileSync(join(dir, file), "utf8").trim() : null,
  });
}
const list = [...out.values()].sort((a, b) => a.name.localeCompare(b.name));
writeFileSync(join(root, "third-party-licenses.json"), JSON.stringify(list, null, 1) + "\n");

// For vitest's globalSetup: the file is written on import, so the hook itself has nothing left to do.
export default function setup() {}
