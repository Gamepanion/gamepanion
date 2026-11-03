"use client";
// Something to paste elsewhere (the MCP address for Claude's connector): set as code, with an icon button that copies it; the icon turns
// into a check and a screen reader hears "Copied".
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { useCopy } from "./copy/client";

export function CopyField({ value }: { value: string }) {
  const copy = useCopy();
  const [copied, setCopied] = useState(false);

  async function copyIt() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="copy-field">
      <code>{value}</code>
      <button type="button" onClick={copyIt} className="copy-button" aria-label={copied ? copy.copied : copy.copyIt} title={copy.copyIt}>
        {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? copy.copied : ""}
      </span>
    </div>
  );
}
