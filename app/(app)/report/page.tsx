import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { githubIssueUrl, REPORT_KINDS, reportEndpoint, type ReportKind } from "@/backend";
import { ReportForm } from "@/components/ReportForm";
import { serverCopy } from "@/components/copy/server";
import { pagePlayer } from "../viewer";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await serverCopy()).reportProblem };
}
export const dynamic = "force-dynamic";

const one = (v: string | string[] | undefined): string => (Array.isArray(v) ? (v[0] ?? "") : (v ?? ""));

// Reporting a problem or an idea: a form that posts straight to the operator's inbox (GAMEPANION_REPORT_ENDPOINT, noticebox), so no
// account is needed and Gamepanion stores nothing. The report tool links here filled in (kind, title, text). Without JavaScript the
// inbox answers the post itself: back here with ?sent=1, or with ?error= and what was typed. Without an endpoint there is no page; the
// header links GitHub instead.
export default async function ReportPage({ searchParams }: PageProps<"/report">) {
  await pagePlayer();
  const endpoint = reportEndpoint();
  if (!endpoint) notFound();
  const copy = await serverCopy();
  const q = await searchParams;
  const kindParam = one(q.kind).toLowerCase();
  const kind: ReportKind = (REPORT_KINDS as readonly string[]).includes(kindParam) ? (kindParam as ReportKind) : "bug";
  const values = { kind, title: one(q.title).slice(0, 200), text: one(q.text).slice(0, 4000), email: one(q.email).slice(0, 254) };
  const errors = (Array.isArray(q.error) ? q.error : q.error ? [q.error] : []).slice(0, 10).map((e) => e.slice(0, 200));
  return (
    <div className="px-4 pt-6 pb-16 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl">{copy.reportProblem}</h1>
        <p className="mt-2 max-w-prose text-muted">{copy.reportIntro}</p>
        <div className="card mt-6">
          <ReportForm endpoint={endpoint} values={values} errors={errors} sent={one(q.sent) === "1"} />
        </div>
        <p className="mt-6 text-sm text-muted">
          {copy.reportGithub}{" "}
          <a href={githubIssueUrl(values.kind, values.title, values.text)} className="link">
            {copy.reportGithubLink}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
