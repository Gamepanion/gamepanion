// The pictures of the book (lucide): one per part of a playthrough's page, per inventory group, per kind of codex entry and per quest
// status. An icon only ever repeats what a word next to it says, so it is hidden from screen readers (aria-hidden, lucide's default).
import {
  SlidersHorizontal,
  Backpack,
  BookOpen,
  CalendarDays,
  ChevronDown,
  CircleCheck,
  CircleDot,
  CircleSlash,
  CircleX,
  Compass,
  FlaskConical,
  Gem,
  Hammer,
  Hourglass,
  KeyRound,
  Link2,
  ListTodo,
  MapPin,
  NotebookPen,
  Package,
  ScrollText,
  Shield,
  Skull,
  Star,
  Sword,
  Swords,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

export type { LucideIcon };

export const PART_ICONS: Record<string, LucideIcon> = {
  overview: Compass,
  character: UserRound,
  quests: ScrollText,
  todos: ListTodo,
  items: Backpack,
  codex: BookOpen,
  sessions: CalendarDays,
  notes: NotebookPen,
  references: Link2,
  settings: SlidersHorizontal,
};

// By the keys Gamepanion suggests (backend ITEM_KINDS) and a few a game may use; any other group gets the box.
const ITEM_ICONS: Record<string, LucideIcon> = {
  weapon: Sword,
  armour: Shield,
  armor: Shield,
  shield: Shield,
  amulet: Gem,
  ring: Gem,
  talisman: Gem,
  consumable: FlaskConical,
  material: Hammer,
  collectible: Star,
  key: KeyRound,
};
export const itemIcon = (kind: string | null): LucideIcon => (kind && ITEM_ICONS[kind]) || Package;

export const CODEX_ICONS: Record<string, LucideIcon> = { boss: Skull, enemy: Swords, npc: UserRound, place: MapPin };

export const QUEST_ICONS: Record<string, LucideIcon> = { open: CircleDot, blocked: Hourglass, done: CircleCheck, failed: CircleX, dropped: CircleSlash };

/** A part of a tab, folding: every tab shows its content in these (open quests, weapons, bosses, goals, sessions, settings), so the
 * register reads the same everywhere. Its band is a native disclosure (keyboard and screen readers know it), larger than a tag chip,
 * with how many it holds where it holds a list (under a tag, how many of those; components/TagFilter.tsx) and a chevron that turns when
 * it folds. Open to start with, unless `open` is false (what is done). */
export function Group({
  icon: Icon,
  label,
  count,
  open = true,
  children,
}: {
  icon: LucideIcon;
  label: ReactNode;
  count?: number;
  open?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={open} className="group-fold" data-tag-scope>
      <summary className="group-heading">
        <Icon aria-hidden="true" />
        <h3 className="flex-1">{label}</h3>
        {count !== undefined && (
          <span className="group-count" data-tag-count={count}>
            {count}
          </span>
        )}
        <ChevronDown aria-hidden="true" className="group-chevron" />
      </summary>
      {children}
    </details>
  );
}

/** The tile at the start of a card: what kind of thing the card is. */
export function Tile({ icon: Icon, muted = false, done = false }: { icon: LucideIcon; muted?: boolean; done?: boolean }) {
  return (
    <span className={`tile ${muted ? "tile-muted" : ""} ${done ? "tile-done" : ""}`}>
      <Icon aria-hidden="true" />
    </span>
  );
}
