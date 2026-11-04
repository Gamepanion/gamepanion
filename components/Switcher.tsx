"use client";
// The playthrough switcher in the header (ADR 0019): it says where you are (a playthrough's game and label, or "Your games" on the home
// page) and opens a menu to go somewhere else: Home first, then the playthroughs grouped by game, the most recently played first, and
// the finished or dropped ones folded away in a "Finished" group at the bottom. A menu button as in the ARIA practices: arrow keys move,
// Enter opens, Escape closes and puts the focus back on the button.
import { Check, ChevronDown, House } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { GameTile } from "./GameTile";
import { useCopy } from "./copy/client";

export type SwitcherRun = { id: string; href: string; gameId: string; game: string; label: string; status: string };

/** The playthrough an address is about: /p/<id> and every tab under it. */
const runOf = (path: string) => /^\/p\/([^/]+)/.exec(path)?.[1] ?? null;

export function Switcher({ runs }: { runs: SwitcherRun[] }) {
  const copy = useCopy();
  const path = usePathname();
  const id = useId();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const here = runs.find((r) => r.id === runOf(path)) ?? null;
  // The Finished group starts unfolded when you are on one of its playthroughs.
  const [finishedOpen, setFinishedOpen] = useState(here !== null && here.status !== "playing");

  // A click outside closes it.
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!menu.current?.contains(e.target as Node) && !button.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  const items = () => [...(menu.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
  const focusAt = (i: number) => {
    const all = items();
    all[(i + all.length) % all.length]?.focus();
  };

  // Opening puts the focus on the entry for where you are, else on Home.
  useEffect(() => {
    if (!open) return;
    const all = items();
    (all.find((el) => el.getAttribute("aria-current") === "page") ?? all[0])?.focus();
  }, [open]);

  const close = () => {
    setOpen(false);
    button.current?.focus();
  };

  const onButtonKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
    }
  };

  const onMenuKey = (e: KeyboardEvent) => {
    const all = items();
    const at = all.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") focusAt(at + 1);
    else if (e.key === "ArrowUp") focusAt(at - 1);
    else if (e.key === "Home") focusAt(0);
    else if (e.key === "End") focusAt(all.length - 1);
    else if (e.key === "Escape") close();
    else if (e.key === "Tab") return setOpen(false);
    else return;
    e.preventDefault();
  };

  const playing = runs.filter((r) => r.status === "playing");
  const finished = runs.filter((r) => r.status !== "playing");
  // Games in the order of their latest playthrough; each game's playthroughs latest first.
  const byGame = (list: SwitcherRun[]) =>
    [...new Map(list.map((r) => [r.gameId, r.game])).entries()].map(([g, title]) => ({ id: g, title, runs: list.filter((r) => r.gameId === g) }));

  const entry = (r: SwitcherRun) => (
    <Link key={r.id} href={r.href} role="menuitem" tabIndex={-1} aria-current={r.id === here?.id ? "page" : undefined} className="switcher-item">
      <span className="flex-1 truncate">{r.label}</span>
      {r.status !== "playing" && <span className="text-sm text-muted">{copy.status[r.status]}</span>}
      {r.id === here?.id && <Check aria-hidden="true" className="size-4 text-accent" />}
    </Link>
  );

  const groups = (list: SwitcherRun[]) =>
    byGame(list).map((g) => (
      <div key={g.id} role="group" aria-labelledby={`${id}-${g.id}`}>
        <div id={`${id}-${g.id}`} className="switcher-game" role="presentation">
          <GameTile title={g.title} size="sm" />
          <span className="truncate">{g.title}</span>
        </div>
        {g.runs.map(entry)}
      </div>
    ));

  return (
    <div className="relative min-w-0">
      <button
        ref={button}
        type="button"
        className="switcher-button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onButtonKey}
      >
        {here ? (
          <span>
            <GameTile title={here.game} size="sm" />
          </span>
        ) : (
          <House aria-hidden="true" className="size-5 shrink-0 text-muted" />
        )}
        <span className="truncate">
          <span className="sr-only">{copy.switcherWhere}: </span>
          {here ? `${here.game} · ${here.label}` : copy.contents}
        </span>
        <ChevronDown aria-hidden="true" className={`size-4 shrink-0 self-center text-muted ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          ref={menu}
          id={`${id}-menu`}
          role="menu"
          aria-label={copy.switcherMenu}
          className="switcher-menu"
          onKeyDown={onMenuKey}
          onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}
        >
          <Link href="/" role="menuitem" tabIndex={-1} aria-current={path === "/" ? "page" : undefined} className="switcher-item">
            <House aria-hidden="true" className="size-4 text-muted" />
            <span className="flex-1">{copy.home}</span>
            {path === "/" && <Check aria-hidden="true" className="size-4 text-accent" />}
          </Link>
          {groups(playing)}
          {finished.length > 0 && (
            <>
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                aria-expanded={finishedOpen}
                className="switcher-item switcher-fold"
                onClick={() => setFinishedOpen((f) => !f)}
              >
                <ChevronDown aria-hidden="true" className={`size-4 text-muted ${finishedOpen ? "" : "-rotate-90"}`} />
                <span className="flex-1">{copy.finishedGroup(finished.length)}</span>
              </button>
              {finishedOpen && groups(finished)}
            </>
          )}
        </div>
      )}
    </div>
  );
}
