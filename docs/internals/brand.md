# Brand

What Gamepanion looks and sounds like, and how to use it. The decision behind it is ADR 0018; the values it serves are on [What Gamepanion stands for](../values.md).

## The idea

**Gamepanion is a companion.** The player talks to it while they play, through Claude or the in-app chat, and it files what they say. The web app is the human view into what was filed. There is no book, almanac or pause menu as a picture: the app is just Gamepanion.

## Name and words

* **Gamepanion**, one word, capital G. Each player has their own: "your Gamepanion" (German: "dein Gamepanion").
* **Slogan:** Play on. Your Gamepanion remembers. — *Spiel weiter. Dein Gamepanion merkt es sich.*
* **Plain line** (meta description, README, docs): A spoiler-free companion for the games you play. — *Ein spoilerfreier Begleiter für die Spiele, die du spielst.*
* "Quest log" names only the quests part (German "Questlog"), never the product.
* Avoid: questlog as a name, almanac, book, tracker.

## Voice

* Short, plain, second person: "Where was I?", "Open threads", "Did I miss anything?".
* Gamepanion is spoken of, never speaks: no "we", no "I". In the chat, "I" is Claude, using Gamepanion's tools; Gamepanion has no persona.
* Say what the player told it; never hint at what they haven't found (V1).
* No exclamation marks, no hype. English and German say the same thing in their own idiom.

## Logo

![The Gamepanion icon](brand/icon.svg){ width="96" } ![The flat icon](brand/icon-flat.svg){ width="48" }

* **Icon:** a violet speech bubble with sharp corners holding a blocky G in the darkest violet, with a lime offset shadow. Below 48 px it is drawn flat, without the shadow (`icon-flat.svg`, also the favicon). App icons put it on the near-black ground, maskable ones inside the safe zone.
* **Wordmark:** "Gamepanion" in Atkinson Hyperlegible Next 800, tight (-0.035em). "Game" in the text colour, "panion" in the soft violet `#C9B4FF` on dark and `#6B3FD6` on light. The wordmark is the one place the violet may appear on every page.
* **Lockup:** icon left of the wordmark, the gap a quarter of the icon's width.
* Don't: recolour the icon, put it on violet, outline the wordmark, set it in capitals, or add a glow.

## Colour

Dark first; the light theme follows the system setting.

| Role | Dark | Light | Use |
|---|---|---|---|
| Ground | `#0C0B10` | `#F7F6FA` | page |
| Surface | `#17151F` | white | panels, inputs, the active nav row |
| Text | `#F2F0F7` (17.35:1) | `#14121A` (17.25:1) | everything you read |
| Muted | `#A49FB4` (7.65:1) | `#5A556A` (6.63:1) | captions, metadata |
| Border | `#2E2A3A` | | structure only |
| Accent violet | `#A77BFF` (6.46:1) | `#6B3FD6` (5.90:1) | primary button, one headline phrase, the offset shadow: at most two uses per screen |
| Signal lime | `#C6F432` (15.30:1) | | "done", section eyebrows; sparingly, never next to violet in the same element |

* **The register's tabs** keep the Okabe-Ito colours and always their names: Quests orange `#E69F00`, Build sky blue `#56B4E9`, Items bluish green `#009E73`, Codex reddish purple `#CC79A7`.
* **Status** pairs a word or icon with its colour (○ Open, ✓ Done); colour is never the only meaning.

## Type

* **Atkinson Hyperlegible Next**, served by the app: display 800, uppercase and tight for the big headlines; body 400 at 16 px with 1.5 leading; buttons 800, uppercase, 0.06em.
* **Atkinson Hyperlegible Mono** for HUD labels, counts and tags, uppercase with 0.08em tracking.
* Scale: 12 · 14 · 16 · 18 · 22 · 30 · 48 · 80 px.

## Shape and imagery

* Sharp corners (0, 2 and 4 px); round only for avatars.
* Elevation is a hard offset shadow, 4 px right and down, in violet for cards and in the text colour for the primary button. No blurred glows, no gradients.
* **Games are generated tiles:** their initials in Atkinson 800 on a colour from a hash of the name (45% saturation, 30% lightness, so white initials keep 4.5:1 on every hue). No cover art.
* Icons are simple line icons with a 2 px stroke.

## Where the tokens live

`app/globals.css` holds the app's tokens once #68 ports the look into the app. The design system the look was made with, `.open-design/design-systems/visual-identity-for-gamepanion-a-companion-for-t/` (`DESIGN.md`, `tokens.css`), is what new designs start from.
