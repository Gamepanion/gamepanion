// The billing store (#48, ADR 0023): who subscribes, in a SQLite file of its own (DATA_DIR/billing.sqlite), apart from what players
// filed: one row per subscription (status, the provider's reference, until when it is paid), and the game a limited player chose to keep
// active. Checked locally on every filing, so a slow or absent provider never stops a subscriber.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { join } from "node:path";
import type { ColumnType, Kysely } from "kysely";
import { Migrator, type Migration } from "kysely/migration";
import { config } from "../config";
import { connect } from "../db/connect";
import { processState } from "../state";

export type Subscription = {
  providerRef: string;
  /** What was bought (#56): the subscription, or with the instance's AI. */
  tier: "standard" | "hostedAi";
  playerId: string;
  customerRef: string | null;
  status: "active" | "lapsed";
  validUntil: number | null;
  /** False once cancelled: it stays active until `validUntil`, then ends instead of renewing. */
  renews: boolean;
  updatedAt: number;
};

interface BillingSchema {
  subscriptions: {
    provider_ref: string;
    player_id: string;
    customer_ref: string | null;
    status: string;
    valid_until: number | null;
    updated_at: number;
    tier: ColumnType<string, string | undefined, string>;
    renews: ColumnType<number, number | undefined, number>;
  };
  ai_usage: { player_id: string; month: string; tokens: number; seconds: number };
  active_game: { player_id: string; game_id: string; chosen_at: number };
}

const migrations: Record<string, Migration> = {
  "001_billing": {
    async up(db: Kysely<any>) {
      await db.schema
        .createTable("subscriptions")
        .addColumn("provider_ref", "text", (c) => c.primaryKey())
        .addColumn("player_id", "text", (c) => c.notNull())
        .addColumn("customer_ref", "text")
        .addColumn("status", "text", (c) => c.notNull())
        .addColumn("valid_until", "bigint")
        .addColumn("updated_at", "bigint", (c) => c.notNull())
        .execute();
      await db.schema.createIndex("subscriptions_by_player").on("subscriptions").column("player_id").execute();
      await db.schema
        .createTable("active_game")
        .addColumn("player_id", "text", (c) => c.primaryKey())
        .addColumn("game_id", "text", (c) => c.notNull())
        .addColumn("chosen_at", "bigint", (c) => c.notNull())
        .execute();
    },
  },
  "002_hosted_ai": {
    // #56, ADR 0024: which tier a subscription is, and what a player used of the instance's AI per calendar month (tokens, and seconds
    // of speech transcribed). Nothing of what was said.
    async up(db: Kysely<any>) {
      await db.schema
        .alterTable("subscriptions")
        .addColumn("tier", "text", (c) => c.notNull().defaultTo("standard"))
        .execute();
      await db.schema
        .createTable("ai_usage")
        .addColumn("player_id", "text", (c) => c.notNull())
        .addColumn("month", "text", (c) => c.notNull())
        .addColumn("tokens", "integer", (c) => c.notNull().defaultTo(0))
        .addColumn("seconds", "integer", (c) => c.notNull().defaultTo(0))
        .addPrimaryKeyConstraint("ai_usage_pk", ["player_id", "month"])
        .execute();
    },
  },
  "003_renews": {
    // Whether a subscription renews: cancelled ones keep their period but say they end.
    async up(db: Kysely<any>) {
      await db.schema
        .alterTable("subscriptions")
        .addColumn("renews", "integer", (c) => c.notNull().defaultTo(1))
        .execute();
    },
  },
};

const view = (r: {
  [K in keyof BillingSchema["subscriptions"]]: K extends "tier" ? string : K extends "renews" ? number : BillingSchema["subscriptions"][K];
}): Subscription => ({
  providerRef: r.provider_ref,
  tier: r.tier === "hostedAi" ? "hostedAi" : "standard",
  playerId: r.player_id,
  customerRef: r.customer_ref,
  status: r.status as Subscription["status"],
  validUntil: r.valid_until,
  renews: r.renews !== 0,
  updatedAt: r.updated_at,
});

// The later of two ends of a period; null (no end) wins. An event arriving late never moves the period backwards.
const later = (a: number | null, b: number | null) => (a === null || b === null ? null : Math.max(a, b));

