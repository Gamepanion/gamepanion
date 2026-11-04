"use client";
// The colour scheme in the header (beside the languages): the system's, light or dark, three buttons in a row, the one in use pressed.
// Each is named for screen readers and the tooltip; the icon is only the picture. The choice goes into a cookie for a year and applies
// at once, without a reload.
import { Monitor, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { useCopy } from "./copy/client";
import { applyTheme, THEMES, type Theme } from "./theme";

const ICONS = { system: Monitor, light: Sun, dark: Moon } as const;

export function ThemeSwitch({ initial }: { initial: Theme }) {
  const copy = useCopy();
  const [theme, setTheme] = useState<Theme>(initial);
  function choose(t: Theme) {
    setTheme(t);
    applyTheme(t);
  }
  return (
    <div role="group" aria-label={copy.theme} className="theme-switch">
      {THEMES.map((t) => {
        const Icon = ICONS[t];
        return (
          <button key={t} type="button" aria-label={copy.themes[t]} title={copy.themes[t]} aria-pressed={theme === t} onClick={() => choose(t)}>
            <Icon aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
