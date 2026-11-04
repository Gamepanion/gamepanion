// A game's tile (ADR 0018): its initials on a colour taken from its name, in place of cover art, which Gamepanion never fetches
// (ADR 0008). The same name always gets the same colour; the lightness keeps white initials readable on every hue.

/** Up to two initials: the first letters of the first two words that start with a capital or a digit ("Lies of P": LP), else of the
 * first two words; the first two letters of a one-word name. */
export function initials(title: string): string {
  const words = title.match(/[\p{L}\p{N}]+/gu) ?? [];
  const named = words.filter((w) => /^[\p{Lu}\p{N}]/u.test(w));
  const [first, second] = named.length ? named : words;
  if (!first) return "?";
  if (!second) return first.slice(0, 2).toUpperCase();
  return (first[0] + second[0]).toUpperCase();
}

/** A hue from 0 to 359, the same for the same name. */
export function hueOf(title: string): number {
  let h = 0;
  for (const ch of title) h = (h * 31 + ch.codePointAt(0)!) % 360;
  return h;
}

// The box, and the initials' size (on the initials alone: the tile itself keeps the font of the text beside it, which .icon-middle measures).
const SIZES = { sm: ["h-7 w-7", "text-xs"], md: ["h-10 w-10", "text-base"], lg: ["h-14 w-14", "text-xl"] } as const;

export function GameTile({ title, size = "md", className = "" }: { title: string; size?: keyof typeof SIZES; className?: string }) {
  return (
    <span aria-hidden="true" className={`game-tile shrink-0 ${SIZES[size][0]} ${className}`} style={{ background: `hsl(${hueOf(title)} 45% 30%)` }}>
      <span className={`game-tile-initials ${SIZES[size][1]}`}>{initials(title)}</span>
    </span>
  );
}
