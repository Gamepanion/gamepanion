import type { Metadata } from "next";
import Link from "next/link";
import { thirdPartyLicenses } from "@/backend";
import { Footer } from "@/components/Footer";
import { Wordmark } from "@/components/Wordmark";
import { serverCopy } from "@/components/copy/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await serverCopy()).licenses };
}

// The third-party open-source packages Gamepanion ships, with their licenses (#48), from third-party-licenses.json (npm run generate).
export default async function LicensesPage() {
  const copy = await serverCopy();
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/" aria-label={copy.appName}>
        <Wordmark />
      </Link>
      <h1 className="mt-6 text-3xl">{copy.licenses}</h1>
      <p className="mt-2 text-muted">{copy.licensesLead}</p>
      <ul className="mt-6 space-y-2">
        {thirdPartyLicenses.map((p) => (
          <li key={p.name} className="card">
            <details>
              <summary className="cursor-pointer">
                <span className="font-semibold">{p.name}</span> <span className="text-muted tabular-nums">{p.version}</span> · {p.license ?? "?"}
              </summary>
              {p.repository && <p className="mt-2 text-sm break-all text-muted">{p.repository}</p>}
              {p.text && <pre className="mt-2 text-xs whitespace-pre-wrap">{p.text}</pre>}
            </details>
          </li>
        ))}
      </ul>
      <Footer />
    </main>
  );
}
