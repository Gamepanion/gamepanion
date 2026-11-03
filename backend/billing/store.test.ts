// The billing store (#48): webhooks repeated or out of order cause no duplicate row and never move validUntil backwards.
import { beforeEach, expect, test } from "vitest";
import { billing, resetBillingForTests } from "./store";

beforeEach(resetBillingForTests);

test("started twice leaves one row", async () => {
  const b = await billing();
  await b.upsertStarted({ providerRef: "sub_1", playerId: "p1", customerRef: "c1", validUntil: 100 });
  await b.upsertStarted({ providerRef: "sub_1", playerId: "p1", customerRef: null, validUntil: 100 });
  expect(await b.ofPlayer("p1")).toMatchObject([{ providerRef: "sub_1", customerRef: "c1", status: "active", validUntil: 100 }]);
});

test("setPeriod never moves validUntil backwards", async () => {
  const b = await billing();
  await b.upsertStarted({ providerRef: "sub_1", playerId: "p1", customerRef: null, validUntil: 200 });
  await b.setPeriod("sub_1", 100);
  expect((await b.ofPlayer("p1"))[0].validUntil).toBe(200);
  await b.setPeriod("sub_1", 300, "active");
  expect((await b.ofPlayer("p1"))[0].validUntil).toBe(300);
});

test("setPeriod on an unknown reference returns false and writes nothing", async () => {
  const b = await billing();
  expect(await b.setPeriod("sub_x", 100)).toBe(false);
  expect(await b.lapse("sub_x")).toBe(false);
  expect(await b.ofPlayer("p1")).toEqual([]);
});

test("chooseGame replaces the earlier choice; forgetPlayer removes the player's rows and only theirs", async () => {
  const b = await billing();
  await b.chooseGame("p1", "g1");
  await b.chooseGame("p1", "g2");
  expect(await b.chosenGame("p1")).toBe("g2");
  await b.chooseGame("p2", "g3");
  await b.upsertStarted({ providerRef: "sub_1", playerId: "p1", customerRef: null, validUntil: null });
  await b.upsertStarted({ providerRef: "sub_2", playerId: "p2", customerRef: null, validUntil: null });
  await b.forgetPlayer("p1");
  expect([await b.chosenGame("p1"), await b.ofPlayer("p1")]).toEqual([null, []]);
  expect([await b.chosenGame("p2"), (await b.ofPlayer("p2")).length]).toEqual(["g3", 1]);
});