function store(d: Kysely<BillingSchema>) {
  return {
    /** A subscription started: one row per reference, however often and in whatever order its events arrive. A row that lapsed (ended,
     * refunded) stays lapsed unless the event brings a later period: a late event never revives a refunded subscription. */
    async upsertStarted(e: {
      providerRef: string;
      playerId: string;
      customerRef: string | null;
      validUntil: number | null;
      tier?: Subscription["tier"];
      renews?: boolean;
    }) {
      const before = await d.selectFrom("subscriptions").selectAll().where("provider_ref", "=", e.providerRef).executeTakeFirst();
      const validUntil = before ? later(before.valid_until, e.validUntil) : e.validUntil;
      const revived = before?.status !== "lapsed" || (e.validUntil !== null && before.valid_until !== null && e.validUntil > before.valid_until);
      const row = {
        player_id: e.playerId,
        customer_ref: e.customerRef ?? before?.customer_ref ?? null,
        status: revived ? "active" : "lapsed",
        tier: e.tier ?? before?.tier ?? "standard",
        valid_until: validUntil,
        renews: e.renews === undefined ? (before?.renews ?? 1) : e.renews ? 1 : 0,
        updated_at: Date.now(),
      };
      await d
        .insertInto("subscriptions")
        .values({ provider_ref: e.providerRef, ...row })
        .onConflict((oc) => oc.column("provider_ref").doUpdateSet(row))
        .execute();
    },
    /** A new end of the paid period (never earlier than the one kept); false for a reference the store doesn't know. */
    async setPeriod(providerRef: string, validUntil: number | null, status?: Subscription["status"], renews?: boolean): Promise<boolean> {
      const before = await d.selectFrom("subscriptions").selectAll().where("provider_ref", "=", providerRef).executeTakeFirst();
      if (!before) return false;
      await d
        .updateTable("subscriptions")
        .set({
          valid_until: later(before.valid_until, validUntil),
          ...(status ? { status } : {}),
          ...(renews === undefined ? {} : { renews: renews ? 1 : 0 }),
          updated_at: Date.now(),
        })
        .where("provider_ref", "=", providerRef)
        .execute();
      return true;
    },
    /** Ends it at once (ended, refunded); false for an unknown reference. */
    async lapse(providerRef: string): Promise<boolean> {
      const r = await d
        .updateTable("subscriptions")
        .set({ status: "lapsed", updated_at: Date.now() })
        .where("provider_ref", "=", providerRef)
        .executeTakeFirst();
      return Number(r.numUpdatedRows) > 0;
    },
    /** The player's subscriptions, newest first. */
    async ofPlayer(playerId: string): Promise<Subscription[]> {
      return (await d.selectFrom("subscriptions").selectAll().where("player_id", "=", playerId).orderBy("updated_at", "desc").execute()).map(view);
    },
    async chosenGame(playerId: string): Promise<string | null> {
      return (await d.selectFrom("active_game").select("game_id").where("player_id", "=", playerId).executeTakeFirst())?.game_id ?? null;
    },
    async chooseGame(playerId: string, gameId: string) {
      const row = { game_id: gameId, chosen_at: Date.now() };
      await d
        .insertInto("active_game")
        .values({ player_id: playerId, ...row })
        .onConflict((oc) => oc.column("player_id").doUpdateSet(row))
        .execute();
    },
    /** What the player used of the instance's AI in `month` (YYYY-MM). */
    async usageOf(playerId: string, month: string): Promise<{ tokens: number; seconds: number }> {
      const r = await d.selectFrom("ai_usage").select(["tokens", "seconds"]).where("player_id", "=", playerId).where("month", "=", month).executeTakeFirst();
      return r ?? { tokens: 0, seconds: 0 };
    },
    /** Counts use of the instance's AI against `month`. */
    async addUsage(playerId: string, month: string, used: { tokens?: number; seconds?: number }) {
      await d
        .insertInto("ai_usage")
        .values({ player_id: playerId, month, tokens: used.tokens ?? 0, seconds: used.seconds ?? 0 })
        .onConflict((oc) =>
          oc.columns(["player_id", "month"]).doUpdateSet((eb) => ({
            tokens: eb("ai_usage.tokens", "+", used.tokens ?? 0),
            seconds: eb("ai_usage.seconds", "+", used.seconds ?? 0),
          })),
        )
        .execute();
    },
    /** Deleting an account: the player's rows go, nobody else's. */
    async forgetPlayer(playerId: string) {
      await d.deleteFrom("ai_usage").where("player_id", "=", playerId).execute();
      await d.deleteFrom("subscriptions").where("player_id", "=", playerId).execute();
      await d.deleteFrom("active_game").where("player_id", "=", playerId).execute();
    },
  };
}

export type BillingStore = ReturnType<typeof store>;

const state = processState("billing", () => ({ db: undefined as Promise<BillingStore> | undefined }));

async function open(file: string): Promise<BillingStore> {
  const d = await connect<BillingSchema>(file);
  const { error } = await new Migrator({ db: d, provider: { getMigrations: async () => migrations } }).migrateToLatest();
  if (error) {
    await d.destroy();
    throw error;
  }
  return store(d);
}

/** The billing store: DATA_DIR/billing.sqlite, opened and migrated on first use. */
export function billing(): Promise<BillingStore> {
  if (!state.db) {
    const p = open(join(config.dataDir(), "billing.sqlite"));
    state.db = p;
    p.catch(() => {
      if (state.db === p) state.db = undefined;
    });
  }
  return state.db;
}

/** Test only: a fresh, in-memory store. */
export async function resetBillingForTests(): Promise<void> {
  state.db = open(":memory:");
  await state.db;
}
