"use client";
// The register of a playthrough's page: coloured index tabs along the top, like the dividers of a ring binder. Each tab is an address
// of its own (ADR 0019), so choosing one changes the address, back and forward step through them, and a link Claude handed out opens
// the tab it names. Only the open tab is rendered (on the server); a link to a quest, an item or a codex entry (…/items#item-…) opens its
// tab and scrolls to the row, unfolding a group or clearing a tag filter that hid it.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, type CSSProperties, type MouseEvent, type ReactNode } from "react";

export type Tab = { key: string; label: string; href: string; icon?: ReactNode };

export function Register({ tabs, at, label, children }: { tabs: Tab[]; at: string; label: string; children: ReactNode }) {
  const path = usePathname();

  // Show the element the #fragment names: out of a folded group, past a tag filter, then scroll to it. False when it isn't here.
  const show = useCallback((elementId: string) => {
    const el = document.getElementById(elementId);
    if (!el) return false;
    // On a card a tag hid, or in a group it emptied (components/TagFilter.tsx): show them all again first.
    if (el.closest("[data-tags][hidden], [data-tag-scope][hidden]")) el.dispatchEvent(new CustomEvent("gamepanion:reveal", { bubbles: true }));
    for (let d = el.closest("details"); d; d = d.parentElement?.closest("details") ?? null) d.open = true;
    requestAnimationFrame(() => el.scrollIntoView({ block: "start" }));
    return true;
  }, []);

  // On opening a tab's address, and when only the #fragment changes.
  useEffect(() => {
    const follow = () => {
      if (window.location.hash.length > 1) show(decodeURIComponent(window.location.hash.slice(1)));
    };
    follow();
    window.addEventListener("hashchange", follow);
    return () => window.removeEventListener("hashchange", follow);
  }, [path, show]);

  // A link to a row on this same tab: show it, also when the address already ends in that #fragment and the browser would do nothing.
  const onClick = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[href*='#']");
    if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const url = new URL(a.href);
    if (url.origin !== window.location.origin || url.pathname !== window.location.pathname) return;
    if (show(decodeURIComponent(url.hash.slice(1)))) {
      e.preventDefault();
      window.history.pushState(window.history.state, "", url.pathname + url.hash);
    }
  };

  return (
    <div className="register" data-at={at} onClick={onClick}>
      <nav aria-label={label}>
        <ul className="register-tabs" style={{ "--tabs": tabs.length } as CSSProperties}>
          {tabs.map((t) => (
            <li key={t.key} className="contents">
              <Link href={t.href} data-tab={t.key} aria-current={t.key === at ? "page" : undefined} className="register-tab">
                {t.icon}
                <span className="register-label">{t.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="register-panel" data-part={at}>
        {children}
      </div>
    </div>
  );
}
