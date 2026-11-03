"use client";
// The passkeys row of the account page's "How you sign in": what they are, the ones the player has, adding one (the browser asks the
// device or password manager) and removing one.
import { KeyRound, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "./auth-client";
import { useCopy } from "./copy/client";

export function Passkeys({ list }: { list: { id: string; name: string; added: string }[] }) {
  const copy = useCopy();
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await authClient.passkey.addPasskey({ name: name.trim() || undefined });
    setBusy(false);
    if (error) return setError(copy.addPasskeyFailed);
    setName("");
    router.refresh();
  }

  async function remove(id: string) {
    setBusy(true);
    await authClient.passkey.deletePasskey({ id });
    setBusy(false);
    router.refresh();
  }

  return (
    <li className="px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="seal mt-0.5">
          <KeyRound aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{copy.passkeys}</p>
          <p className="text-sm text-muted">{copy.passkeysLead}</p>
        </div>
      </div>
      <div className="mt-3 space-y-3 pl-9">
        {list.length ? (
          <ul className="divide-y divide-rule rounded-lg border border-rule bg-surface">
            {list.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2 pr-1 pl-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate">{p.name}</p>
                  <p className="text-sm text-muted">{copy.passkeyAdded(p.added)}</p>
                </div>
                <button
                  type="button"
                  className="rounded-lg p-2 text-muted hover:text-error"
                  disabled={busy}
                  onClick={() => remove(p.id)}
                  aria-label={copy.removePasskey(p.name)}
                >
                  <Trash2 aria-hidden="true" className="size-5" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">{copy.noPasskeys}</p>
        )}
        <form onSubmit={add}>
          <label htmlFor="passkey-name" className="text-sm font-semibold">
            {copy.passkeyName}
          </label>
          <div className="mt-1 flex flex-col gap-2 sm:flex-row">
            <input
              id="passkey-name"
              className="field min-w-0 flex-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={copy.passkeyNameHint}
              maxLength={60}
            />
            <button className="button-secondary shrink-0" disabled={busy}>
              {copy.addPasskey}
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-sm text-error">
              {error}
            </p>
          )}
        </form>
      </div>
    </li>
  );
}
