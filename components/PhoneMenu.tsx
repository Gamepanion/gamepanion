"use client";
// The header on a phone: everything beside the logo behind one button (the language, the colour scheme, reporting a problem, the
// account and signing out),
// so the logo and the switcher keep the row. The same choices as the header's own menus (LanguageChoices, ThemeChoices), one list
// each.
import { Bug, Menu, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { useCopy } from "./copy/client";
import { LanguageChoices } from "./LanguageMenu";
import { SignOutButton } from "./SignOutButton";
import { currentTheme, type Theme } from "./theme";
import { ThemeChoices } from "./ThemeMenu";
import { usePopover } from "./usePopover";

export function PhoneMenu({ theme: initial, reportHref }: { theme: Theme; reportHref: string }) {
  const copy = useCopy();
  const id = useId();
  const [theme, setTheme] = useState<Theme>(initial);
  const { open, toggle, button, panel } = usePopover();
  return (
    <div className="relative sm:hidden">
      <button
        ref={button}
        type="button"
        className="header-link"
        aria-expanded={open}
        aria-controls={id}
        aria-label={copy.menu}
        title={copy.menu}
        onClick={() => {
          setTheme(currentTheme());
          toggle();
        }}
      >
        {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </button>
      {open && (
        <div ref={panel} id={id} className="header-menu space-y-2">
          <LanguageChoices name={`${id}-lang`} legend />
          <ThemeChoices name={`${id}-theme`} theme={theme} onPick={setTheme} legend />
          <div className="border-t border-rule pt-1">
            <a href={reportHref} className="header-menu-item">
              <Bug aria-hidden="true" className="size-4" />
              {copy.reportProblem}
            </a>
            <Link href="/account" className="header-menu-item">
              <UserRound aria-hidden="true" className="size-4" />
              {copy.account}
            </Link>
            <SignOutButton className="header-menu-item w-full" />
          </div>
        </div>
      )}
    </div>
  );
}
