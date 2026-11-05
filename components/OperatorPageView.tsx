// A page of the operator's (imprint, privacy, terms; #48): their Markdown in the page's language, or 404 without a file.
import Link from "next/link";
import { notFound } from "next/navigation";
import { readOperatorPage } from "@/backend";
import { serverCopy, serverLocale } from "./copy/server";
import { OperatorMarkdown } from "./OperatorMarkdown";
import { Wordmark } from "./Wordmark";
import { Footer } from "./Footer";

export async function OperatorPageView({ page }: { page: "imprint" | "privacy" | "terms" }) {
  const text = await readOperatorPage(page, await serverLocale());
  if (text === null) notFound();
  const copy = await serverCopy();
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 py-8">
      <Link href="/" aria-label={copy.appName}>
        <Wordmark />
      </Link>
      <article className="mt-6">
        <OperatorMarkdown text={text} />
      </article>
      <Footer />
    </main>
  );
}
