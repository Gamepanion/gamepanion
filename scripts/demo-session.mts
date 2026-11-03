// Signs the demo player in without a mail server and prints the session cookie, for looking at the app in a browser (scripts/demo.sh).
// Files the demo sessions (backend/testing/demo.ts) for them; scripts/demo.sh starts from an empty DATA_DIR each time, so the demo is
// always the same. Never point it at real data.
import { auth } from "../backend/auth/auth";
import { setMailerForTests } from "../backend/auth/mail";
import { listPlaythroughs } from "../backend/games";
import { record } from "../backend/record";
import { DEMO_EMAIL, DEMO_SESSIONS } from "../backend/testing/demo";

const email = process.env.GAMEPANION_SIGNUP_ALLOW ?? DEMO_EMAIL;
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

// Filed once: on a normal start DATA_DIR is empty; with DEMO_KEEP=1 the player already has them.
const player = { id: response.user.id };
if ((await listPlaythroughs(player)).length === 0) for (const session of DEMO_SESSIONS) await record(player, session);

const { hostname } = new URL(origin);
console.log(`Signed in ${email}. In Playwright: await page.context().addCookies([${JSON.stringify({ name, value, domain: hostname, path: "/" })}])`);
console.log(`With curl: -H 'cookie: ${cookie}'`);
