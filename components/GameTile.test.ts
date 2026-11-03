import { describe, expect, it } from "vitest";
import { hueOf, initials } from "./GameTile";

describe("game tiles", () => {
  it("take the first letters of the first two capitalised words", () => {
    expect(initials("Lies of P")).toBe("LP");
    expect(initials("Baldur's Gate 3")).toBe("BG");
    expect(initials("the witcher")).toBe("TW");
    expect(initials("Clair Obscur: Expedition 33")).toBe("CO");
  });
  it("take two letters of a one-word name, and a mark for none", () => {
    expect(initials("Hades")).toBe("HA");
    expect(initials("…")).toBe("?");
  });
  it("give the same name the same hue", () => {
    expect(hueOf("Elden Ring")).toBe(hueOf("Elden Ring"));
    expect(hueOf("Elden Ring")).toBeGreaterThanOrEqual(0);
    expect(hueOf("Elden Ring")).toBeLessThan(360);
  });
});
