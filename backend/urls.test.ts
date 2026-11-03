import { expect, test } from "vitest";
import { codexPath, itemPath, playthroughPath, questPath, tabPath } from "./urls";

// A link to a thing opens its tab (ADR 0019): the tab is in the path, the row in the fragment.
test("links to a quest, an item and a codex entry name their tab", () => {
  expect(playthroughPath("t")).toBe("/p/t");
  expect(tabPath("t", "overview")).toBe("/p/t");
  expect(tabPath("t", "settings")).toBe("/p/t/settings");
  expect(questPath("t", "q")).toBe("/p/t/quests#quest-q");
  expect(itemPath("t", "i")).toBe("/p/t/items#item-i");
  expect(codexPath("t", "c")).toBe("/p/t/codex#codex-c");
});
