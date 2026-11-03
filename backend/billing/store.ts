// The billing store (#48, ADR 0023): who subscribes, in a SQLite file of its own (DATA_DIR/billing.sqlite), apart from what players
// filed: one row per subscription (status, the provider's reference, until when it is paid), and the game a limited player chose to keep
// active. Checked locally on every filing, so a slow or absent provider never stops a subscriber.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { join } from "node:path";
import type { Kysely } from "kysely";
import { Migrator, type Migration } from "kysely/migration";
import { config } from "../config";
import { connect } from "../db/connect";
import { processState } from "../state";

export type Subscription = {
  providerRef: string;
  playerId: string;
  customerRef: string | null;
  status: "active" | "lapsed";
  validUntil: number | null;
  updatedAt: number;
};

interface BillingSchema {
  subscriptions: { provider_ref: string; player_id: string; customer_ref: string | null; status: string; valid_until: number | null; updated_at: number };
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
};

const view = (r: BillingSchema["subscriptions"]): Subscription => ({
  providerRef: r.provider_ref,
  playerId: r.player_id,
  customerRef: r.customer_ref,
  status: r.status as Subscription["status"],
  validUntil: r.valid_until,
  updatedAt: r.updated_at,
});

// The later of two ends of a period; null (no end) wins. An event arriving late never moves the period backwards.
const later = (a: number | null, b: number | null) => (a === null || b === null ? null : Math.max(a, b));

function store(d: Kysely<BillingSchema>) {
  return {
    /** A subscription started: one row per reference, however often the event arrives. */
    async upsertStarted(e: { providerRef: string; playerId: string; customerRef: string | null; validUntil: number | null }) {
      const before = await d.selectFrom("subscriptions").selectAll().where("provider_ref", "=", e.providerRef).executeTakeFirst();
      const row = {
        player_id: e.playerId,
        customer_ref: e.customerRef ?? before?.customer_ref ?? null,
        status: "active",
        valid_until: before ? later(before.valid_until, e.validUntil) : e.validUntil,
        updated_at: Date.now(),
      };
      await d
        .insertInto("subscriptions")
        .values({ provider_ref: e.providerRef, ...row })
        .onConflict((oc) => oc.column("provider_ref").doUpdateSet(row))
        .execute();
    },
    /** A new end of the paid period (never earlier than the one kept); false for a reference the store doesn't know. */
    async setPeriod(providerRef: string, validUntil: number | null, status?: Subscription["status"]): Promise<boolean> {
      const before = await d.selectFrom("subscriptions").selectAll().where("provider_ref", "=", providerRef).executeTakeFirst();
      if (!before) return false;
      await d
        .updateTable("subscriptions")
        .set({ valid_until: later(before.valid_until, validUntil), ...(status ? { status } : {}), updated_at: Date.now() })
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
    /** Deleting an account: the player's rows go, nobody else's. */
    async forgetPlayer(playerId: string) {
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
