"use client";
// A playthrough's two settings (ADR 0016), on its page: how much Claude adds on its own, and what shows without asking. Each is a row of
// levels; picking one saves it at once and the page renders again at the new level.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveSettings } from "@/app/(app)/actions";
import type { BackgroundLevel, SpoilerLevel } from "@/backend";
import { useCopy } from "./copy/client";

type Settings = { background: BackgroundLevel; spoilers: SpoilerLevel };

export function PlaythroughSettings({ playthroughId, settings }: { playthroughId: string; settings: Settings }) {
  const copy = useCopy();
  const router = useRouter();
  const [now, setNow] = useState(settings);
  const [pending, start] = useTransition();

  function pick(change: Partial<Settings>) {
    setNow({ ...now, ...change });
    start(async () => {
      await saveSettings(playthroughId, change);
      router.refresh();
    });
  }

  return (
    <div className="settings" aria-busy={pending}>
      <Dial
        label={copy.backgroundSetting}
        hint={copy.backgroundSettingHint}
        levels={["none", "light", "useful", "everything"] as const}
        names={copy.backgroundLevel}
        value={now.background}
        onPick={(background) => pick({ background })}
      />
      <Dial
        label={copy.spoilerSetting}
        hint={copy.spoilerSettingHint}
        levels={["none", "hint", "full"] as const}
        names={copy.spoilerLevel}
        value={now.spoilers}
        onPick={(spoilers) => pick({ spoilers })}
      />
    </div>
  );
}

function Dial<L extends string>({
  label,
  hint,
  levels,
  names,
  value,
  onPick,
}: {
  label: string;
  hint: string;
  levels: readonly L[];
  names: Record<L, string>;
  value: L;
  onPick: (l: L) => void;
}) {
  return (
    <fieldset className="dial">
      <legend>
        <span className="dial-label">{label}</span>
        <span className="dial-hint">{hint}</span>
      </legend>
      <div className="dial-levels">
        {levels.map((l) => (
          <label key={l}>
            <input type="radio" name={label} value={l} checked={value === l} onChange={() => onPick(l)} />
            <span>{names[l]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
