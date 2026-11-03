// Which language a page shows (components/copy).
import { expect, test } from "vitest";
import { pickLocale } from ".";
import { de } from "./de";
import { en } from "./en";

test("the player's choice wins, then the browser's languages by weight, then English", () => {
  expect(pickLocale("de", "en-US,en;q=0.9")).toBe("de");
  expect(pickLocale(undefined, "de-DE,de;q=0.9,en;q=0.8")).toBe("de");
  expect(pickLocale(undefined, "fr-FR,fr;q=0.9,de;q=0.5,en;q=0.7")).toBe("en");
  expect(pickLocale("xx", "fr")).toBe("en");
  expect(pickLocale(undefined, null)).toBe("en");
});

// Owed to players by Anthropic's terms (#56): the chat says at the start that it's an AI and that its claims should be checked.
test("the empty chat names it an AI and asks to check facts, in both languages", () => {
  expect(en.chatHello).toMatch(/an AI\..*Check what it says/);
  expect(de.chatHello).toMatch(/eine KI\..*Prüf, was sie/);
});
