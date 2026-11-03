"use client";
// The first-run page (#80): the ways in, as long as nothing is filed; meanwhile it asks every few seconds whether the first session has
// arrived (through Claude or the in-app chat) and, once it has, says so with a link to it, politely to screen readers too. It stops
// asking while the tab is hidden, and starts again when it comes back. The notice stays when the page turns to the games.
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { firstSession } from "@/app/(app)/actions";
import { useCopy } from "./copy/client";

const EVERY_MS = 4000;

/** `watching`: nothing is filed yet, so ask; once something is, the page shows the games and this only keeps the notice. */
export function FirstRun({ watching, children }: { watching: boolean; children: ReactNode }) {
  const copy = useCopy();
  const [found, setFound] = useState<string | null>(null);

  useEffect(() => {
    if (!watching) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    let done = false;
    const stop = () => {
      clearInterval(timer);
      timer = undefined;
    };
    const check = async () => {
      const s = await firstSession().catch(() => null);
      if (s && !done) {
        done = true;
        stop();
        setFound(s.url);
      }
    };
    const start = () => {
      if (!done && !timer && document.visibilityState === "visible") timer = setInterval(check, EVERY_MS);
    };
    const onVisible = () => {
      if (document.visibilityState !== "visible") return stop();
      void check();
      start();
    };
    start();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [watching]);

  return (
    <>
      <div aria-live="polite">
        {found && (
          <div className="card continue-card space-y-2">
            <p className="text-xl font-bold">{copy.firstFiled}</p>
            <p>
              <Link href={found} className="font-semibold text-accent underline">
                {copy.firstFiledLink}
              </Link>
            </p>
          </div>
        )}
      </div>
      {(!found || !watching) && children}
    </>
  );
}
