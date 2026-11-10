import { expect, test } from "vitest";
import { withoutEmpty } from "./compact";

test("withoutEmpty leaves out null, empty strings, lists and objects at any depth, and keeps false and 0", () => {
  expect(withoutEmpty({ a: null, b: "", c: [], d: {}, e: { f: null, g: [] }, h: false, i: 0, j: [{ k: null, l: "x" }, []], m: "y" })).toEqual({
    h: false,
    i: 0,
    j: [{ l: "x" }, []],
    m: "y",
  });
});
