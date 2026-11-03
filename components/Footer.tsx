// The footer (#48): the operator's imprint, privacy policy and terms, each only when its file is set, and the third-party licenses.
import Link from "next/link";
import { operatorLinks } from "@/backend";
import { serverCopy, serverLocale } from "./copy/server";

export async function Footer() {
  const copy = await serverCopy();
  const links = await operatorLinks(await serverLocale());
  return (
    <footer className="mt-10 border-t border-rule px-4 py-4 text-sm text-muted">
      <nav aria-label={copy.footerLabel}>
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          {links.map((l) => (
            <li key={l.page}>
              <Link href={l.href} className="hover:text-accent">
                {copy[l.page]}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/licenses" className="hover:text-accent">
              {copy.licenses}
            </Link>
          </li>
        </ul>
      </nav>
    </footer>
  );
}
