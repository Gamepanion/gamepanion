import Link from "next/link";
import type { ReactNode } from "react";
import {
  buildOf,
  CODEX_KINDS,
  EFFECTS,
  codexOf,
  itemsOf,
  questsOf,
  sessionsOf,
  tagsInUse,
  todosOf,
  type TodoView,
  type BackgroundLine,
  type CodexView,
  type ItemView,
  type Player,
  type PlaythroughTab,
  type PlaythroughView,
  type QuestView,
  PLAYTHROUGH_TABS,
  BRIEFING_SECTIONS,
  briefing,
  TRUST_LEVELS,
  tabPath,
  todoPath,
} from "@/backend";
import { serverCopy } from "@/components/copy/server";
import { Notes } from "@/components/Notes";
import { PlaythroughSettings } from "@/components/PlaythroughSettings";
import { TagFilter } from "@/components/TagFilter";
import { TodoCheck } from "@/components/TodoCheck";
import { Register } from "@/components/Register";
import { CODEX_ICONS, Group, Heading, itemIcon, PART_ICONS, QUEST_ICONS, Tile } from "@/components/icons";
import { TalkAbout } from "@/components/chat/Chat";
import { CalendarDays, Crosshair, Footprints, Sparkles, Sword } from "lucide-react";

// A link's site, for a source without a title.
const siteOf = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};

