import Link from "next/link";
import {
  accountKeyPath,
  briefing,
  keyStorageEnabled,
  subscriptionOf,
  buildOf,
  continuePlaythrough,
  codexOf,
  itemsOf,
  listPlaythroughs,
  mcpUrl,
  questsOf,
  sessionsOf,
  type Player,
  type PlaythroughView,
} from "@/backend";
import { serverCopy } from "@/components/copy/server";
import { CopyField } from "@/components/CopyField";
import { FirstRun } from "@/components/FirstRun";
import { GameTile } from "@/components/GameTile";
import { PlaythroughCard, type PlaythroughCardData } from "@/components/PlaythroughCard";
import { CalendarDays, Crosshair, Footprints, ListTodo } from "lucide-react";
import { ChatOn } from "@/components/chat/Chat";

// Your games (the home page): every game with its tile, and under it a card for each of its playthroughs that says where the player is:
// the last session, the next step, the plan's next goals and how much is filed. A card opens its playthrough.
export async function Home({ player }: { player: Player }) {
  const copy = await serverCopy();
  const runs = await listPlaythroughs(player);
  // The first-run notice (#80) wraps both views at one place in the tree, so it keeps saying "your first session is filed" when the page
  // turns from the checklist to the games.
  if (!runs.length)
    return (
      <div className="space-y-4">
        <h1 className="text-3xl">{copy.contents}</h1>
        <FirstRun watching>
          <Welcome player={player} />
        </FirstRun>
      </div>
    );
  // "Where was I?" (#79): the playthrough played most recently among those being played gets the Continue card; the rest below, by game.
  const current = continuePlaythrough(runs);
  const rest = runs.filter((t) => t.id !== current?.id);
  // Games in the order of their latest playthrough; each game's playthroughs latest first.
  const games = [...new Map(rest.map((t) => [t.game.id, t.game])).values()];
  return (
    <div className="space-y-4">
      <h1 className="text-3xl">{copy.contents}</h1>
      <FirstRun watching={false}>
        <div className="space-y-6">
          {current && <Continue player={player} run={current} />}
          {games.map((g) => (
            <section key={g.id} aria-labelledby={`game-${g.id}`} className="space-y-2">
              <h2 id={`game-${g.id}`} className="flex items-center gap-3 pt-2">
                <GameTile title={g.title} />
                <span className="text-2xl">{g.title}</span>
                {g.platform && <span className="self-end pb-1 text-muted">{g.platform}</span>}
              </h2>
              <ol className="space-y-3">{rest.map((t) => (t.game.id !== g.id ? null : <RunCard key={t.id} player={player} run={t} />))}</ol>
            </section>
          ))}
        </div>
      </FirstRun>
    </div>
  );
}

async function RunCard({ player, run: t }: { player: Player; run: PlaythroughView }) {
  const copy = await serverCopy();
  const [open, build, sessions, items, codex] = await Promise.all([
    questsOf(player, t.id, { statuses: ["open", "blocked"], reveal: t.settings.spoilers }),
    buildOf(player, t.id, 1),
    sessionsOf(player, t.id),
    itemsOf(player, t.id, { reveal: t.settings.spoilers }),
    codexOf(player, t.id, { reveal: t.settings.spoilers }),
  ]);
  const next = open.find((q) => q.status === "open" && q.nextStep) ?? open[0];
  const goals = build.goals.filter((g) => g.status === "open" && !g.suggested && g.target !== null && g.current !== null).slice(0, 2);
  const data: PlaythroughCardData = {
    label: t.label,
    status: t.status,
    characterClass: t.character?.class ?? null,
    last: sessions[0] ?? null,
    next: next ? { name: next.name, text: next.nextStep, blocked: next.status === "blocked" } : null,
    moreOpen: Math.max(0, open.length - 1),
    goals: goals.map((g) => ({ id: g.id, name: g.stat ? `${g.stat.name} ${g.target}` : copy.level(g.target!), current: g.current!, target: g.target! })),
    counts: { quests: open.length, items: items.length, codex: codex.length },
  };
  return (
    <li>
      <PlaythroughCard data={data} copy={copy} href={t.url} />
    </li>
  );
}

