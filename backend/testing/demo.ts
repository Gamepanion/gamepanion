// The demo player's play sessions (npm run demo, scripts/demo.sh): two playthroughs with quests in every state, a build plan, items with
// tags and a note, codex entries of three kinds and two sessions, so every page and tab of the web app has something on it. Example
// content, filed through the real write path; demo.test.ts keeps it valid as the schemas change.
import type { record } from "../record";

export const DEMO_EMAIL = "demo@example.com";

export const DEMO_SESSIONS: Parameters<typeof record>[1][] = [
  {
    game: "Lies of P",
    platform: "Switch 2",
    language: "en",
    playedOn: "2026-10-20",
    summary: "Met Venigni and Antonia.",
    transcript: "Talked to Venigni at the factory, he wants me to find his workers. Antonia asked me for a record. Stats: vitality 10, motivity 12.",
    quests: [
      {
        name: "Venigni's Workers",
        giver: "Venigni",
        location: "Venigni Works",
        entries: [
          { kind: "log", text: "Venigni wants his workers found" },
          { kind: "next", text: "Look for the workers" },
        ],
      },
      { name: "Antonia's Record", giver: "Antonia", entries: [{ kind: "next", text: "Bring Antonia a record" }] },
      { name: "Polendina", entries: [{ kind: "log", text: "Polendina asked for ergo" }] },
    ],
    stats: {
      level: 5,
      values: { vitality: 10, motivity: 12 },
      names: [
        { key: "vitality", name: "Vitality" },
        { key: "motivity", name: "Motivity" },
      ],
    },
    build: { summary: "Motivity build", mainStat: "motivity", targets: { motivity: 40 } },
  },
  {
    game: "Lies of P",
    platform: "Switch 2",
    language: "en",
    playedOn: "2026-10-21",
    summary: "Polendina is done; picked up the Puppet Saber and beat the Parade Master.",
    transcript: "Gave Polendina the ergo, that's done. Equipped the Puppet Saber. Beat the Parade Master with fire. Eugenie needs a better workshop first.",
    quests: [
      { name: "Polendina", status: "done", entries: [{ kind: "log", text: "Gave Polendina the ergo" }] },
      { name: "Eugenie's Workshop", giver: "Eugenie", status: "blocked", entries: [{ kind: "next", text: "Wait until the workshop is upgraded" }] },
    ],
    items: [
      { name: "Puppet Saber", kind: "weapon", equipped: true, verdict: "Fits the motivity build", tags: ["motivity"] },
      { name: "Fire Abrasive", kind: "consumable", verdict: "Good against the Parade Master", tags: ["fire"], notes: "Keep three for bosses" },
      { name: "Amulet of Courage", kind: "amulet", verdict: "Not yet: costs more than you have" },
    ],
    codex: [
      { kind: "boss", name: "Parade Master", description: "A towering puppet in the Krat streets", tags: ["fire"] },
      { kind: "npc", name: "Venigni", description: "Runs the Venigni Works and wants his workers back" },
      { kind: "place", name: "Krat Central Station", description: "Where the night began" },
    ],
  },
  {
    game: "Elden Ring",
    platform: "PC",
    language: "en",
    playedOn: "2026-10-22",
    summary: "Met Ranni.",
    transcript: "Met Ranni at the rise, she offered me a deal. Picked up the Moonveil.",
    quests: [{ name: "Ranni's Deal", giver: "Ranni", entries: [{ kind: "next", text: "Think about Ranni's offer" }] }],
  },
];