// One playthrough's page: its title, then the register (components/Register.tsx) open at one tab, Overview (where the player left off)
// first. It shows as much as the player's spoiler setting for the run (ADR 0016), and marks what is a hint or a spoiler (values V1).
export async function Sheet({ player: p, playthrough: t, tab }: { player: Player; playthrough: PlaythroughView; tab: PlaythroughTab }) {
  const copy = await serverCopy();
  const id = t.id;
  const reveal = t.settings.spoilers;
  const [threads, all, build, items, sessions, codex, todos] = await Promise.all([
    questsOf(p, id, { statuses: ["open", "blocked"], reveal }),
    questsOf(p, id, { reveal }),
    buildOf(p, id, 1),
    itemsOf(p, id, { reveal }),
    sessionsOf(p, id),
    codexOf(p, id, { reveal }),
    todosOf(p, id, { reveal }),
  ]);
  // The inventory by the game's groups, in the player's order, under the game's own name when it has one; an item without one goes last.
  const kinds = t.game.itemKinds;
  const known = (k: string | null) => kinds.some((x) => x.key === k);
  const groups: [string, string | null, ItemView[]][] = [
    ...kinds.map((k): [string, string | null, ItemView[]] => [k.localName ?? k.name, k.key, items.filter((i) => i.kind === k.key)]),
    [copy.otherItems, null, items.filter((i) => !known(i.kind))] as [string, string | null, ItemView[]],
  ].filter(([, , list]) => list.length > 0);
  const open = [...threads.filter((q) => q.status === "open"), ...threads.filter((q) => q.status === "blocked")];
  const closed = all.filter((q) => q.status !== "open" && q.status !== "blocked");
  const current = build.snapshots[0];
  const codexKinds = CODEX_KINDS.filter((k) => codex.some((e) => e.kind === k));
  const tabs = PLAYTHROUGH_TABS.map((key) => {
    const Icon = PART_ICONS[key];
    return { key, label: copy.tabs[key], href: tabPath(id, key), icon: <Icon aria-hidden="true" /> };
  });
  const hasNotes = t.game.description || t.game.notes || t.notes;
  return (
    <div className="space-y-4">
      <div className="plate">
        <h2 className="text-2xl font-bold">{t.game.title}</h2>
        <p className="text-muted">
          {t.label} · {copy.status[t.status]}
          {t.game.platform ? ` · ${t.game.platform}` : ""}
        </p>
        {t.character && (
          <p className="mt-1">
            {[t.character.name, t.character.class].filter(Boolean).join(", ")}
            {t.character.localClass && <span className="text-sm text-muted"> · {t.character.localClass}</span>}
          </p>
        )}
      </div>

      {/* The rest behind the register's tabs, one address each; hints open on the quests, where they are. */}
      <Register tabs={tabs} at={tab} label={copy.tabs.label}>
        {
          {
            // Where the player left off: the last session, what each open quest waits for, the plan's next goals and what is equipped.
            overview: <Overview player={p} playthrough={t} />,
            todos: <Todos todos={todos} />,
            character: (
              <div className="space-y-6 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
                <section>
                  <Heading icon={Crosshair}>{copy.goals}</Heading>
                  {build.goals.length === 0 ? <p className="card text-muted">{copy.noGoals}</p> : <Goals goals={build.goals} run={t.id} />}
                </section>
                <section>
                  <Heading icon={Sparkles}>{copy.build}</Heading>
                  <div className="card space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      {build.plan?.mainStat ? <p className="font-semibold">{copy.mainStat(build.plan.mainStat)}</p> : <span />}
                      {current && <TalkAbout kind="stats" id={current.id} name={copy.build} playthroughId={t.id} />}
                    </div>
                    {build.plan?.summary && <p className="text-muted">{build.plan.summary}</p>}
                    {current ? (
                      <>
                        <p className="text-sm text-muted">
                          {current.takenOn}
                          {current.level !== null ? ` · ${copy.level(current.level)}` : ""}
                        </p>
                        <Notes notes={current.notes} />
                        <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-1">
                          {current.stats.map((s) => (
                            <div key={s.key} className="flex justify-between gap-2">
                              <dt>
                                {s.name}
                                {s.localName && <span className="text-sm text-muted"> · {s.localName}</span>}
                              </dt>
                              <dd className="font-semibold tabular-nums">
                                {s.value}
                                {s.change ? <span className="text-accent"> {s.change > 0 ? `+${s.change}` : s.change}</span> : null}
                                {build.plan?.targets[s.key] !== undefined && <span className="text-muted"> / {build.plan.targets[s.key]}</span>}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </>
                    ) : (
                      <p className="text-muted">{copy.noBuild}</p>
                    )}
                  </div>
                </section>
              </div>
            ),
            quests: (
              <TagFilter tags={tagsInUse([...open, ...closed])} label={copy.tags}>
                <div className="space-y-6">
                  <Group icon={QUEST_ICONS.open} label={copy.openQuests} count={open.length}>
                    {open.length === 0 ? <p className="card text-muted">{copy.noOpenQuests}</p> : <Quests quests={open} run={t.id} />}
                  </Group>
                  {closed.length > 0 && (
                    <Group icon={QUEST_ICONS.done} label={copy.closedQuests} count={closed.length}>
                      <Quests quests={closed} run={t.id} />
                    </Group>
                  )}
                </div>
              </TagFilter>
            ),
            // The inventory in the game's groups; on a wide screen two columns of cards.
            items:
              items.length === 0 ? (
                <p className="card text-muted">{copy.noItems}</p>
              ) : (
                <TagFilter tags={tagsInUse(items)} label={copy.tags}>
                  <div className="space-y-6">
                    {groups.map(([label, key, list]) => (
                      <Group key={label} icon={itemIcon(key)} label={label} count={list.length}>
                        <ul className="grid gap-2 lg:grid-cols-2">
                          {list.map((i) => (
                            <Item key={i.id} item={i} run={t.id} />
                          ))}
                        </ul>
                      </Group>
                    ))}
                  </div>
                </TagFilter>
              ),
            codex:
              codex.length === 0 ? (
                <p className="card text-muted">{copy.noCodex}</p>
              ) : (
                <TagFilter tags={tagsInUse(codex)} label={copy.tags}>
                  <div className="space-y-6">
                    {codexKinds.map((k) => {
                      const entries = codex.filter((e) => e.kind === k);
                      return (
                        <Group key={k} icon={CODEX_ICONS[k]} label={copy.codexKinds[k]} count={entries.length}>
                          <ul className="grid gap-2 lg:grid-cols-2">
                            {entries.map((e) => (
                              <CodexEntry key={e.id} entry={e} run={t.id} />
                            ))}
                          </ul>
                        </Group>
                      );
                    })}
                  </div>
                </TagFilter>
              ),
            sessions:
              sessions.length === 0 ? (
                <p className="card text-muted">{copy.noSessions}</p>
              ) : (
                <ul className="card divide-y divide-rule py-1">
                  {sessions.map((s) => (
                    <li key={s.id} className="flex items-center gap-2">
                      <Link href={s.url} className="flex flex-1 gap-3 py-2 hover:text-accent">
                        <span className="shrink-0 text-sm text-muted tabular-nums">{s.playedOn}</span>
                        <span>{s.summary}</span>
                      </Link>
                      <TalkAbout kind="session" id={s.id} name={s.playedOn} playthroughId={t.id} />
                    </li>
                  ))}
                </ul>
              ),
            // What the game is, and the player's own notes on it and on this run.
            notes: !hasNotes ? (
              <p className="card text-muted">{copy.noNotes}</p>
            ) : (
              <div className="card space-y-3">
                {(t.game.description || t.game.notes) && (
                  <div>
                    <h4 className="font-semibold">{t.game.title}</h4>
                    <Notes description={t.game.description} notes={t.game.notes} />
                  </div>
                )}
                {t.notes && (
                  <div>
                    <h4 className="font-semibold">{t.label}</h4>
                    <Notes notes={t.notes} />
                  </div>
                )}
              </div>
            ),
            // The sites the player keeps for the game, by trust (#58), then the sources kept on items and codex entries.
            sources: <Sources game={t.game} items={items} codex={codex} />,
            // How much Claude adds on its own, and what shows without asking (ADR 0016).
            settings: (
              <div className="card">
                <PlaythroughSettings playthroughId={t.id} settings={t.settings} />
              </div>
            ),
          }[tab]
        }
      </Register>
    </div>
  );
}

async function SessionCard({ session: s }: { session: { url: string; playedOn: string; summary: string; notes: string | null } }) {
  return (
    <Link href={s.url} className="card block hover:border-accent">
      <span className="text-sm text-muted">{s.playedOn}</span>
      <p>{s.summary}</p>
      <Notes notes={s.notes} />
    </Link>
  );
}

// The plan is a sequence: the goals in their order, then what was reached, quieter.
async function Goals({ goals, run }: { goals: Awaited<ReturnType<typeof buildOf>>["goals"]; run: string }) {
  const copy = await serverCopy();
  return (
    <ol className="card space-y-3">
      {goals.map((g) => {
        const measured = g.target !== null && g.current !== null;
        const share = measured ? Math.min(1, g.current! / g.target!) : g.status === "reached" ? 1 : 0;
        return (
          <li key={g.id} className={`goal ${g.status === "reached" ? "goal-reached" : ""} ${g.suggested ? "goal-suggested" : ""}`}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-semibold">
                {g.kind === "stat" && g.stat ? (
                  <>
                    {g.stat.name} {g.target}
                    {g.stat.localName && <span className="text-sm font-normal text-muted"> · {g.stat.localName}</span>}
                  </>
                ) : g.kind === "level" ? (
                  copy.level(g.target ?? 0)
                ) : g.item ? (
                  <a href={g.item.url} className="text-accent">
                    {g.item.name}
                  </a>
                ) : (
                  g.text
                )}
              </span>
              <span className="ml-auto shrink-0 text-sm text-muted tabular-nums">
                {g.status === "reached" && g.reachedOn
                  ? copy.reachedOn(g.reachedOn)
                  : g.suggested
                    ? copy.suggested
                    : measured
                      ? copy.goalProgress(g.current!, g.target!)
                      : ""}
              </span>
              <TalkAbout
                kind="goal"
                id={g.id}
                name={g.stat ? `${g.stat.name} ${g.target}` : (g.item?.name ?? g.text ?? copy.goals)}
                playthroughId={run}
                small
              />
            </div>
            {g.kind !== "note" && g.text && <p className="text-sm text-muted">{g.text}</p>}
            <Notes notes={g.notes} />
            {(measured || g.status === "reached") && (
              <div className="goal-track" role="presentation">
                <div className="goal-fill" style={{ width: `${share * 100}%` }} />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

async function Quests({ quests, run }: { quests: QuestView[]; run: string }) {
  const copy = await serverCopy();
  return (
    <ul className="space-y-2">
      {quests.map((q) => (
        <li key={q.id} id={`quest-${q.id}`} className="card" {...tagData(q.tags)}>
          <div className="card-head">
            <Tile icon={QUEST_ICONS[q.status]} muted={q.status !== "open" && q.status !== "done"} done={q.status === "done"} />
            <span className="flex-1 font-semibold">
              {q.name}
              {q.localName && <span className="font-normal text-muted"> · {q.localName}</span>}
            </span>
            <span className={`shrink-0 text-sm ${q.status === "done" ? "font-semibold text-signal" : "text-muted"}`}>
              {q.status === "blocked" ? copy.waitingOnGame : copy.questStatus[q.status]}
            </span>
            <TalkAbout kind="quest" id={q.id} name={q.name} playthroughId={run} />
          </div>
          {(q.giver || q.location) && <p className="text-sm text-muted">{[q.giver, q.location].filter(Boolean).join(" · ")}</p>}
          <Tags tags={q.tags} />
          <Notes description={q.description} notes={q.notes} />
          <Background lines={q.background} />
          <LinkedTodos todos={q.todos} run={run} />
          {q.entries.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm">
              {q.entries.map((e) => (
                <li key={e.id} className={e.spoiler === "none" ? "" : "text-hint"}>
                  {e.on && <span className="text-muted tabular-nums">{e.on} </span>}
                  {e.spoiler !== "none" && <span className="font-bold">{copy.spoilerTag[e.spoiler]}: </span>}
                  {copy.entryKind[e.kind]}
                  {e.text} <TalkAbout kind="entry" id={e.id} name={`${q.name}, ${e.on ?? ""}`.replace(/, $/, "")} playthroughId={run} small />
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

// `data-tags` for a card the tag row (components/TagFilter.tsx) filters: its tags, as JSON.
const tagData = (tags: string[]) => ({ "data-tags": JSON.stringify(tags) });

// A card's tags (ADR 0014), small, after what says where it is.
function Tags({ tags }: { tags: string[] }) {
  return (
    tags.length > 0 && (
      <ul className="card-tags">
        {tags.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    )
  );
}

// What Claude added about a card (ADR 0016), as far as the spoiler setting goes: each line marked when it is a hint or a spoiler, with
// its source.
async function Background({ lines }: { lines: BackgroundLine[] }) {
  const copy = await serverCopy();
  return (
    lines.length > 0 && (
      <ul className="background" aria-label={copy.backgroundLines}>
        {lines.map((l) => (
          <li key={l.id} className={l.spoiler === "none" ? "" : "text-hint"}>
            {l.spoiler !== "none" && <span className="font-bold">{copy.spoilerTag[l.spoiler]}: </span>}
            {l.text}
            {l.source && (
              <>
                {" "}
                <a href={l.source.url} className="text-accent" target="_blank" rel="noopener noreferrer">
                  {l.source.title || siteOf(l.source.url)}
                </a>
                {l.source.trust === "low" && <span className="text-muted"> ({copy.trustLevel.low})</span>}
              </>
            )}
          </li>
        ))}
      </ul>
    )
  );
}

// One thing in the inventory: its count, its numbers as the game shows them, and what it is good against.
async function Item({ item: i, run }: { item: ItemView; run: string }) {
  const copy = await serverCopy();
  const numbers = Object.entries(i.attributes);
  return (
    <li id={`item-${i.id}`} className="card" {...tagData(i.tags)}>
      <div className="card-head">
        <Tile icon={itemIcon(i.kind)} />
        <span className="flex-1 font-semibold">
          {i.name}
          {i.localName && <span className="font-normal text-muted"> · {i.localName}</span>}
        </span>
        <span className="flex shrink-0 items-baseline gap-2">
          {i.quantity !== null && <span className="font-semibold tabular-nums">{copy.quantity(i.quantity)}</span>}
          {i.equipped && <span className="text-sm font-semibold text-accent">{copy.equipped}</span>}
        </span>
        <TalkAbout kind="item" id={i.id} name={i.name} playthroughId={run} />
      </div>
      {i.location && <p className="text-sm text-muted">{i.location}</p>}
      <Tags tags={i.tags} />
      {numbers.length > 0 && (
        <dl className="numbers">
          {numbers.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {EFFECTS.map((effect) => {
        const list = i.against.filter((a) => a.effect === effect);
        return (
          list.length > 0 && (
            <p key={effect} className="mt-1 text-sm">
              <span className="text-muted">{copy.against[effect]}: </span>
              {list.map((a, n) => (
                <span key={a.codex.id}>
                  {n > 0 && ", "}
                  <a href={a.codex.url} className="text-accent">
                    {a.codex.name}
                  </a>
                  {a.note && <span className="text-muted"> ({a.note})</span>}
                </span>
              ))}
            </p>
          )
        );
      })}
      <Notes description={i.description} />
      <Background lines={i.background} />
      <LinkedTodos todos={i.todos} run={run} />
      {i.verdict && <p className="mt-1 text-sm">{i.verdict}</p>}
      <Notes notes={i.notes} />
      {i.sources.length > 0 && (
        <ul className="mt-1 space-y-0.5 text-sm text-muted">
          {i.sources.map((x) => (
            <li key={x.url}>
              {x.facts && <span>{x.facts} · </span>}
              <a href={x.url} className="text-accent" target="_blank" rel="noopener noreferrer">
                {x.title ?? siteOf(x.url)}
              </a>
              {x.on && <span className="tabular-nums"> · {x.on}</span>}
              <span> · {copy.trustLevel[x.trust]}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

// A boss, enemy, NPC or place: what is still in the way stands out, what is beaten or gone is quieter.
async function CodexEntry({ entry: e, run }: { entry: CodexView; run: string }) {
  const copy = await serverCopy();
  const state =
    e.status === "beaten" ? (e.beatenOn ? copy.beatenOn(e.beatenOn) : null) : e.status === "gone" ? copy.gone : e.attempts ? copy.tries(e.attempts) : null;
  return (
    <li id={`codex-${e.id}`} className={`card ${e.status === "met" ? "" : "opacity-70"}`} {...tagData(e.tags)}>
      <div className="card-head">
        <Tile icon={CODEX_ICONS[e.kind]} muted={e.status !== "met"} />
        <span className="flex-1 font-semibold">
          {e.name}
          {e.localName && <span className="font-normal text-muted"> · {e.localName}</span>}
        </span>
        {state && <span className={`shrink-0 text-sm tabular-nums ${e.status === "met" ? "text-accent" : "text-muted"}`}>{state}</span>}
        <TalkAbout kind="codex" id={e.id} name={e.name} playthroughId={run} />
      </div>
      {e.location && <p className="text-sm text-muted">{e.location}</p>}
      <Tags tags={e.tags} />
      {(e.weaknesses.length > 0 || e.resistances.length > 0) && (
        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {e.weaknesses.length > 0 && (
            <span>
              <span className="text-muted">{copy.weakTo}: </span>
              {e.weaknesses.join(", ")}
            </span>
          )}
          {e.resistances.length > 0 && (
            <span>
              <span className="text-muted">{copy.resists}: </span>
              {e.resistances.join(", ")}
            </span>
          )}
        </p>
      )}
      <Notes description={e.description} />
      <Background lines={e.background} />
      <LinkedTodos todos={e.todos} run={run} />
      {e.strategy && <p className="mt-1 text-sm">{e.strategy}</p>}
      <Notes notes={e.notes} />
      {EFFECTS.map((effect) => {
        const list = e.counters.filter((c) => c.effect === effect);
        return (
          list.length > 0 && (
            <p key={effect} className="mt-1 text-sm">
              <span className="text-muted">{copy.counters[effect]}: </span>
              {list.map((c, n) => (
                <span key={c.item.id}>
                  {n > 0 && ", "}
                  <a href={c.item.url} className="text-accent">
                    {c.item.name}
                  </a>
                  {c.item.quantity !== null && <span className="tabular-nums"> {copy.quantity(c.item.quantity)}</span>}
                  {c.note && <span className="text-muted"> ({c.note})</span>}
                </span>
              ))}
            </p>
          )
        );
      })}
      {e.sources.length > 0 && (
        <p className="mt-1 text-sm text-muted">
          {e.sources.map((x, n) => (
            <span key={x.url}>
              {n > 0 && " · "}
              <a href={x.url} className="text-accent" target="_blank" rel="noopener noreferrer">
                {x.title ?? siteOf(x.url)}
              </a>{" "}
              ({copy.trustLevel[x.trust]})
            </span>
          ))}
        </p>
      )}
    </li>
  );
}

// The to-do list (ADR 0020): the player's open to-dos with a checkbox each, Claude's suggestions apart and marked, and the done and
// dropped ones folded away below.
async function Todos({ todos }: { todos: TodoView[] }) {
  const copy = await serverCopy();
  const mine = todos.filter((t) => t.status === "open" && !t.suggested);
  const suggested = todos.filter((t) => t.status === "open" && t.suggested);
  const closed = todos.filter((t) => t.status !== "open");
  if (!todos.length) return <p className="card text-muted">{copy.noTodos}</p>;
  return (
    <div className="space-y-6">
      <section>
        <Heading icon={PART_ICONS.todos}>{copy.todos}</Heading>
        {mine.length === 0 ? <p className="card text-muted">{copy.noTodos}</p> : <TodoList todos={mine} />}
      </section>
      {suggested.length > 0 && (
        <section>
          <Heading icon={Sparkles}>{copy.suggestedTodos}</Heading>
          <p className="mb-2 text-sm text-muted">{copy.suggestedTodosLead}</p>
          <TodoList todos={suggested} suggested />
        </section>
      )}
      {closed.length > 0 && (
        <details className="card">
          <summary className="cursor-pointer font-semibold">{copy.closedTodos(closed.length)}</summary>
          <TodoList todos={closed} />
        </details>
      )}
    </div>
  );
}

async function TodoList({ todos, suggested }: { todos: TodoView[]; suggested?: boolean }) {
  const copy = await serverCopy();
  return (
    <ul className={`card divide-y divide-rule py-1 ${suggested ? "border-dashed" : ""}`}>
      {todos.map((t) => (
        <li key={t.id} id={`todo-${t.id}`} className="todo">
          {t.status === "dropped" ? (
            <span className="mt-1 size-5 shrink-0" aria-hidden="true" />
          ) : (
            <TodoCheck id={t.id} done={t.status === "done"} label={t.text} />
          )}
          <span className="min-w-0 flex-1">
            <span className={t.status === "open" ? "" : "todo-done"}>{t.text}</span>
            {t.localText && <span className="text-sm text-muted"> · {t.localText}</span>}
            {t.about && (
              <Link href={t.about.url} className="block text-sm text-accent">
                {t.about.name}
              </Link>
            )}
          </span>
          {(t.suggested || t.status !== "open") && (
            <span className="shrink-0 text-sm text-muted">{t.status !== "open" ? copy.todoStatus[t.status] : copy.suggested}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

// The open to-dos about a quest, item or codex entry ("what's left to do here?"), each a link to its row on the To-dos tab.
async function LinkedTodos({ todos, run }: { todos: { id: string; text: string; suggested: boolean }[]; run: string }) {
  const copy = await serverCopy();
  return (
    todos.length > 0 && (
      <p className="mt-1 text-sm">
        <span className="text-muted">{copy.todos}: </span>
        {todos.map((t, n) => (
          <span key={t.id}>
            {n > 0 && ", "}
            <Link href={todoPath(run, t.id)} className="text-accent">
              {t.text}
            </Link>
            {t.suggested && <span className="text-muted"> ({copy.suggested})</span>}
          </span>
        ))}
      </p>
    )
  );
}

// The Sources tab (#58): the game's sources grouped by trust, high first, each with its trust in words (never colour alone), its facts
// and the day it was kept; below them the sources on items and codex entries, each naming what it belongs to.
async function Sources({ game, items, codex }: { game: PlaythroughView["game"]; items: ItemView[]; codex: CodexView[] }) {
  const copy = await serverCopy();
  const rows = [
    ...items.flatMap((i) => i.sources.map((x) => ({ source: x, owner: { name: i.name, url: i.url } }))),
    ...codex.flatMap((e) => e.sources.map((x) => ({ source: x, owner: { name: e.name, url: e.url } }))),
  ].sort((a, b) => TRUST_LEVELS.indexOf(a.source.trust) - TRUST_LEVELS.indexOf(b.source.trust));
  if (!game.sources.length && !rows.length) return <p className="card text-muted">{copy.noSources}</p>;
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">{copy.sourcesLead}</p>
      {TRUST_LEVELS.map((level) => {
        const list = game.sources.filter((x) => x.trust === level);
        return (
          list.length > 0 && (
            <section key={level}>
              <Heading icon={PART_ICONS.sources}>{copy.trustLevel[level]}</Heading>
              <p className="mb-2 text-sm text-muted">{copy.trustHint[level]}</p>
              <ul className="card divide-y divide-rule py-1">
                {list.map((x) => (
                  <li key={x.url} className="py-2">
                    <a href={x.url} className="font-semibold text-accent" target="_blank" rel="noopener noreferrer">
                      {x.title ?? siteOf(x.url)}
                    </a>
                    <span className="text-sm text-muted">
                      {" "}
                      · {copy.trustLevel[x.trust]}
                      {x.on && <span className="tabular-nums"> · {copy.keptSince(x.on)}</span>}
                    </span>
                    {x.facts && <p className="text-sm text-muted">{x.facts}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )
        );
      })}
      {rows.length > 0 && (
        <section>
          <Heading icon={PART_ICONS.items}>{copy.rowSources}</Heading>
          <ul className="card divide-y divide-rule py-1">
            {rows.map(({ source: x, owner }) => (
              <li key={`${owner.url} ${x.url}`} className="py-2 text-sm">
                <Link href={owner.url} className="font-semibold hover:text-accent">
                  {owner.name}
                </Link>
                {": "}
                <a href={x.url} className="text-accent" target="_blank" rel="noopener noreferrer">
                  {x.title ?? siteOf(x.url)}
                </a>
                <span className="text-muted">
                  {" "}
                  · {copy.trustLevel[x.trust]}
                  {x.on && <span className="tabular-nums"> · {copy.keptSince(x.on)}</span>}
                </span>
                {x.facts && <p className="text-muted">{x.facts}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// The Overview (#79): the web version of MCP's briefing, from the same read and in the same order (BRIEFING_SECTIONS): where the player
// left off, the next steps, the to-dos, the plan, what is in the way and what is equipped. At the playthrough's spoiler setting, never
// above it: a briefing never asks.
async function Overview({ player, playthrough: t }: { player: Player; playthrough: PlaythroughView }) {
  const copy = await serverCopy();
  const b = await briefing(player, { playthroughId: t.id });
  const goals = b.build.goals.filter((g) => g.status === "open");
  const sections: Record<(typeof BRIEFING_SECTIONS)[number], ReactNode> = {
    lastSession: b.lastSession && (
      <section key="lastSession">
        <Heading icon={CalendarDays}>{copy.lastSession}</Heading>
        <SessionCard session={b.lastSession} />
      </section>
    ),
    openQuests: (
      <section key="openQuests">
        <Heading icon={Footprints}>{copy.nextSteps}</Heading>
        {b.openQuests.length === 0 ? (
          <p className="card text-muted">{copy.noOpenQuests}</p>
        ) : (
          <ul className="card divide-y divide-rule py-1">
            {b.openQuests.map((q) => (
              <li key={q.id}>
                <Link href={q.url} className="flex items-center gap-3 py-2 hover:text-accent">
                  <Tile icon={QUEST_ICONS[q.status]} muted={q.status === "blocked"} />
                  <span className="min-w-0">
                    <span className="font-semibold">{q.name}</span>
                    {q.status === "blocked" ? (
                      <span className="block text-sm text-muted">{copy.waitingOnGame}</span>
                    ) : (
                      q.nextStep && <span className="block text-sm">{q.nextStep}</span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    ),
    todos: b.todos.length > 0 && (
      <section key="todos">
        <Heading icon={PART_ICONS.todos}>{copy.todos}</Heading>
        <TodoList todos={b.todos} />
      </section>
    ),
    suggestedTodos: b.suggestedTodos.length > 0 && (
      <section key="suggestedTodos">
        <Heading icon={Sparkles}>{copy.suggestedTodos}</Heading>
        <TodoList todos={b.suggestedTodos} suggested />
      </section>
    ),
    goals: goals.length > 0 && (
      <section key="goals">
        <Heading icon={Crosshair}>{copy.goals}</Heading>
        <Goals goals={goals} run={t.id} />
      </section>
    ),
    bosses: b.bosses.length > 0 && (
      <section key="bosses">
        <Heading icon={CODEX_ICONS.boss}>{copy.inTheWay}</Heading>
        <ul className="card divide-y divide-rule py-1">
          {b.bosses.map((x) => (
            <li key={x.id}>
              <Link href={x.url} className="flex items-center gap-3 py-2 hover:text-accent">
                <Tile icon={CODEX_ICONS.boss} />
                <span className="flex-1 font-semibold">{x.name}</span>
                {x.attempts ? <span className="text-sm text-muted tabular-nums">{copy.tries(x.attempts)}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    ),
    equipped: b.equipped.length > 0 && (
      <section key="equipped">
        <Heading icon={Sword}>{copy.equipped}</Heading>
        <ul className="card divide-y divide-rule py-1">
          {b.equipped.map((i) => (
            <li key={i.id}>
              <Link href={i.url} className="flex items-center gap-3 py-2 hover:text-accent">
                <Tile icon={itemIcon(i.kind)} />
                <span className="flex-1 font-semibold">
                  {i.name}
                  {i.localName && <span className="font-normal text-muted"> · {i.localName}</span>}
                </span>
                {i.quantity !== null && <span className="tabular-nums">{copy.quantity(i.quantity)}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    ),
  };
  return <div className="space-y-6">{BRIEFING_SECTIONS.map((s) => sections[s])}</div>;
}
