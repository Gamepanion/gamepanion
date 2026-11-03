// Signs the demo player in without a mail server and prints the session cookie, for looking at the app in a browser (scripts/demo.sh).
// The first run also files two playthroughs for them, so the pages have something on them. Runs against the demo's DATA_DIR, next to
// the dev server; never point it at real data.
import { auth } from "../backend/auth/auth";
import { setMailerForTests } from "../backend/auth/mail";
import { listPlaythroughs } from "../backend/games";
import { record } from "../backend/record";

const email = process.env.GAMEPANION_SIGNUP_ALLOW ?? "demo@example.com";
const origin = process.env.PUBLIC_URL ?? "http://localhost:3123";

// The code goes here instead of to SMTP; the dev server never sends one.
let code = "";
setMailerForTests(async (_to, c) => {
  code = c;
});

const a = await auth();
await a.api.sendVerificationOTP({ body: { email, type: "sign-in" } });
const { headers, response } = await a.api.signInEmailOTP({ body: { email, otp: code }, returnHeaders: true });
const cookie = (headers.get("set-cookie") ?? "").split(";")[0];
const [name, value] = [cookie.slice(0, cookie.indexOf("=")), cookie.slice(cookie.indexOf("=") + 1)];

const player = { id: response.user.id };
if ((await listPlaythroughs(player)).length === 0) {
  await record(player, {
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
  } as Parameters<typeof record>[1]);
  await record(player, {
    game: "Elden Ring",
    platform: "PC",
    language: "en",
    playedOn: "2026-10-22",
    summary: "Met Ranni.",
    transcript: "Met Ranni at the rise, she offered me a deal. Picked up the Moonveil.",
    quests: [{ name: "Ranni's Deal", giver: "Ranni", entries: [{ kind: "next", text: "Think about Ranni's offer" }] }],
  } as Parameters<typeof record>[1]);
}

const { hostname } = new URL(origin);
console.log(`Signed in ${email}. In Playwright: await page.context().addCookies([${JSON.stringify({ name, value, domain: hostname, path: "/" })}])`);
console.log(`With curl: -H 'cookie: ${cookie}'`);
