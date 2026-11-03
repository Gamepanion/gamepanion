import type { Metadata } from "next";
import { OperatorPageView } from "@/components/OperatorPageView";
import { serverCopy } from "@/components/copy/server";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  return { title: (await serverCopy()).privacy };
}

// The operator's privacy (#48), from their Markdown file; no file, no page.
export default function Page() {
  return <OperatorPageView page="privacy" />;
}
