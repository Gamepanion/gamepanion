import { Link2, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { passkeysOf, profileOf, signInMethods } from "@/backend";
import { AccountCard, EmailCode } from "@/components/Account";
import { Passkeys } from "@/components/Passkeys";
import { serverCopy, serverLocale } from "@/components/copy/server";
import { pagePlayer } from "../viewer";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await serverCopy()).account };
}
export const dynamic = "force-dynamic";

// The player's account: the account card (their name, renamed in place, and address; #61), then every way they sign in:
// email codes (and moving to another address), the providers they linked, their passkeys (ADR 0015).
export default async function AccountPage() {
  await pagePlayer();
  const h = await headers();
  const copy = await serverCopy();
  const date = new Intl.DateTimeFormat(await serverLocale(), { dateStyle: "medium" });
  const profile = (await profileOf(h)) ?? { name: "", email: "", linked: [] };
  const methods = signInMethods();
  const list = (await passkeysOf(h)).map((p) => ({ id: p.id, name: p.name ?? copy.unnamedPasskey, added: date.format(new Date(p.createdAt)) }));
  return (
    <div className="px-4 pt-6 pb-16 lg:px-8">
      {/* Two columns on a wide screen: the account card on the left, staying in view; how they sign in on the right. One column on a
          phone. */}
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
        <h1 className="sr-only">{copy.account}</h1>
        <div className="lg:sticky lg:top-6">
          <AccountCard name={profile.name} email={profile.email} />
        </div>
        <section aria-labelledby="sign-in-ways">
          <h2 id="sign-in-ways" className="section-title">
            <span className="seal">
              <ShieldCheck aria-hidden="true" />
            </span>
            {copy.signInWays}
          </h2>
          <ul className="card divide-y divide-rule p-0">
            {methods.emailCode && <EmailCode email={profile.email} />}
            {profile.linked.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                <span className="seal">
                  <Link2 aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{p.label}</p>
                  <p className="text-sm text-muted">{copy.linkedProvider}</p>
                </div>
              </li>
            ))}
            <Passkeys list={list} />
          </ul>
        </section>
      </div>
    </div>
  );
}
