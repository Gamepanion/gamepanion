import { notFound } from "next/navigation";
import { getPlaythrough, PLAYTHROUGH_TABS, type PlaythroughTab } from "@/backend";
import { Sheet } from "../../../playthrough/Sheet";
import { orNotFound, pagePlayer } from "../../../viewer";

export const dynamic = "force-dynamic";

// A playthrough's page, open at one tab: /p/[id] is the Overview, /p/[id]/quests and the rest the other tabs (ADR 0019), so the address
// Claude hands out opens the right one. What it shows follows the playthrough's spoiler setting (ADR 0016).
export default async function PlaythroughPage({ params }: PageProps<"/p/[id]/[[...tab]]">) {
  const { id, tab: segments } = await params;
  const tab = (segments?.[0] ?? "overview") as PlaythroughTab;
  if ((segments?.length ?? 0) > 1 || !PLAYTHROUGH_TABS.includes(tab) || segments?.[0] === "overview") notFound();
  const p = await pagePlayer();
  const t = await orNotFound(getPlaythrough(p, id));
  return (
    <div className="px-4 pt-6 pb-20 lg:px-14">
      <Sheet player={p} playthrough={t} tab={tab} />
    </div>
  );
}
