"use client";
// The report form: it posts straight to the operator's inbox, never to Gamepanion. With JavaScript the post is JSON and the answer
// shows here; without, the browser posts the form and the inbox sends it back (to ?sent=1, or with ?error= and what was typed).
// The inbox's form (noticebox) takes kind (Bug or Idea), title, text and email; a hidden field nobody fills catches bots.
import { useState } from "react";
import { useCopy } from "./copy/client";

type Values = { kind: "bug" | "idea"; title: string; text: string; email: string };
const INBOX_KIND = { bug: "Bug", idea: "Idea" } as const;

export function ReportForm({ endpoint, values, errors: initial, sent: wasSent }: { endpoint: string; values: Values; errors: string[]; sent: boolean }) {
  const copy = useCopy();
  const [errors, setErrors] = useState(initial);
  const [sent, setSent] = useState(wasSent);
  const [sending, setSending] = useState(false);

  if (sent)
    return (
      <div>
        <p role="status" className="font-semibold">
          {copy.reportSent}
        </p>
        <button type="button" className="link mt-3" onClick={() => setSent(false)}>
          {copy.reportAnother}
        </button>
      </div>
    );

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);
    const form = e.currentTarget;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form).entries())),
      });
      if (res.status === 201) {
        form.reset();
        setErrors([]);
        return setSent(true);
      }
      if (res.status === 400) return setErrors(((await res.json()) as { errors?: string[] }).errors ?? [copy.reportFailed]);
      setErrors([res.status === 429 ? copy.reportTooMany : copy.reportFailed]);
    } catch {
      setErrors([copy.reportFailed]);
    } finally {
      setSending(false);
    }
  };

  return (
    <form method="post" action={endpoint} onSubmit={submit} className="space-y-4">
      {errors.length > 0 && (
        <ul role="alert" className="list-disc pl-5 text-error">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      <fieldset>
        <legend className="text-sm font-semibold">{copy.reportKind}</legend>
        <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1">
          {(["bug", "idea"] as const).map((k) => (
            <label key={k} className="flex items-center gap-2">
              <input type="radio" name="kind" value={INBOX_KIND[k]} defaultChecked={values.kind === k} required className="accent-accent" />
              {k === "bug" ? copy.reportBug : copy.reportIdea}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block text-sm font-semibold">
        {copy.reportTitle}
        <input name="title" type="text" required maxLength={200} defaultValue={values.title} className="field mt-1 font-normal" />
      </label>
      <label className="block text-sm font-semibold">
        {copy.reportText}
        <textarea
          name="text"
          required
          rows={7}
          maxLength={4000}
          defaultValue={values.text}
          aria-describedby="report-text-hint"
          className="field mt-1 font-normal"
        />
      </label>
      <p id="report-text-hint" className="-mt-2 text-sm text-muted">
        {copy.reportTextHint}
      </p>
      <label className="block text-sm font-semibold">
        {copy.reportEmail}
        <input
          name="email"
          type="email"
          maxLength={254}
          defaultValue={values.email}
          autoComplete="email"
          aria-describedby="report-email-hint"
          className="field mt-1 font-normal"
        />
      </label>
      <p id="report-email-hint" className="-mt-2 text-sm text-muted">
        {copy.reportEmailHint}
      </p>
      <div className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true">
        <label>
          Leave this field empty <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <button type="submit" disabled={sending} className="button-primary">
        {copy.reportSend}
      </button>
    </form>
  );
}
