import type { Metadata } from "next";
import { headers } from "next/headers";
import { passkeysOf, profileOf } from "@/backend";
import { Passkeys } from "@/components/Passkeys";
import { Profile } from "@/components/Profile";
import { serverCopy, serverLocale } from "@/components/copy/server";
import { pagePlayer } from "../viewer";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await serverCopy()).account };
}
export const dynamic = "force-dynamic";

// The player's account: their name and address (#61), and their passkeys (ADR 0015), added here while signed in and used on the sign-in
// page.
export default async function AccountPage() {
  await pagePlayer();
  const h = await headers();
  const copy = await serverCopy();
  const date = new Intl.DateTimeFormat(await serverLocale(), { dateStyle: "medium" });
  const profile = (await profileOf(h)) ?? { name: "", email: "" };
  const list = (await passkeysOf(h)).map((p) => ({ id: p.id, name: p.name ?? copy.unnamedPasskey, added: date.format(new Date(p.createdAt)) }));
  return (
    <div className="px-4 pt-6 pb-16 lg:px-8">
      <div className="plate max-w-xl space-y-10">
        <h1 className="text-2xl font-bold">{copy.account}</h1>
        <section aria-labelledby="profile">
          <h2 id="profile" className="text-xl font-bold">
            {copy.profile}
          </h2>
          <Profile name={profile.name} email={profile.email} />
        </section>
        <section aria-labelledby="passkeys">
          <h2 id="passkeys" className="text-xl font-bold">
            {copy.passkeys}
          </h2>
          <p className="mt-2 text-muted">{copy.passkeysLead}</p>
          <Passkeys list={list} />
        </section>
      </div>
    </div>
  );
}
