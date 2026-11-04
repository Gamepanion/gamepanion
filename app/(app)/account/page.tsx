import { CreditCard, Link2, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  ACTIVE_GAME_CHANGE_DAYS,
  accessOf,
  accountExportPath,
  chatWithoutOwnKey,
  nextActiveGameChange,
  switchBackOn,
  keyStatus,
  keyStorageEnabled,
  listPlaythroughs,
  passkeysOf,
  profileOf,
  signInMethods,
  subscriptionOf,
} from "@/backend";
import { ActiveGame } from "@/components/ActiveGame";
import { portalAction } from "../subscribe/actions";
import { Group } from "@/components/icons";
import { AccountNav } from "@/components/AccountNav";
import { KeySection } from "@/components/KeySection";
import { AccountCard, EmailCode } from "@/components/Account";
import { Passkeys } from "@/components/Passkeys";
import { YourData } from "@/components/YourData";
import { serverCopy, serverLocale } from "@/components/copy/server";
import { pagePlayer } from "../viewer";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await serverCopy()).account };
}
export const dynamic = "force-dynamic";

// The player's account: the account card (their name, renamed in place, and address; #61), then every way they sign in:
// email codes (and moving to another address), the providers they linked, their passkeys (ADR 0015); then their own Anthropic key for
// the in-app chat (ADR 0021); last their data: the download, and deleting the account (#106).
export default async function AccountPage() {
  const player = await pagePlayer();
  const key = await keyStatus(player);
  const sub = await subscriptionOf(player);
  const access = sub.sold ? await accessOf(player) : null;
  const games = [...new Map((await listPlaythroughs(player)).map((t) => [t.game.id, { id: t.game.id, title: t.game.title }])).values()];
  const h = await headers();
  const copy = await serverCopy();
  const date = new Intl.DateTimeFormat(await serverLocale(), { dateStyle: "medium" });
  const profile = (await profileOf(h)) ?? { name: "", email: "", linked: [] };
  const methods = signInMethods();
  const list = (await passkeysOf(h)).map((p) => ({ id: p.id, name: p.name ?? copy.unnamedPasskey, added: date.format(new Date(p.createdAt)) }));
  return (
    <div className="px-4 pt-6 pb-16 lg:px-8">
      {/* One column of sections, the account card on top; on a wide screen a table of contents beside it, staying in view. */}
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[11rem_minmax(0,1fr)] lg:items-start">
        <h1 className="sr-only">{copy.account}</h1>
        <div className="hidden lg:sticky lg:top-6 lg:block">
          <AccountNav
            sections={[
              { id: "profile", label: copy.signedInAs },
              { id: "sign-in-ways-section", label: copy.signInWays },
              ...(sub.sold ? [{ id: "subscription", label: copy.subscriptionTitle }] : []),
              { id: "key", label: copy.keyTitle },
              { id: "data", label: copy.dataTitle },
            ]}
          />
        </div>
        <div className="max-w-3xl space-y-8">
          <div id="profile" className="scroll-mt-6">
            <AccountCard name={profile.name} email={profile.email} />
          </div>
          <div className="space-y-8">
            <Group id="sign-in-ways-section" icon={ShieldCheck} label={copy.signInWays}>
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
            </Group>
            {sub.sold && (
              <Group id="subscription" icon={CreditCard} label={copy.subscriptionTitle}>
                <div className="card space-y-4">
                  <p className="font-semibold">
                    {sub.free && !sub.subscribed
                      ? copy.freeAccess
                      : sub.subscribed
                        ? sub.validUntil
                          ? (sub.renews ? copy.renewsOn : copy.cancelledUntil)(date.format(new Date(sub.validUntil)))
                          : copy.subscribed
                        : copy.freePlan}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {!sub.subscribed && !sub.free && (
                      <a href="/subscribe" className="button-primary">
                        {copy.seePlans}
                      </a>
                    )}
                    {sub.portal && (
                      <form action={portalAction}>
                        <button type="submit" className="button-secondary">
                          {copy.managePlan}
                        </button>
                      </form>
                    )}
                  </div>
                  {access?.limited && (
                    <ActiveGame
                      games={games}
                      active={access.activeGameId}
                      nextChange={await nextActiveGameChange(player)}
                      days={ACTIVE_GAME_CHANGE_DAYS}
                      backOn={switchBackOn()}
                    />
                  )}
                </div>
              </Group>
            )}
            <KeySection enabled={keyStorageEnabled()} last4={key?.last4 ?? null} without={await chatWithoutOwnKey(player)} sold={sub.sold} />
            <YourData email={profile.email} mailed={methods.emailCode} exportPath={accountExportPath()} />
          </div>
        </div>
      </div>
    </div>
  );
}
