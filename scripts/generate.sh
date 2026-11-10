#!/bin/sh
# Regenerates everything derived from the route table (backend/http/api.ts) and the MCP tools (backend/tools.ts). Commit the result; CI runs this and fails on any
# difference.
set -e
cd "$(dirname "$0")/.."

# openapi.json, from the route table (vitest resolves backend/'s TypeScript imports).
UPDATE_OPENAPI=1 npx vitest run backend/http/openapi.test.ts --silent >/dev/null

# mcp-tools.json, from the MCP tools, for the docs' MCP tools page.
UPDATE_MCP_TOOLS=1 npx vitest run backend/mcp-tools.test.ts --silent >/dev/null
