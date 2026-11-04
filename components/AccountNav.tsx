"use client";
// The account page's table of contents on a wide screen (one column of long sections): a list of its sections beside them, staying in
// view, the one being read marked (aria-current). On a phone it isn't there: the page is one column, read top to bottom.
import { useEffect, useState } from "react";
import { useCopy } from "./copy/client";

export function AccountNav({ sections }: { sections: { id: string; label: string }[] }) {
  const copy = useCopy();
  const [current, setCurrent] = useState(sections[0]?.id);
  useEffect(() => {
    // The section nearest the top of the view is the one being read.
    const seen = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting ? e.boundingClientRect.top : Infinity);
        const top = [...seen.entries()].filter(([, y]) => y !== Infinity).sort((a, b) => a[1] - b[1])[0];
        if (top) setCurrent(top[0]);
      },
      { rootMargin: "0px 0px -60% 0px" },
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [sections]);
  return (
    <nav aria-label={copy.accountSections} className="account-nav">
      <ul>
        {sections.map((s) => (
          <li key={s.id}>
            <a href={`#${s.id}`} aria-current={current === s.id ? "location" : undefined} onClick={() => setCurrent(s.id)}>
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
