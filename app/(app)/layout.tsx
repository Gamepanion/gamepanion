import { UserRound } from "lucide-react";
import Link from "next/link";
import { chatEnabled, voiceEnabled } from "@/backend";
import { Follow } from "@/components/Follow";
import { ChatProvider } from "@/components/chat/Chat";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { SignOutButton } from "@/components/SignOutButton";
import { Wordmark } from "@/components/Wordmark";
import { serverCopy } from "@/components/copy/server";
import { pagePlayer } from "./viewer";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const copy = await serverCopy();
  const player = await pagePlayer();
  return (
    // The window doesn't scroll: the header stays, and what is under it scrolls on its own (each page of a playthrough, or a session).
    <div className="column mx-auto flex h-dvh max-w-2xl flex-col lg:max-w-6xl">
      <header className="glass z-10 flex shrink-0 items-center justify-between border-b border-rule px-4 py-3 lg:px-8">
        <Link href="/" aria-label={copy.appName}>
          <Wordmark />
        </Link>
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
