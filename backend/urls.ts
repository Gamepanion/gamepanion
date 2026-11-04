// URLs the backend hands out. The domain hands out paths; mcp.ts makes them absolute with absoluteUrls() just before a result
// leaves, so the pages, which read the domain in-process, get links they can use as they are.
import { config } from "./config";

/**
 * The tabs of a playthrough's page, in their order; each has an address of its own (ADR 0019). Overview is the playthrough's own address.
 */
export const PLAYTHROUGH_TABS = ["overview", "quests", "todos", "character", "items", "codex", "sessions", "notes", "references", "settings"] as const;
export type PlaythroughTab = (typeof PLAYTHROUGH_TABS)[number];

/** A playthrough: its Overview, where the player left off. */
export const playthroughPath = (id: string) => `/p/${id}`;
/** One tab of a playthrough's page. */
export const tabPath = (id: string, tab: PlaythroughTab) => (tab === "overview" ? playthroughPath(id) : `${playthroughPath(id)}/${tab}`);
/** A play session: its transcript and what was filed from it. */
export const sessionPath = (id: string) => `/s/${id}`;
/** A quest's row on its playthrough's Quests tab. */
export const questPath = (playthroughId: string, id: string) => `${tabPath(playthroughId, "quests")}#quest-${id}`;
/** A codex entry's row on its playthrough's Codex tab. */
export const codexPath = (playthroughId: string, id: string) => `${tabPath(playthroughId, "codex")}#codex-${id}`;
/** An item's row on its playthrough's Items tab. */
export const itemPath = (playthroughId: string, id: string) => `${tabPath(playthroughId, "items")}#item-${id}`;

/** Where a player pastes their own Anthropic key for the in-app chat (ADR 0021). */
export const accountKeyPath = () => "/account#key";
/** The download of everything the player filed (#106), for the signed-in browser. */
export const accountExportPath = () => "/account/export";
/** The account page's data section: the download and deleting the account (#106). */
export const accountDataPath = () => "/account#data";
/** Where a player subscribes (#48). */
export const subscribePath = () => "/subscribe";
/** The account page. */
export const accountPath = () => "/account";
/** The home page: what the player is playing, or, with nothing filed, how to start. */
export const homePath = () => "/";

/** A to-do's row on its playthrough's To-dos tab. */
export const todoPath = (playthroughId: string, id: string) => `${tabPath(playthroughId, "todos")}#todo-${id}`;

/**
 * A path written into a tool's `next` text (#82), marked so absoluteUrls can make it absolute like every `url`: the domain hands out paths,
 * never the public address.
 */
export const inText = (path: string) => `<${path}>`;
const IN_TEXT = /<(\/[^<>\s]*)>/g;

/** A copy of `body` with every `url` that is a path prefixed with `base`, and every path marked in a `next` text (inText) too. */
export function absoluteUrls<T>(base: string, body: T): T {
  const walk = (x: unknown): unknown => {
    if (Array.isArray(x)) return x.map(walk);
    if (x === null || typeof x !== "object") return x;
    return Object.fromEntries(
      Object.entries(x).map(([k, val]) => [
        k,
        k === "url" && typeof val === "string" && val.startsWith("/")
          ? base + val
          : k === "next" && Array.isArray(val)
            ? val.map((t) => (typeof t === "string" ? t.replace(IN_TEXT, (_, path: string) => base + path) : t))
            : walk(val),
      ]),
    );
  };
  return walk(body) as T;
}

// Better Auth lives under this path; its issuer is the public URL plus it.
export const AUTH_PATH = "/api/auth";
/** The instance's own address, for absolute links such as the link preview image. */
export const siteUrl = () => config.publicUrl();
/** The OAuth resource (RFC 8707) MCP access tokens are bound to. */
export const mcpResource = () => `${config.publicUrl()}/mcp`;
/** Where the REST API lives; its paths in the route table start with it. */
export const API_PREFIX = "/api/v1";
/** The OAuth resource REST access tokens are bound to: a token for /mcp fails there, and the other way round. */
export const apiResource = () => `${config.publicUrl()}${API_PREFIX}`;
/** The issuer of the access tokens: Better Auth, under its base path. */
export const issuer = () => `${config.publicUrl()}${AUTH_PATH}`;
// The keys tokens are checked against. Fetched from this same process over loopback, not through PUBLIC_URL: a server behind a reverse
// proxy often can't reach its own public address.
export const jwksUrl = () => `http://127.0.0.1:${config.port()}${AUTH_PATH}/jwks`;

// Where to go after signing in: a same-origin path, else "/". A second "/" or any "\" would make it protocol-relative (browsers read
// "\" as "/"), and browsers drop tabs and newlines, so "/\t/x" is "//x".
export const safeNext = (v: unknown): string => (typeof v === "string" && /^\/(?![/\\])[^\\\x00-\x1f\x7f]*$/.test(v) ? v : "/");
