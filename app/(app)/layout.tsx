import { UserRound } from "lucide-react";
import Link from "next/link";
import { chatEnabled, listPlaythroughs, voiceEnabled } from "@/backend";
import { Follow } from "@/components/Follow";
import { ChatProvider } from "@/components/chat/Chat";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { SignOutButton } from "@/components/SignOutButton";
import { Switcher } from "@/components/Switcher";
import { Wordmark } from "@/components/Wordmark";
import { serverCopy } from "@/components/copy/server";
import { pagePlayer } from "./viewer";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const copy = await serverCopy();
  const player = await pagePlayer();
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
    // elsewhere (ADR 0019); on a phone it takes a row of its own under the logo.
    <div className="column mx-auto flex h-dvh max-w-2xl flex-col lg:max-w-6xl">
      <header className="glass z-20 flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-rule px-4 py-3 lg:px-8">
        <Link href="/" aria-label={copy.appName}>
          <Wordmark />
        </Link>
        <div className="order-last w-full min-w-0 sm:order-none sm:w-auto sm:flex-1">
          <Switcher runs={runs} />
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitch />
          <Link href="/account" className="flex items-center gap-1 text-sm text-muted hover:text-accent">
            <UserRound aria-hidden="true" className="size-4" />
            {copy.account}
          </Link>
          <SignOutButton />
        </div>
      </header>
      <ChatProvider enabled={chatEnabled()} voice={voiceEnabled()} playerId={player.id}>
        <Follow>{children}</Follow>
      </ChatProvider>
    </div>
  );
}
