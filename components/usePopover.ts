"use client";
// A header menu's opening and closing, shared by the language and the colour scheme menus: a click outside or Escape closes it, Escape
// putting the focus back on its button; opening puts the focus on the choice in use.
import { useEffect, useRef, useState } from "react";

export function usePopover() {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!panel.current?.contains(e.target as Node) && !button.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", key);
    panel.current?.querySelector<HTMLInputElement>("input:checked")?.focus();
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  return { open, toggle: () => setOpen((o) => !o), button, panel };
}