// The Continue card (#79): the playthrough being played most recently, with a short version of its briefing, from the same read as
// MCP's briefing and the Overview tab: the last session, the next step, the open to-dos and the next goals. It never shows more than the
// playthrough's spoiler setting.
async function Continue({ player, run: t }: { player: Player; run: PlaythroughView }) {
  const copy = await serverCopy();
  const b = await briefing(player, { playthroughId: t.id });
  const next = b.openQuests.find((q) => q.status === "open" && q.nextStep) ?? b.openQuests[0];
  const goals = b.build.goals.filter((g) => g.status === "open" && !g.suggested).slice(0, 2);
  return (
    <section aria-labelledby="continue" className="card continue-card space-y-3">
      <h2 id="continue" className="flex items-center gap-3">
        <GameTile title={t.game.title} size="lg" />
        <span>
          <span className="block text-sm font-semibold text-muted uppercase">{copy.continueHeading}</span>
          <span className="block text-2xl">
            {t.game.title} · {t.label}
          </span>
        </span>
      </h2>
      <p className="run-line">
        <CalendarDays aria-hidden="true" />
        {b.lastSession ? (
          <span>
            <span className="text-sm text-muted tabular-nums">{copy.lastPlayed(b.lastSession.playedOn)}</span>
            <span className="block">{b.lastSession.summary}</span>
          </span>
        ) : (
          <span className="text-sm text-muted">{copy.notPlayedYet}</span>
        )}
      </p>
      {next && (
        <p className="run-line run-next">
          <Footprints aria-hidden="true" />
          <span>
            <span className="block text-sm font-semibold">{next.name}</span>
            <span className="block text-sm">{next.status === "blocked" ? copy.waitingOnGame : next.nextStep}</span>
          </span>
        </p>
      )}
      {b.todos.length > 0 && (
        <div className="run-line">
          <ListTodo aria-hidden="true" />
          <span>
            <span className="block text-sm font-semibold">{copy.todos}</span>
            <ul className="text-sm">
              {b.todos.slice(0, 3).map((x) => (
                <li key={x.id}>{x.text}</li>
              ))}
            </ul>
            {b.todos.length > 3 && <span className="block text-sm text-muted">{copy.moreTodos(b.todos.length - 3)}</span>}
          </span>
        </div>
      )}
      {goals.length > 0 && (
        <div className="run-line">
          <Crosshair aria-hidden="true" />
          <span>
            <span className="block text-sm font-semibold">{copy.goals}</span>
            <ul className="text-sm">
              {goals.map((g) => (
                <li key={g.id}>
                  {g.kind === "stat" && g.stat ? `${g.stat.name} ${g.target}` : g.kind === "level" ? copy.level(g.target ?? 0) : (g.item?.name ?? g.text)}
                  {g.current !== null && g.target !== null && <span className="text-muted tabular-nums"> · {copy.goalProgress(g.current, g.target)}</span>}
                </li>
              ))}
            </ul>
          </span>
        </div>
      )}
      <div className="flex flex-wrap gap-3 pt-1">
        <Link href={t.url} className="button-primary inline-flex items-center gap-2">
          {copy.continueButton}
        </Link>
        <ChatOn playthroughId={t.id} label={copy.continueChat} />
      </div>
    </section>
  );
}

// Nothing filed yet (#80): a checklist for each way in, the connector always and the player's own key where the instance stores keys,
// side by side from a tablet up. It turns into "your first session is filed" as soon as one arrives (components/FirstRun.tsx).
async function Welcome({ player }: { player: Player }) {
  const copy = await serverCopy();
  // On the hosted-AI plan (#56) the second way in is just talking; otherwise the player's own key, where the instance stores keys.
  const hostedAi = (await subscriptionOf(player)).hostedAi;
  const ownKey = keyStorageEnabled() || hostedAi;
  return (
    <div className="space-y-4">
      <p>{copy.nothingYet}</p>
      <div className={`grid gap-4 ${ownKey ? "md:grid-cols-2" : ""}`}>
        <section aria-labelledby="way-connector" className="card space-y-3">
          <h2 id="way-connector" className="text-xl font-bold">
            {copy.wayConnector}
          </h2>
          <ol className="first-run-steps">
            <li>
              <span>{copy.connectBefore}</span>
              <CopyField value={mcpUrl()} />
            </li>
            <li>{copy.connectSteps}</li>
            <li>{copy.connectAfter}</li>
          </ol>
        </section>
        {hostedAi ? (
          <section aria-labelledby="way-key" className="card space-y-3">
            <h2 id="way-key" className="text-xl font-bold">
              {copy.startTalking}
            </h2>
            <p>{copy.startTalkingLead}</p>
          </section>
        ) : (
          ownKey && (
            <section aria-labelledby="way-key" className="card space-y-3">
              <h2 id="way-key" className="text-xl font-bold">
                {copy.wayOwnKey}
              </h2>
              <ol className="first-run-steps">
                <li>
                  <span>
                    {copy.ownKeyStepBefore}{" "}
                    <Link href={accountKeyPath()} className="font-semibold text-accent underline">
                      {copy.ownKeyStepLink}
                    </Link>
                  </span>
                  <span className="block text-sm text-muted">{copy.keyNote}</span>
                </li>
                <li>{copy.ownKeyOpenChat}</li>
              </ol>
            </section>
          )
        )}
      </div>
    </div>
  );
}
