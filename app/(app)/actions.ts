"use server";
// The page's own writes. A playthrough's settings (ADR 0016) go through correct, as when the player tells Claude: the same checks, and
// only the signed-in player's own playthrough.
import { correct, latestSession, type BackgroundLevel, type SpoilerLevel } from "@/backend";
import { pagePlayer } from "./viewer";

export async function saveSettings(playthroughId: string, settings: { background?: BackgroundLevel; spoilers?: SpoilerLevel }): Promise<void> {
  const p = await pagePlayer();
  await correct(p, [{ what: "playthrough", id: playthroughId, background: settings.background, spoilers: settings.spoilers }]);
}

// A to-do ticked off or opened again on its tab (ADR 0020): through correct, as when the player tells Claude.
export async function setTodoStatus(todoId: string, status: "open" | "done"): Promise<void> {
  const p = await pagePlayer();
  await correct(p, [{ what: "todo", id: todoId, status }]);
}

// The first-run page asks every few seconds whether the first session is filed yet (#80): its link, or null.
export async function firstSession(): Promise<{ url: string } | null> {
  const s = await latestSession(await pagePlayer());
  return s && { url: s.url };
}
