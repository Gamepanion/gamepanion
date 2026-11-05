import { Bug, UserRound } from "lucide-react";
import Link from "next/link";
import { chatEnabled, chatNeedsKey, listPlaythroughs, reportUrl, voiceEnabled } from "@/backend";
import { Follow } from "@/components/Follow";
import { Footer } from "@/components/Footer";
import { ChatProvider } from "@/components/chat/Chat";
import { LanguageMenu } from "@/components/LanguageMenu";
import { ThemeMenu } from "@/components/ThemeMenu";
import { PhoneMenu } from "@/components/PhoneMenu";
import { pickTheme, THEME_COOKIE } from "@/components/theme";
import { cookies } from "next/headers";
import { SignOutButton } from "@/components/SignOutButton";
import { Switcher } from "@/components/Switcher";
import { Wordmark } from "@/components/Wordmark";
import { serverCopy } from "@/components/copy/server";
import { pagePlayer } from "./viewer";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const copy = await serverCopy();
  const player = await pagePlayer();
  const theme = pickTheme((await cookies()).get(THEME_COOKIE)?.value);
  const runs = (await listPlaythroughs(player)).map((t) => ({
    id: t.id,
    href: t.url,
    gameId: t.game.id,
    game: t.game.title,
    label: t.label,
    status: t.status,
  }));
  return (
    // The window doesn't scroll: the header stays, and what is under it scrolls on its own. The switcher says where you are and goes
    // elsewhere (ADR 0019); on a phone it takes a row of its own under the logo. From sm up every text in the row shares one baseline, and
    // every icon is centred on the lowercase letters beside it (.icon-middle).
    <div className="column mx-auto flex h-dvh max-w-2xl flex-col lg:max-w-6xl">
      <header className="glass z-20 flex shrink-0 flex-wrap items-center justify-between sm:items-baseline gap-x-4 gap-y-2 border-b border-rule px-4 py-3 sm:py-2 lg:px-8">
        <Link href="/" aria-label={copy.appName}>
          <Wordmark />
        </Link>
        <div className="order-last w-full min-w-0 sm:order-none sm:w-auto sm:flex-1">
          <Switcher runs={runs} />
        </div>
        {/* Reporting a problem (a new GitHub issue; its label from lg up, the icon alone before), the language and the colour scheme, a
            menu each, a hairline, then the account and signing out as two quiet buttons of the switcher's height. On a phone all of it
            behind one menu button (PhoneMenu), beside the logo. */}
        <div className="hidden items-baseline gap-1 sm:flex">
          <a href={reportUrl()} className="header-link" title={copy.reportProblem}>
            <Bug aria-hidden="true" className="icon-middle" />
            <span className="sr-only lg:not-sr-only">{copy.reportProblem}</span>
          </a>
          <LanguageMenu />
          <ThemeMenu theme={theme} />
          <span aria-hidden="true" className="mx-2 h-6 self-center border-l border-rule" />
          <Link href="/account" className="header-link">
            <UserRound aria-hidden="true" className="icon-middle" />
            {copy.account}
          </Link>
          <SignOutButton />
        </div>
        <PhoneMenu theme={theme} reportHref={reportUrl()} />
      </header>
      <ChatProvider
        enabled={await chatEnabled(player)}
        voice={await voiceEnabled(player)}
        playerId={player.id}
        runs={Object.fromEntries(runs.map((r) => [r.id, `${r.game} · ${r.label}`]))}
        homeRun={runs.find((r) => r.status === "playing")?.id ?? null}
        needsKey={await chatNeedsKey(player)}
      >
        <Follow>
          {/* At least the height of the scrolling area, so the footer sits at its bottom on a short page. */}
          <div className="flex min-h-full flex-col">
            {children}
            <Footer />
          </div>
        </Follow>
      </ChatProvider>
    </div>
  );
}
