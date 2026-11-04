import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // The suite prints no log lines.
  test: {
    // Writes third-party-licenses.json first: backend/licenses.ts imports it, and it is made, not committed.
    globalSetup: "scripts/third-party-licenses.mjs",
    environment: "node",
    exclude: ["**/node_modules/**", ".next/**"],
    env: { GAMEPANION_LOG_LEVEL: "silent" },
  },
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
});
