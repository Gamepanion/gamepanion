// The demo seed (npm run demo) stays valid: every session files through the real write path, and the demo has what each tab shows.
import { beforeEach, describe, expect, it } from "vitest";
import { resetDbForTests } from "../db/testing";
import { listPlaythroughs } from "../games";
import { record } from "../record";
import { DEMO_SESSIONS } from "./demo";

describe("the demo seed", () => {
  beforeEach(resetDbForTests);

  it("files every session and fills both playthroughs", async () => {
    const player = { id: "demo-player" };
    for (const session of DEMO_SESSIONS) await record(player, session);
    const runs = await listPlaythroughs(player);
    expect(runs.map((r) => r.game.title).sort()).toEqual(["Elden Ring", "Lies of P"]);
  });
});
