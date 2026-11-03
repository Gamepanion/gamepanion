# Design System Inspired by Violet arcade

> Category: Gaming & Entertainment
> Gamepanion's look: near-black ground, one violet accent, a lime signal for what's done, heavy tight Atkinson Hyperlegible headlines and sharp edges. Energetic and gamer-coded, never mistakable for the cold blue game trackers.

## Color Palette

Dark first; the light theme is kept for players whose system asks for it.

- **bg `#0C0B10`**: near-black page ground with a faint violet cast. fg on it 17.35:1.
- **surface `#17151F`**: lifted panels, the active nav row, cards, inputs. fg on it 15.97:1.
- **fg `#F2F0F7`**: primary text, the secondary button's outline.
- **muted `#A49FB4`**: captions, metadata, inactive nav, open-status labels. 7.65:1 on bg.
- **border `#2E2A3A`**: hairline structure between rows and around the frame (1.41:1, structure only, never a control's only edge).
- **accent `#A77BFF`**: violet. The one brand hit: the primary button, one headline phrase, the hard offset shadow. At most two visible uses per screen. 6.46:1 on bg; text on it uses **accent-on `#12082A`** (6.33:1). Hover **`#BC9BFF`**.
- **signal `#C6F432`**: lime, used sparingly for "done" and the eyebrow that names a section. 15.30:1 on bg. Never next to the violet in the same element.
- **Status:** success `#009E73`, warn `#E69F00`, danger `#D55E00`, taken from Okabe-Ito so they survive colour blindness.
- **Register tabs** keep the Okabe-Ito colours with their names: Quests orange `#E69F00`, Build sky blue `#56B4E9`, Items bluish green `#009E73`, Codex reddish purple `#CC79A7`. The colour is a 4px left edge; the name is always written.
- **Light theme:** bg `#F7F6FA`, fg `#14121A` (17.25:1), accent text `#6B3FD6` (5.90:1).

## Typography

- **Atkinson Hyperlegible Next** for display and body, chosen for legibility (the accessibility rule). Display at weight 800, body at 400, labels and buttons at 600–800.
- **Atkinson Hyperlegible Mono** for HUD labels, metadata, counts and tags, uppercase with 0.08em tracking.
- Scale: 12 · 14 · 16 · 18 · 22 · 30 · 48 · 80 px. Display (48–80) is uppercase with -0.035em tracking and 0.92 leading; body 16 at 1.5.
- Buttons are uppercase, weight 800, 0.06em tracking.

## Voice & Tone

Short, punchy, second person, like a companion at your shoulder: "Play on. We'll remember." "Where was I?" "Open threads." It states what the player told it and never hints at what they haven't found (V1). No exclamation marks, no hype; English and German say the same thing in their own idiom.

## Imagery & Iconography

No game cover art. Each game is a **generated tile**: its initials in Atkinson 800 on a colour derived from its name (hue from a hash, ~45% saturation, ~34% lightness, so white initials stay readable). Icons are simple line icons at 2px stroke; status always pairs an icon or word with its colour (○ Open, ✓ Done).

## Layout & Spacing

- Sharp: radius 0 / 2 / 4, pill only for avatars.
- Elevation is a **hard offset shadow** (4px 4px 0) in violet for cards, in fg for the primary button. No blur glows.
- A left **rail** carries the wordmark, the register tabs and the games; content sits right of a hairline divider. On phones the rail stacks on top.
- Rows are bordered lists that share their borders (no gaps), inputs are filled with surface and underlined in muted.
- Container 1200px; gutters 32 / 24 / 16; section spacing 40 / 32 / 24.

## Agent Prompt Guide

Build Gamepanion screens on the near-black ground with fg text, one violet accent used at most twice per screen (primary button plus one headline phrase or offset shadow), and lime only for "done" or a section eyebrow. Set headlines in Atkinson Hyperlegible Next 800, uppercase and tight; HUD labels in Atkinson Hyperlegible Mono caps. Keep corners sharp and elevation as a hard offset shadow. Show games as generated initial tiles, never cover art. Register tabs carry their Okabe-Ito colour as a left edge and always their name. Never show anything the player hasn't found.
