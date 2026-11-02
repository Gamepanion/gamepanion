"use client";
// The account page's profile: the name shown when an app is connected, and moving the account to another address (a code to the new
// address confirms it; the account, its passkeys and its log stay).
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "./auth-client";
import { useCopy } from "./copy/client";

export function Profile({ name: saved, email }: { name: string; email: string }) {
  const copy = useCopy();
  const router = useRouter();
  const [name, setName] = useState(saved);
  const [nameNote, setNameNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await authClient.updateUser({ name: name.trim() });
    setBusy(false);
    setNameNote(error ? { ok: false, text: copy.saveFailed } : { ok: true, text: copy.nameSaved });
    if (!error) router.refresh();
  }

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setEmailError(null);
    const address = newEmail.trim();
    const { error } = await authClient.emailOtp.requestEmailChange({ newEmail: address });
    setBusy(false);
    if (error) return setEmailError(copy.changeCodeFailed);
    setSentTo(address);
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!sentTo) return;
    setBusy(true);
    setEmailError(null);
    const { error } = await authClient.emailOtp.changeEmail({ newEmail: sentTo, otp: code.trim() });
    setBusy(false);
    if (error) return setEmailError(copy.changeEmailFailed);
    setSentTo(null);
    setNewEmail("");
    setCode("");
    router.refresh();
  }

  function startOver() {
    setSentTo(null);
    setCode("");
    setEmailError(null);
  }

  return (
    <div className="mt-6 space-y-8">
      <form onSubmit={saveName} className="space-y-3">
        <label className="block">
          <span className="text-sm font-semibold">{copy.displayName}</span>
          <input
            className="field mt-1"
            value={name}
            onChange={(e) => (setName(e.target.value), setNameNote(null))}
            maxLength={60}
            autoComplete="name"
            aria-describedby="display-name-hint"
          />
          <span id="display-name-hint" className="mt-1 block text-sm text-muted">
            {copy.displayNameHint}
          </span>
        </label>
        <button className="button-primary w-full" disabled={busy || name.trim() === saved}>
          {copy.saveName}
        </button>
        {nameNote && (
          <p role={nameNote.ok ? "status" : "alert"} className={`text-sm ${nameNote.ok ? "text-muted" : "text-error"}`}>
            {nameNote.text}
          </p>
        )}
      </form>

      <div className="space-y-3">
        <p className="text-sm">{copy.signedInWith(email)}</p>
        {sentTo ? (
          <form onSubmit={confirm} className="space-y-3">
            <p role="status" className="text-sm text-muted">
              {copy.codeSent(sentTo)}
            </p>
            <label className="block">
              <span className="text-sm font-semibold">{copy.codeLabel}</span>
              <input className="field mt-1" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" required />
            </label>
            <button className="button-primary w-full" disabled={busy || !code.trim()}>
              {copy.changeEmail}
            </button>
            <button type="button" className="w-full text-sm text-muted hover:text-accent" onClick={startOver}>
              {copy.otherAddress}
            </button>
          </form>
        ) : (
          <form onSubmit={requestCode} className="space-y-3">
            <label className="block">
              <span className="text-sm font-semibold">{copy.newEmail}</span>
              <input className="field mt-1" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} autoComplete="email" required />
            </label>
            <button className="button-primary w-full" disabled={busy || !newEmail.trim()}>
              {copy.sendChangeCode}
            </button>
          </form>
        )}
        {emailError && (
          <p role="alert" className="text-sm text-error">
            {emailError}
          </p>
        )}
      </div>
    </div>
  );
}
