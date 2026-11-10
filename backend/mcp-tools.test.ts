import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as z from "zod";
import { expect, test } from "vitest";
import { TOOLS } from "./tools";

// The MCP tools as a client lists them: name, description, hints and the JSON Schemas of what each takes and returns. Committed for the
// docs (docs_hooks/mcp_tools.py renders it); `npm run generate` rewrites it (UPDATE_MCP_TOOLS=1), and CI fails when it's stale.
const FILE = join(import.meta.dirname, "../mcp-tools.json");
const generated = () =>
  JSON.stringify(
    {
      tools: TOOLS.map((t) => ({
        name: t.name,
        description: t.description,
        annotations: t.annotations,
        inputSchema: z.toJSONSchema(t.input, { io: "input" }),
        outputSchema: z.toJSONSchema(t.output, { io: "output" }),
      })),
    },
    null,
    2,
  ) + "\n";

test("mcp-tools.json is up to date with the tools", async () => {
  if (process.env.UPDATE_MCP_TOOLS === "1") await writeFile(FILE, generated());
  expect(await readFile(FILE, "utf8").catch(() => "missing")).toBe(generated());
});
