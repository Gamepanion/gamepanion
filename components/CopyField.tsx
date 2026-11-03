"use client";
// Something to paste elsewhere (the MCP address for Claude's connector): set as code, with a button that copies it and says so.
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
      <button type="button" onClick={copyIt} className="copy-button">
        {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
        <span aria-live="polite">{copied ? copy.copied : copy.copyIt}</span>
      </button>
    </div>
  );
}
