"use client";
// The colour scheme, in the header: a button showing the scheme in use as three swatches, and a menu of the schemes, each a small tile
// drawn in its own colours (data-scheme: globals.css declares the colours again under it, from the same list, so none is written twice) with its name: System
// shows its light and its dark half. Picking one applies at once and goes into a cookie for a year (components/theme.ts).
import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { useCopy } from "./copy/client";
import { applyTheme, currentTheme, THEMES, type Theme } from "./theme";
import { usePopover } from "./usePopover";

/** Three swatches of a scheme: its ground, its accent and its text; without `scheme`, the page's as it shows now. */
function Swatches({ scheme }: { scheme?: "light" | "dark" }) {
  return (
    <span className="swatches" data-scheme={scheme}>
      <span className="bg-paper" />
      <span className="bg-accent" />
      <span className="bg-ink" />
    </span>
  );
}

function Preview({ theme }: { theme: Theme }) {
  return theme === "system" ? (
    <span className="theme-tile">
      <span className="theme-half" data-scheme="light">
        <Swatches scheme="light" />
      </span>
      <span className="theme-half" data-scheme="dark">
        <Swatches scheme="dark" />
      </span>
    </span>
  ) : (
    <span className="theme-tile">
      <span className="theme-half" data-scheme={theme}>
        <Swatches scheme={theme} />
      </span>
    </span>
  );
}

/** The schemes as radio choices, each a tile in its own colours and its name; picking one applies it at once. Used by the header's
 * colour scheme menu and by the phone's menu. */
export function ThemeChoices({ name, theme, onPick, legend = false }: { name: string; theme: Theme; onPick: (t: Theme) => void; legend?: boolean }) {
  const copy = useCopy();
  return (
    <fieldset>
      <legend className={legend ? "header-menu-legend" : "sr-only"}>{copy.theme}</legend>
      {THEMES.map((t) => (
        <label key={t} className="header-menu-item">
          <input
            type="radio"
            name={name}
            className="sr-only"
            checked={t === theme}
            onChange={() => {
              onPick(t);
              applyTheme(t);
            }}
          />
          <Preview theme={t} />
          {copy.themes[t]}
        </label>
      ))}
    </fieldset>
  );
}

export function ThemeMenu({ theme: initial }: { theme: Theme }) {
  const copy = useCopy();
  const id = useId();
  const [theme, setTheme] = useState<Theme>(initial);
  const { open, toggle, button, panel } = usePopover();
  const label = `${copy.theme}: ${copy.themes[theme]}`;
  return (
    <div className="relative">
      <button
        ref={button}
        type="button"
        className="header-link"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        title={label}
        onClick={() => {
          setTheme(currentTheme());
          toggle();
        }}
      >
        <Swatches />
        <ChevronDown aria-hidden="true" />
      </button>
      {open && (
        <div ref={panel} id={id} className="header-menu">
          <ThemeChoices name={id} theme={theme} onPick={setTheme} />
        </div>
      )}
    </div>
  );
}
