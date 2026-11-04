// The colour scheme (light, dark, or the system's): a cookie like the language's, read on the server so the page is drawn in it at
// once (data-theme on <html>, app/layout.tsx; globals.css's light-dark() colours follow it).
export const THEME_COOKIE = "gamepanion-theme";
export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const pickTheme = (v: string | undefined): Theme => (v === "light" || v === "dark" ? v : "system");

/** Whether the page shows dark now: the choice, else the system's. For what draws outside the page's CSS (Creem's checkout). */
export function showsDark(): boolean {
  const t = document.documentElement.dataset.theme;
  return t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Remembers the choice for a year and applies it at once. */
export function applyTheme(t: Theme): void {
  document.cookie = `${THEME_COOKIE}=${t}; path=/; max-age=31536000; samesite=lax`;
  if (t === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
}

/** The scheme in use now, as the page shows it: what a menu marks when it opens. */
export const currentTheme = (): Theme => pickTheme(document.documentElement.dataset.theme);
