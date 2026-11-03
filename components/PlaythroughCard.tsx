// A playthrough's card (the home page's list; #77 the sign-in page's example): where the player is, from plain view data, so the sign-in
// page can show one without a player or a database. With `href` the whole card is a link; without, nothing on it is interactive.
import { Backpack, BookOpen, CalendarDays, Crosshair, Footprints, ScrollText } from "lucide-react";
import Link from "next/link";
import type { Copy } from "./copy";
import { GameTile } from "./GameTile";

export type PlaythroughCardData = {
  /** The game's title, shown with its tile when the card stands outside its game's section (the example). */
  game?: string;
  label: string;
  status: string;
  characterClass: string | null;
  last: { playedOn: string; summary: string } | null;
  next: { name: string; text: string | null; blocked: boolean } | null;
  moreOpen: number;
  goals: { id: string; name: string; current: number; target: number }[];
  counts: { quests: number; items: number; codex: number };
};

export function PlaythroughCard({ data: d, copy, href }: { data: PlaythroughCardData; copy: Copy; href?: string }) {
  const playing = d.status === "playing";
  const counts = [
    { icon: ScrollText, text: copy.questCount(d.counts.quests) },
    { icon: Backpack, text: copy.itemCount(d.counts.items) },
    { icon: BookOpen, text: copy.codexCount(d.counts.codex) },
  ];
  const body = (
    <>
      {d.game && (
        <span className="mb-3 flex items-center gap-3">
          <GameTile title={d.game} />
          <span className="text-xl font-bold">{d.game}</span>
        </span>
      )}
      <span className="block font-semibold">
        {d.label} · {copy.status[d.status]}
        {d.characterClass && <span className="font-normal text-muted"> · {d.characterClass}</span>}
      </span>
      <span className="run-line mt-3">
        <CalendarDays aria-hidden="true" />
        {d.last ? (
          <span>
            <span className="text-sm text-muted tabular-nums">{copy.lastPlayed(d.last.playedOn)}</span>
            <span className="block">{d.last.summary}</span>
          </span>
        ) : (
          <span className="text-sm text-muted">{copy.notPlayedYet}</span>
        )}
      </span>
      {playing && d.next && (
        <span className="run-line run-next mt-3">
          <Footprints aria-hidden="true" />
          <span>
            <span className="block text-sm font-semibold">{d.next.name}</span>
            <span className="block text-sm">{d.next.blocked ? copy.waitingOnGame : d.next.text}</span>
            {d.moreOpen > 0 && <span className="block text-sm text-muted">{copy.moreOpen(d.moreOpen)}</span>}
          </span>
        </span>
      )}
      {playing && d.goals.length > 0 && (
        <span className="run-line mt-3">
          <Crosshair aria-hidden="true" />
          <span className={`grid flex-1 gap-3 ${d.goals.length > 1 ? "sm:grid-cols-2" : ""}`}>
            {d.goals.map((goal) => (
              <span key={goal.id} className="block">
                <span className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-semibold">{goal.name}</span>
                  <span className="text-muted tabular-nums">{copy.goalProgress(goal.current, goal.target)}</span>
                </span>
                <span className="goal-track mt-1 block" role="presentation">
                  <span className="goal-fill block" style={{ width: `${Math.min(1, goal.current / goal.target) * 100}%` }} />
                </span>
              </span>
            ))}
          </span>
        </span>
      )}
      <span className="mt-3 block border-t border-dotted border-rule pt-2 text-sm text-muted">
        <span className="flex flex-wrap gap-x-5 gap-y-1">
          {counts.map(({ icon: Icon, text }) => (
            <span key={text} className="inline-flex items-center gap-1.5">
              <Icon aria-hidden="true" className="h-4 w-4" />
              {text}
            </span>
          ))}
        </span>
      </span>
    </>
  );
  const cls = `card block ${playing ? "" : "run-card-closed"}`;
  return href ? (
    <Link href={href} className={`run-card ${cls}`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
