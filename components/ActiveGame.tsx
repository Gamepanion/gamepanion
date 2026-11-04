"use client";
// The game a free player keeps active (#48), on the account page. The rule is said up front, not in fine print: one active game, and it
// can change once every 30 days. The active game is shown large; while the next change isn't due, the date it is and no way to change;
// when it is, a choice of the other games, and a confirmation that says until when there is no switching back.
import { Gamepad2, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { chooseActiveGameAction } from "@/app/(app)/subscribe/actions";
import { useCopy, useLocale } from "./copy/client";

export function ActiveGame({
  games,
  active,
  nextChange,
  days,
}: {
  games: { id: string; title: string }[];
  active: string | null;
  /** When the next change is possible (ms); null: now. */
  nextChange: number | null;
  days: number;
}) {
  const copy = useCopy();
  const locale = useLocale();
  const router = useRouter();
  const id = useId();
  const others = games.filter((g) => g.id !== active);
  const [value, setValue] = useState(others[0]?.id ?? "");
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const date = (ms: number) => new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(ms));
  const current = games.find((g) => g.id === active)?.title;
  const backOn = date(Date.now() + days * 86_400_000);
  return (
    <div className="space-y-3 rounded-md border border-accent p-4">
      <p className="eyebrow text-muted">{copy.activeGame}</p>
      <p className="flex items-center gap-2 text-xl font-bold">
        <Gamepad2 aria-hidden="true" className="size-5 text-accent" />
        {current ?? copy.noActiveGame}
      </p>
      <p className="text-sm">{copy.activeGameRule(days)}</p>
      {nextChange !== null ? (
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Lock aria-hidden="true" className="size-4" />
          {copy.activeGameNext(date(nextChange))}
        </p>
      ) : others.length > 0 ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!confirming) return setConfirming(true);
            start(async () => {
              await chooseActiveGameAction(value);
              setConfirming(false);
              router.refresh();
            });
          }}
        >
          <label htmlFor={id} className="block text-sm font-semibold">
            {copy.switchTo}
          </label>
          <div className="flex flex-wrap gap-3">
            <select
              id={id}
              className="field w-auto"
              value={value}
              disabled={confirming}
              onChange={(e) => {
                setValue(e.target.value);
                setConfirming(false);
              }}
            >
              {others.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
            {!confirming && (
              <button type="submit" className="button-secondary">
                {copy.makeActive}
              </button>
            )}
          </div>
          {confirming && (
            <div role="alert" className="space-y-3 rounded-md bg-surface p-3">
              <p className="text-sm font-semibold">{copy.switchConfirm(others.find((g) => g.id === value)?.title ?? "", backOn)}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="button-secondary" onClick={() => setConfirming(false)}>
                  {copy.cancel}
                </button>
                <button type="submit" className="button-primary" disabled={pending}>
                  {copy.switchNow}
                </button>
              </div>
            </div>
          )}
        </form>
      ) : null}
    </div>
  );
}
