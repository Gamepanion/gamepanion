// Reporting a problem or an idea. With GAMEPANION_REPORT_ENDPOINT set, the report page (/report) takes it, a form that posts straight
// to the operator's inbox (noticebox): no account needed, and Gamepanion stores nothing. Always there besides: a new issue on
// Gamepanion's GitHub, filled in as far as we can, for whoever has an account there. Either way the player sends it themselves, after
// seeing what goes.
import { config } from "./config";
import { OWN_LICENSE } from "./licenses";

export const REPORT_KINDS = ["bug", "idea"] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

/** Where Gamepanion's issues are. */
export const ISSUES_URL = `${OWN_LICENSE.source}/issues`;
/** The report page. */
export const REPORT_PATH = "/report";

/** The endpoint the report page posts to, or undefined when there is no page. */
export const reportEndpoint = () => config.reportEndpoint();

// What a blank GitHub issue asks for, so the person filling it in knows what helps.
const TEMPLATE: Record<ReportKind, string> = {
  bug: "## What happened\n\n\n## What I expected\n\n\n## How to get there\n\n1. \n",
  idea: "## What I'd like\n\n\n## Why\n\n",
};

/** A new GitHub issue, with the title and the text filled in; without them, the blank template of its kind. */
export function githubIssueUrl(kind: ReportKind = "bug", title?: string, body?: string): string {
  const q = new URLSearchParams({ title: title?.trim() || "", body: body?.trim() || TEMPLATE[kind] });
  return `${ISSUES_URL}/new?${q}`;
}

/** The report page, filled in; or, without an endpoint, the GitHub issue. */
export function reportUrl(kind: ReportKind = "bug", title?: string, body?: string): string {
  if (!reportEndpoint()) return githubIssueUrl(kind, title, body);
  const q = new URLSearchParams();
  if (title?.trim() || body?.trim()) q.set("kind", kind);
  if (title?.trim()) q.set("title", title.trim());
  if (body?.trim()) q.set("text", body.trim());
  return q.size ? `${REPORT_PATH}?${q}` : REPORT_PATH;
}
