// Sends the codes, with a link when there may be one, through GAMEPANION_SMTP_URL. Logs neither the address nor the code.
import { config } from "../config";
import { logger } from "../log";
import { mailCopy } from "./copy";

const log = logger("mail");

/** What a code is for: signing in, or confirming the new address of an email change (the account page). */
export type CodePurpose = "sign-in" | "change-email";
export type Mailer = (to: string, code: string, opts: { purpose: CodePurpose; link?: string }) => Promise<void>;

// An SMTP server that never answers (a blocked port) fails the request within these, logged, instead of hanging the sign-in.
const TIMEOUTS = { connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000 };

let override: Mailer | undefined;

/** Test only: where codes go instead of SMTP; undefined puts SMTP back. */
export const setMailerForTests = (m: Mailer | undefined): void => {
  override = m;
};

export async function sendCode(to: string, code: string, opts: { purpose: CodePurpose; link?: string }): Promise<void> {
  if (override) return override(to, code, opts);
  const smtp = config.smtp();
  if (!smtp) throw new Error("email codes need GAMEPANION_SMTP_URL");
  const mail =
    opts.purpose === "change-email"
      ? { subject: mailCopy.changeSubject(code), text: mailCopy.changeText(code) }
      : { subject: mailCopy.codeSubject(code), text: mailCopy.codeText(code, opts.link) };
  try {
    const { createTransport } = await import("nodemailer");
    await createTransport({ url: smtp.url, ...TIMEOUTS }).sendMail({ from: smtp.from, to, ...mail });
  } catch (e) {
    // The error may name the address: only its code is logged.
    log.error({ code: (e as NodeJS.ErrnoException).code ?? "unknown", purpose: opts.purpose }, "sending a code failed");
    throw e;
  }
}
