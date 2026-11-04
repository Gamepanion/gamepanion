import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Mono, Atkinson_Hyperlegible_Next } from "next/font/google";
import "./globals.css";
import { LocaleProvider } from "@/components/copy/client";
import { siteUrl } from "@/backend";
import { cookies } from "next/headers";
import { serverCopy, serverLocale } from "@/components/copy/server";
import { pickTheme, THEME_COOKIE } from "@/components/theme";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await serverCopy();
  return {
    title: { default: copy.appName, template: `%s · ${copy.appName}` },
    description: copy.tagline,
    // The link preview (app/opengraph-image.png, docs/internals/brand.md) needs absolute URLs; PUBLIC_URL gives them.
    metadataBase: new URL(siteUrl()),
    openGraph: { title: `${copy.appName}: ${copy.sloganPlay} ${copy.sloganRemembers}`, description: copy.tagline, siteName: copy.appName },
    // On an iPhone's home screen it opens without Safari's bars, under its own name (the manifest says the same for everyone else).
    appleWebApp: { capable: true, title: copy.appName, statusBarStyle: "default" },
  };
}

// Phone first: the web app is for looking things up next to the screen. The browser's bar takes the page's ground: the scheme the player
// chose, else the system's.
export async function generateViewport(): Promise<Viewport> {
  const theme = pickTheme((await cookies()).get(THEME_COOKIE)?.value);
  const light = { color: "#f7f6fa", media: "(prefers-color-scheme: light)" };
  const dark = { color: "#0c0b10", media: "(prefers-color-scheme: dark)" };
  return {
    viewportFit: "cover",
    themeColor: theme === "light" ? light.color : theme === "dark" ? dark.color : [light, dark],
  };
}

// Atkinson Hyperlegible, served from the app itself (next/font downloads it at build time); its Mono for what is pasted elsewhere.
const text = Atkinson_Hyperlegible_Next({ subsets: ["latin"], variable: "--font-text", display: "swap" });
const mono = Atkinson_Hyperlegible_Mono({ subsets: ["latin"], variable: "--font-code", display: "swap" });

// The page's language, picked once here (components/copy), is the document's and every client component's; so is the colour scheme the
// player chose (components/theme.ts), else the system's.
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await serverLocale();
  const theme = pickTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html lang={locale} data-theme={theme === "system" ? undefined : theme} className={`${text.variable} ${mono.variable} antialiased`}>
      <body className="font-sans text-base leading-relaxed">
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
