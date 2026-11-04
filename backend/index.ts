// The backend's boundary: the only module the frontend (app/, components/, proxy.ts) may import from backend/ (enforced in
// eslint.config.mjs). Each read below is shaped like the endpoint it would become if the backend moved out, so the cut would be here.
import { sql } from "kysely";
import { db } from "./db";
import { healthRoute, setDbProbe } from "./http/health";

export { healthRoute };
export {
  authRoute,
  authServerMetadataRoute,
  clientName,
  openIdConfigRoute,
  passkeysOf,
  playerFromHeaders,
  profileOf,
  refusedSignIn,
  signedInAs,
  signInMethods,
  type PasskeyView,
  type ProfileView,
  type RefusedSignIn,
} from "./auth/session";
export type { SignInMethods } from "./auth/methods";
export { mcpRoute } from "./mcp";
export { chatEnabled, chatNeedsKey, chatRoute, chatWithoutOwnKey, voiceEnabled, voiceRoute } from "./chat-route";
export type { AboutKind, ChatLink } from "./chat";
export { dispatch as apiRoute } from "./http/api";
export { apiResourceMetadataRoute } from "./http/metadata";
export {
  accountExportPath,
  accountKeyPath,
  licensesUrl,
  mcpResource as mcpUrl,
  PLAYTHROUGH_TABS,
  safeNext,
  siteUrl,
  tabPath,
  todoPath,
  type PlaythroughTab,
} from "./urls";

// What the pages read, as the signed-in player sees it: through the same gate as the tools, never asking for spoilers unless the
// player asked on the page.
export { BRIEFING_SECTIONS, briefing, briefingIds, continuePlaythrough, type Briefing } from "./briefing";
export { buildOf, type BuildView } from "./builds";
export { codexOf, type CodexView } from "./codex";
export { getPlaythrough, listPlaythroughs, type PlaythroughView } from "./games";
export { itemsOf, type ItemView } from "./items";
export { questsOf, type QuestView } from "./quests";
export { todosOf, type TodoView } from "./todos";
export { getSession, latestSession, sessionsOf, type SessionSummary, type SessionView } from "./sessions";
export { InvalidInputError, NotFoundError } from "./errors";
export { operatorLinks, readOperatorPage } from "./operator";
export { checkoutOverlay, paymentsWebhookRoute, portalFor, pricingPlans, startCheckout, subscriptionOf } from "./billing/flow";
export { ACTIVE_GAME_CHANGE_DAYS, accessOf, chooseActiveGame, isFrozen, nextActiveGameChange } from "./access";
export { exportDownloadRoute } from "./export";
export { keyStatus, keyStorageEnabled, removeKey, saveKey, testKey } from "./keys";
export {
  BACKGROUND_LEVELS,
  CODEX_KINDS,
  EFFECTS,
  OPEN_STATUSES,
  SPOILER_LEVELS,
  TRUST_LEVELS,
  type BackgroundLevel,
  type ItemKind,
  type Player,
  type QuestStatus,
  type SpoilerLevel,
} from "./types";
export { correct } from "./correct";
export type { BackgroundLine } from "./background";

// The health probe asks the database a trivial question; opening it (and migrating) is part of answering.
setDbProbe(async () => sql`select 1`.execute(await db()));
export { tagsInUse } from "./tags";
