import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // The suite prints no log lines.
  test: {
    environment: "node",
    exclude: ["**/node_modules/**", ".next/**"],
    env: { GAMEPANION_LOG_LEVEL: "silent" },
    // @creem_io/nextjs imports "next/server" without an extension, which Node's own resolver refuses; Vite resolves it.
    server: { deps: { inline: ["@creem_io/nextjs"] } },
  },
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
});
