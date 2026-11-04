"use client";
// How the app looks, behind one button in the header: the language and the colour scheme. The button shows the language in use (EN, DE);
// the menu holds two groups of native radio buttons (arrow keys move within a group), applied as soon as one is picked. A click outside
// or Escape closes it, Escape putting the focus back on the button. Each choice goes into a cookie for a year: the language renders the
// page again in it (components/copy/server.ts), the scheme applies at once (components/theme.ts). A flag stands for a country, not a
// language, so it only goes with the language's name, in its own words.
import { ChevronDown, Globe, Monitor, Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { LOCALE_COOKIE, LOCALE_NAMES, LOCALES, type Locale } from "./copy";
import { useCopy, useLocale } from "./copy/client";
import { applyTheme, THEMES, type Theme } from "./theme";

const THEME_ICONS = { system: Monitor, light: Sun, dark: Moon } as const;

export function DisplayMenu({ theme: initialTheme }: { theme: Theme }) {
  const copy = useCopy();
  const locale = useLocale();
  const router = useRouter();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!panel.current?.contains(e.target as Node) && !button.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", key);
    panel.current?.querySelector<HTMLInputElement>("input:checked")?.focus();
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  function chooseLanguage(l: Locale) {
    if (l === locale) return;
    rememberLocale(l);
    router.refresh();
  }
  function chooseTheme(t: Theme) {
    setTheme(t);
    applyTheme(t);
  }

  return (
    <div className="relative">
      <button
        ref={button}
        type="button"
        className="header-link"
        aria-expanded={open}
        aria-controls={id}
        aria-label={copy.display}
        title={copy.display}
        onClick={() => setOpen((o) => !o)}
      >
        <Globe aria-hidden="true" />
        <span className="uppercase">{locale}</span>
        <ChevronDown aria-hidden="true" />
      </button>
      {open && (
        <div ref={panel} id={id} className="display-menu">
          <fieldset>
            <legend>{copy.language}</legend>
            {LOCALES.map((l) => (
              <label key={l} lang={l}>
                <input type="radio" name={`${id}-lang`} checked={l === locale} onChange={() => chooseLanguage(l)} />
                <span className="flag">
                  <Flag locale={l} />
                </span>
                {LOCALE_NAMES[l]}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>{copy.theme}</legend>
            {THEMES.map((t) => {
              const Icon = THEME_ICONS[t];
              return (
                <label key={t}>
                  <input type="radio" name={`${id}-theme`} checked={t === theme} onChange={() => chooseTheme(t)} />
                  <Icon aria-hidden="true" />
                  {copy.themes[t]}
                </label>
              );
            })}
          </fieldset>
        </div>
      )}
    </div>
  );
}

// The language, for a year, read on the server by components/copy/server.ts.
function rememberLocale(l: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
}

function Flag({ locale }: { locale: Locale }) {
  // useId may hold characters that url(#…) doesn't take.
  const id = useId().replace(/[^\w-]/g, "");
  if (locale === "de")
    return (
      <svg viewBox="0 0 5 3" preserveAspectRatio="none" aria-hidden="true">
        <rect width="5" height="1" y="0" fill="#000" />
        <rect width="5" height="1" y="1" fill="#dd0000" />
        <rect width="5" height="1" y="2" fill="#ffce00" />
      </svg>
    );
  // The Union Jack: its red diagonals are offset from the white ones, which the clip path does.
  return (
    <svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <clipPath id={`${id}t`}>
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#${id}t)`} stroke="#c8102e" strokeWidth="4" />
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#c8102e" strokeWidth="6" />
    </svg>
  );
}
