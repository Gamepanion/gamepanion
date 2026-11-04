"use client";
// The player's own Anthropic key on the account page (/account#key, ADR 0021): a field to paste it, "Test key" (one cheap call), "Save
// key", and once saved only its last four characters. The field is never filled from the server: the key doesn't come back.
import { KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { removeKeyAction, saveKeyAction, testKeyAction, type KeyResult } from "@/app/(app)/account/actions";
import { useCopy } from "./copy/client";

export function KeySection({
  enabled,
  last4,
  without,
  sold,
}: {
  enabled: boolean;
  last4: string | null;
  /** What the chat runs on while no key is stored (chatWithoutOwnKey). */
  without: "instance" | "needsKey" | "none";
  /** Whether the instance sells plans: then its own key is "Gamepanion's AI". */
  sold: boolean;
}) {
  const copy = useCopy();
  const router = useRouter();
  const field = useId();
  const note = useId();
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState<KeyResult | null>(null);
  const [pending, start] = useTransition();
  const words: Record<KeyResult, string> = {
    works: copy.keyWorks,
    rejected: copy.keyRejected,
    unreachable: copy.keyUnreachable,
    invalid: copy.keyInvalid,
    saved: copy.keySaved,
    removed: copy.keyRemoved,
    off: copy.keyOff,
  };
  const run = (action: () => Promise<KeyResult>, clear = false) =>
    start(async () => {
      const r = await action();
      setResult(r);
      if (clear && (r === "saved" || r === "removed")) {
        setDraft("");
        router.refresh();
      }
    });

  return (
    <section id="key" aria-labelledby="key-title" className="scroll-mt-6">
      <h2 id="key-title" className="section-title">
        <span className="seal">
          <KeyRound aria-hidden="true" />
        </span>
        {copy.keyTitle}
      </h2>
      <div className="card space-y-3">
        <p>{copy.keyLead}</p>
        <p id={note} className="text-sm text-muted">
          {copy.keyNote}
        </p>
        {!enabled ? (
          <p className="text-sm">{copy.keyOff}</p>
        ) : (
          <>
            <p className="font-semibold">
              {last4 ? copy.keyStored(last4) : without === "instance" ? copy.keyNoneInstance(sold) : without === "needsKey" ? copy.keyNoneNeeded : copy.keyNone}
            </p>
            {!last4 && without === "needsKey" && (
              <a href="/subscribe" className="button-primary inline-block">
                {copy.seePlans}
              </a>
            )}
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                run(() => saveKeyAction(draft), true);
              }}
            >
              <label htmlFor={field} className="block text-sm font-semibold">
                {copy.keyField}
              </label>
              <input
                id={field}
                type="password"
                className="field font-mono"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="sk-ant-…"
                autoComplete="off"
                spellCheck={false}
                aria-describedby={note}
              />
              <div className="flex flex-wrap gap-3">
                <button type="submit" className="button-primary" disabled={pending || !draft.trim()}>
                  {last4 ? copy.keyReplace : copy.keySave}
                </button>
                <button
                  type="button"
                  className="button-secondary"
                  disabled={pending || (!draft.trim() && !last4)}
                  onClick={() => run(() => testKeyAction(draft))}
                >
                  {copy.keyTest}
                </button>
                {last4 && (
                  <button type="button" className="button-secondary" disabled={pending} onClick={() => run(removeKeyAction, true)}>
                    {copy.keyRemove}
                  </button>
                )}
              </div>
            </form>
          </>
        )}
        <p role="status" aria-live="polite" className="text-sm font-semibold">
          {result ? words[result] : ""}
        </p>
      </div>
    </section>
  );
}
