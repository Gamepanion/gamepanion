"use client";
// The language, in the header: a button with the flag of the language in use, and a menu of the languages, each its flag and its name
// in its own words (a flag stands for a country, not a language, so it never stands alone). Picking one renders the page again in it;
// the choice goes into a cookie for a year (components/copy/server.ts).
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId } from "react";
import { LOCALE_COOKIE, LOCALE_NAMES, LOCALES, type Locale } from "./copy";
import { useCopy, useLocale } from "./copy/client";
import { usePopover } from "./usePopover";

export function LanguageMenu() {
  const copy = useCopy();
  const locale = useLocale();
  const id = useId();
  const { open, toggle, button, panel } = usePopover();
  const label = `${copy.language}: ${LOCALE_NAMES[locale]}`;
  return (
    <div className="relative">
      <button ref={button} type="button" className="header-link" aria-expanded={open} aria-controls={id} aria-label={label} title={label} onClick={toggle}>
        <span className="flag icon-middle">
          <Flag locale={locale} />
        </span>
        <ChevronDown aria-hidden="true" className="icon-middle" />
      </button>
      {open && (
        <div ref={panel} id={id} className="header-menu">
          <LanguageChoices name={id} />
        </div>
      )}
    </div>
  );
}

/** The languages as radio choices, each its flag and its name in its own words; picking one renders the page again in it. Used by the
 * header's language menu and by the phone's menu. `legend` shows the group's name (the phone's menu has several groups). */
export function LanguageChoices({ name, legend = false }: { name: string; legend?: boolean }) {
  const copy = useCopy();
  const locale = useLocale();
  const router = useRouter();
  return (
    <fieldset>
      <legend className={legend ? "header-menu-legend" : "sr-only"}>{copy.language}</legend>
      {LOCALES.map((l) => (
        <label key={l} lang={l} className="header-menu-item">
          <input
            type="radio"
            name={name}
            checked={l === locale}
            onChange={() => {
              rememberLocale(l);
              router.refresh();
            }}
          />
          <span className="flag">
            <Flag locale={l} />
          </span>
          {LOCALE_NAMES[l]}
        </label>
      ))}
    </fieldset>
  );
}

function rememberLocale(l: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
}

export function Flag({ locale }: { locale: Locale }) {
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
