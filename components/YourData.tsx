"use client";
// The account page's "Your data" (#106): the download of everything the player filed, and deleting the account. Deleting folds out in
// two steps where codes can be mailed (a code to the address, then the code), in one where they can't (a session from the last day).
// Only here: no tool and no API route deletes an account.
import { Download, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { authClient } from "./auth-client";
import { useCopy } from "./copy/client";

const AFTER = "/login?deleted=1";

export function YourData({ email, mailed, exportPath }: { email: string; mailed: boolean; exportPath: string }) {
  const copy = useCopy();
  const router = useRouter();
  const field = useId();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function ask(body: { callbackURL: string; token?: string }) {
    setBusy(true);
    setError(null);
    const { data, error } = await authClient.deleteUser(body);
    setBusy(false);
    if (error) return setError(error.code === "SESSION_EXPIRED" ? copy.deleteStale : copy.deleteFailed);
    if (data?.message === "User deleted" || body.token) return router.replace(AFTER);
    setSent(true);
  }

  function close() {
    setOpen(false);
    setSent(false);
    setCode("");
    setError(null);
  }

  return (
    <section id="data" aria-labelledby="data-title" className="scroll-mt-6">
      <h2 id="data-title" className="section-title">
        <span className="seal">
          <Download aria-hidden="true" />
        </span>
        {copy.dataTitle}
      </h2>
      <div className="card space-y-5">
        <div className="space-y-3">
          <p>{copy.exportLead}</p>
          <a href={exportPath} download className="button-secondary inline-flex items-center gap-2">
            <Download aria-hidden="true" className="size-4" />
            {copy.exportButton}
          </a>
        </div>
        <div className="space-y-3 border-t border-rule pt-5">
          <h3 className="font-semibold">{copy.deleteTitle}</h3>
          <p className="text-sm text-muted">{copy.deleteLead}</p>
          {!open ? (
            <button type="button" className="button-secondary inline-flex items-center gap-2" onClick={() => setOpen(true)}>
              <Trash2 aria-hidden="true" className="size-4" />
              {copy.deleteStart}
            </button>
          ) : sent ? (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                ask({ callbackURL: AFTER, token: code.trim() });
              }}
            >
              <p role="status" className="text-sm text-muted">
                {copy.deleteCodeSent(email)}
              </p>
              <label htmlFor={field} className="block text-sm font-semibold">
                {copy.deleteCodeLabel}
              </label>
              <input
                id={field}
                className="field font-mono"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="one-time-code"
                autoFocus
                required
              />
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" className="button-secondary" onClick={close}>
                  {copy.cancel}
                </button>
                <button className="button-primary" disabled={busy || !code.trim()}>
                  {copy.deleteNow}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <p className="text-sm">{mailed ? copy.deleteConfirmMailed(email) : copy.deleteConfirmFresh}</p>
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" className="button-secondary" onClick={close}>
                  {copy.cancel}
                </button>
                <button type="button" className="button-primary" disabled={busy} onClick={() => ask({ callbackURL: AFTER })}>
                  {mailed ? copy.deleteSendCode : copy.deleteNow}
                </button>
              </div>
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
