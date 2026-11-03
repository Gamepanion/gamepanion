"use client";
// The account page's two client parts: the bookplate, where the player renames themselves in place, and the email-code row, whose
// "Change address" folds out the two steps of moving the account (a code to the new address, then the switch; #61).
import { Mail, PenLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { authClient } from "./auth-client";
import { useCopy } from "./copy/client";

/** Who keeps this almanac: the name set large in a gilt double frame, the address under it, renamed in place. */
export function Bookplate({ name, email }: { name: string; email: string }) {
  const copy = useCopy();
  const router = useRouter();
  const hint = useId();
  const field = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await authClient.updateUser({ name: draft.trim() });
    setBusy(false);
    setError(!!error);
    if (error) return;
    setEditing(false);
    router.refresh();
  }

  function cancel() {
    setDraft(name);
    setError(false);
    setEditing(false);
  }

  return (
    <section className="bookplate" aria-labelledby="kept-by">
      {/* The compass star of the almanac's cover (ClosedBook.tsx), small, in its gilt. */}
      <svg viewBox="0 0 64 64" className="mx-auto mb-2 size-8 text-hint" aria-hidden="true">
        <circle cx="32" cy="32" r="27" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M32 6 L36 28 L58 32 L36 36 L32 58 L28 36 L6 32 L28 28 Z" fill="currentColor" opacity="0.8" />
      </svg>
      <p id="kept-by" className="text-sm text-muted">
        {copy.keptByLead}
      </p>
      {editing ? (
        <form onSubmit={save} onKeyDown={(e) => e.key === "Escape" && cancel()}>
          <label htmlFor={field} className="sr-only">
            {copy.displayName}
          </label>
          <input
            id={field}
            className="bookplate-name bookplate-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={copy.noName}
            maxLength={60}
            autoComplete="name"
            autoFocus
            onFocus={(e) => e.currentTarget.select()}
            aria-describedby={hint}
          />
          <p className="mt-1 text-sm text-muted [overflow-wrap:anywhere]">{email}</p>
          <div className="mt-4 flex justify-center gap-5 text-sm">
            <button type="button" className="link text-muted" onClick={cancel}>
              {copy.cancel}
            </button>
            <button className="link font-semibold" disabled={busy || draft.trim() === name}>
              {copy.saveName}
            </button>
          </div>
          <p id={hint} className="mt-3 text-xs text-muted">
            {copy.displayNameHint}
          </p>
          {error && (
            <p role="alert" className="mt-2 text-sm text-error">
              {copy.saveFailed}
            </p>
          )}
        </form>
      ) : (
        <>
          {name ? <p className="bookplate-name">{name}</p> : <p className="mt-2 text-xl text-muted italic">{copy.noName}</p>}
          <p className="mt-1 text-sm text-muted [overflow-wrap:anywhere]">{email}</p>
          <button type="button" className="link mt-4 inline-flex items-center gap-1.5 text-sm" onClick={() => setEditing(true)}>
            <PenLine aria-hidden="true" className="size-4" />
            {name ? copy.rename : copy.addName}
          </button>
        </>
      )}
    </section>
  );
}

/** The email-code row of "How you sign in": where the codes go, and moving the account to another address. */
export function EmailCode({ email }: { email: string }) {
  const copy = useCopy();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const address = newEmail.trim();
    const { error } = await authClient.emailOtp.requestEmailChange({ newEmail: address });
    setBusy(false);
    if (error) return setError(copy.changeCodeFailed);
    setSentTo(address);
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!sentTo) return;
    setBusy(true);
    setError(null);
    const { error } = await authClient.emailOtp.changeEmail({ newEmail: sentTo, otp: code.trim() });
    setBusy(false);
    if (error) return setError(copy.changeEmailFailed);
    close();
    router.refresh();
  }

  function close() {
    setOpen(false);
    setSentTo(null);
    setNewEmail("");
    setCode("");
    setError(null);
  }

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="seal">
          <Mail aria-hidden="true" />
        </span>
        <div className="min-w-48 flex-1">
          <p className="font-semibold">{copy.emailCode}</p>
          <p className="text-sm text-muted [overflow-wrap:anywhere]">{copy.emailCodeTo(email)}</p>
        </div>
        {!open && (
          <button type="button" className="button-secondary ml-auto shrink-0 text-sm" onClick={() => setOpen(true)}>
            {copy.changeAddress}
          </button>
        )}
      </div>
      {open && (
        <div className="mt-3 space-y-3 border-t border-rule pt-3 sm:pl-9">
          {sentTo ? (
            <form onSubmit={confirm} className="space-y-3">
              <p role="status" className="text-sm text-muted">
                {copy.codeSent(sentTo)}
              </p>
              <label className="block">
                <span className="text-sm font-semibold">{copy.codeLabel}</span>
                <input
                  className="field mt-1"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  required
                />
              </label>
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" className="button-secondary" onClick={() => (setSentTo(null), setCode(""), setError(null))}>
                  {copy.otherAddress}
                </button>
                <button className="button-primary" disabled={busy || !code.trim()}>
                  {copy.useAddress}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={requestCode} className="space-y-3">
              <label className="block">
                <span className="text-sm font-semibold">{copy.newEmail}</span>
                <input
                  className="field mt-1"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                  required
                />
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" className="button-secondary" onClick={close}>
                  {copy.cancel}
                </button>
                <button className="button-primary" disabled={busy || !newEmail.trim()}>
                  {copy.sendChangeCode}
                </button>
              </div>
            </form>
          )}
          {error && (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
