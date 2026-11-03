"use client";
// The game a free player keeps active (#48), on the account page: a select of their games and a button; the others stay readable.
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { chooseActiveGameAction } from "@/app/(app)/subscribe/actions";
import { useCopy } from "./copy/client";

export function ActiveGame({ games, active }: { games: { id: string; title: string }[]; active: string | null }) {
  const copy = useCopy();
  const router = useRouter();
  const id = useId();
  const [value, setValue] = useState(active ?? games[0]?.id ?? "");
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          await chooseActiveGameAction(value);
          router.refresh();
        });
      }}
    >
      <label htmlFor={id} className="block text-sm font-semibold">
        {copy.activeGame}
      </label>
      <p className="text-sm text-muted">{copy.activeGameHint}</p>
      <div className="flex flex-wrap gap-3">
        <select id={id} className="field w-auto" value={value} onChange={(e) => setValue(e.target.value)}>
          {games.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
        <button type="submit" className="button-secondary" disabled={pending || value === active}>
          {copy.makeActive}
        </button>
      </div>
    </form>
  );
}
