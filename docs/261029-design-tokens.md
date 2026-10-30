# Design tokens

Both apps and `@repo/ui` take every colour, size, corner, shadow and layer from one file,
`packages/tailwind-config/shared-styles.css`. This note says what is there, which token to
reach for, and what to do with a value that has none.

## Where they live

- **One file.** Each token is a plain custom property (`--brand`, `--muted`, `--card-radius`),
  and an `@theme inline` block turns it into a utility (`bg-brand`, `text-muted`,
  `rounded-card`). `@repo/ui` is built with the `ui:` prefix and reads the same properties
  (`ui:border-edge`); inline styles and Clerk's theme read them by name (`var(--danger)`).
- **Two looks.** Colours are the same in both apps. Shape differs: the customer site is
  rounder and softer, the console tighter. Each app names itself on `<html>`
  (`data-app="site"` or `data-app="console"`) and the file sets its values. The defaults
  under `:root` are the console's.
- **No dark theme.** The site declares `color-scheme: light`.

## Colours

| Token                                                                       | Use                                                                                     |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `brand`, `brand-strong`, `brand-tint`                                       | Primary actions, links, prices; hover; a selected wash                                  |
| `navy`, `ink`, `azure`, `azure-light`, `mist`                               | The site's menus and bands, headings, accents, words on navy, pale sections             |
| `canvas`                                                                    | The page behind the cards: mist in the console, slate-50 on the site                    |
| `body`                                                                      | The text of a page                                                                      |
| `muted`                                                                     | Words that step back: meta, a column's name, a placeholder. 5:1 on white, 4.6:1 on mist |
| `edge`                                                                      | A control's edge: a field, a button, the picker                                         |
| `edge-strong`                                                               | The edge of a box you tick or flip, and an off switch: 3:1 on white                     |
| `card-edge`, `hairline`                                                     | A card's edge; the line between a card's rows                                           |
| `shade`, `hover`                                                            | A heading row or quiet chip; a row under the pointer                                    |
| `slot`                                                                      | The dashed edge of an empty slot                                                        |
| `danger`, `danger-strong`, `danger-edge`, `danger-tint`                     | Errors, deleting, expired                                                               |
| `warning`, `warning-strong`, `warning-edge`, `warning-soft`, `warning-tint` | Waiting on someone, a notice                                                            |
| `success`, `success-tint`                                                   | Done, saved                                                                             |
| `danger-dot`, `warning-dot`, `success-dot`                                  | A status's disc of a few pixels, brighter than its words (`StatusDot`)                  |
| `ring`, `ring-on-dark`                                                      | The keyboard's ring, and on navy or ink                                                 |

Every grey is one of these roles: no class names Tailwind's palette (`slate-…`,
`amber-…`) any more. The two exceptions copy colours that are not ours: the zone map's
legend (the map's own strokes) and the page editor's Google preview (Google's link blue).
Never type a hex value or `rgb()` in a class.

## Type

DM Serif Display for titles and figures (`font-serif`), DM Sans for the rest (`font-sans`).
Tailwind's steps (`text-xs` 12px, `text-sm` 14px, `text-base` 16px, `text-lg` 18px,
`text-xl` 20px, `text-2xl` 24px, `text-3xl` 30px…) plus the ones both apps had typed by hand:

| Token                                                | Size        | Use                                                       |
| ---------------------------------------------------- | ----------- | --------------------------------------------------------- |
| `text-2xs`                                           | 11px        | Small capitals over a column, a menu group, a chip's word |
| `text-caption`                                       | 13px        | A meta line under a name, a card's aside                  |
| `text-copy`                                          | 15px        | Reading text on the site, a card's title in the console   |
| `text-lead`                                          | 17px        | The line under a page's title on the site                 |
| `text-figure`                                        | 28px        | A figure in a tile                                        |
| `text-title`                                         | 34px        | The console's page title on a wide screen                 |
| `text-heading`                                       | 1.6–2.15rem | The site's section headings                               |
| `text-display-sm`, `text-display`, `text-display-lg` | 2.2–4.6rem  | The site's page titles, growing with the screen           |
| `text-hero`                                          | 3.75–6.5rem | The home page's opening words                             |

The new sizes set no line height, so they keep the one around them, as typed sizes did.
`leading-display` (1.1) sets a big title tight.

Letter spacing: `tracking-title` (−0.01em) for a bold title, `tracking-caps` (0.06em) for
small capitals, `tracking-kicker` (0.08em) for the console's page kicker,
`tracking-eyebrow` (0.18em) for the site's eyebrow over a section. The `text-caps`
utility is size, spacing and capitals in one: `text-caps font-semibold text-muted`.

## Corners, shadows, layers

| Token                                         | Console      | Site            | Use                                                               |
| --------------------------------------------- | ------------ | --------------- | ----------------------------------------------------------------- |
| `rounded-control`                             | 10px         | 14px            | Buttons and fields                                                |
| `rounded-card`                                | 14px         | 18px            | Cards and tiles                                                   |
| `rounded-panel`                               | 14px         | 22px            | The site's big panels: the search card                            |
| `rounded-popover`                             | 12px         | 16px            | Menus, lists, dialogs, toasts                                     |
| `shadow-card`                                 | soft navy    | the home page's | A card on the canvas                                              |
| `shadow-raised`                               |              |                 | A card under the pointer, a pinned bar                            |
| `shadow-panel`                                |              |                 | A big panel over a photo                                          |
| `shadow-bar`                                  |              |                 | A bar held at the top                                             |
| `shadow-overlay`                              | same in both |                 | A dialog, sheet, palette, the phone's panel and dock              |
| `shadow-cta`                                  | none         | a blue glow     | The primary button (`Button` adds it)                             |
| `shadow-control`, `shadow-band`, `shadow-map` | same in both |                 | A control on the canvas, the dashboard's band, a control on a map |

Layers, for `z-(--layer-…)`: `raised` 1, `overlap` 2 (the hero's search card, whose
place list opens over the sections below), `sticky` 10, `float` 20, `chrome` 30 (the
header, the dock), `staff` 40 (the site's preview bar), `popover` 50. Dialogs and
sheets are native `<dialog>`s in the top layer, above all of them. A part with its own
stack (a map's buttons, the rate grid's sticky head) is wrapped in `isolate`, so its
layers stay inside it; small local numbers there are fine.

`--header-height` is the bar held at the top: the console's top bar (64px, 72px from
`md`) and the site's header (69px, 77px from `sm`). Use it for anything placed under the
bar (`top-(--header-height)`, `scroll-mt-…`) instead of retyping the number.

## Utilities

- `focus-ring`: the keyboard's ring, the app's own (2px brand in the console, 3px azure
  on the site), only for the keyboard. `focus-ring-inset` draws it inside, for a control
  at the edge of a box that clips (a row in a scroller); add `focus-ring-dark` on navy or
  ink. Never `outline-none` without one of these.
- `touch-target`: on a touch screen the hit area grows to 44 by 44px without moving
  anything (it uses `::before`). Small icon buttons, chips, inline links in a list.
  Controls that can simply be taller use `pointer-coarse:h-11`.
- `text-caps`: small capitals.
- `scroll-shade-x`: a box that scrolls sideways shows a shadow on the side that hides
  more. On white.
- `text-link`: a link in a line of words or beside a button: bold, brand, underlined
  under the pointer, with its ring. Add `underline` when it sits inside a sentence.
- `card-link`: the link that makes a whole card the target. The card is `relative`;
  the link's `::after` covers it and takes the ring inside the card's corners.

## Shared parts to use

Where a part goes: used by both apps, or generic, in `@repo/ui`; used only by the console
in `@repo/console`; used by one app only, in a module of that app. The site does not
compile `@repo/console`'s classes, so anything the site shows lives in `@repo/ui`.

- `@repo/ui`:
  - `Button`: variants `primary`, `secondary`, `outline` (the site's quiet choice, in
    brand), `danger`, `caution`, `destructive`, `ghost`, `ghost-danger`; sizes `sm`
    32px, `md` 40px, `lg` 48px (the site's booking buttons), `icon-sm` and `icon`
    (square, with an `aria-label`). Pressed shows the hover colour and gives a little;
    `pending` spins and keeps the focus while the work runs; `asChild` styles a `Link`.
    No app writes its own button classes.
  - `Field` (`tip` for the "i" beside a label, never an `InfoTip` inside `label`),
    `Input`, `Select`, `Combobox`, `DateField`, `NumberField`, `Checkbox`, `Radio`,
    `Switch`.
  - `Badge` and `StatusDot` (same tones); `Notice` (warning, danger, info) for a boxed
    notice; `FormError` for a refused action; `Bone` and `Loading` for skeletons;
    `Rows` and `PlaceValue` for label and value lists; `Logo` (brand or white; the
    site's `HomeLink` wraps it); `DialogActions` for a dialog's buttons (Cancel is
    `secondary`); `SheetHeader`.
  - One icon library, `@repo/ui/icons`, the site's own drawings included.
  - Browser helpers: `useMediaQuery` / `useNarrow`, `useDismiss` (Escape and a press
    outside), `isTyping`, `scrollBehavior` and `prefersReducedMotion`.
- `@repo/console`: `Card`, `Tile`, `Table`, `PageHeader`, `SectionHeader`, `EmptyState`
  and `EmptyRow`, `FigureTiles`, `StepMark`, `LocationMark`, `FormFoot` and
  `CancelLink`, the page skeletons. Status chips (`BookingStatusBadge`,
  `ItemStatusBadge`, `PAGE_TONES`…) are in `@repo/console/StatusBadges` and shown by
  both apps; they may only use `Badge`, never console classes of their own.

## Mapping a typed value

| Typed                                              | Token                                                           |
| -------------------------------------------------- | --------------------------------------------------------------- |
| 10–11.5px, 0.55–0.72rem                            | `text-2xs`                                                      |
| 12px, 0.75–0.78rem                                 | `text-xs`                                                       |
| 12.5–13px, 0.8–0.85rem                             | `text-caption`                                                  |
| 14px, 0.875–0.88rem                                | `text-sm`                                                       |
| 15px, 0.9–0.98rem                                  | `text-copy`                                                     |
| 16px, 1–1.02rem                                    | `text-base`                                                     |
| 1.05–1.08rem                                       | `text-lead`                                                     |
| 1.12–1.2rem                                        | `text-lg`                                                       |
| 1.3–1.4rem                                         | `text-xl`                                                       |
| 1.5rem                                             | `text-2xl`                                                      |
| 1.65–1.8rem                                        | `text-figure`                                                   |
| 1.875–2rem                                         | `text-3xl`                                                      |
| 2.125rem                                           | `text-title`                                                    |
| 2.25–2.5rem                                        | `text-4xl`                                                      |
| 9px, 10px corners in the console; 14px on the site | `rounded-control`                                               |
| 14px in the console; 17–20px on the site           | `rounded-card`                                                  |
| 22px on the site                                   | `rounded-panel`                                                 |
| slate-500, slate-600 text                          | `text-muted`                                                    |
| slate-700 to slate-900 text                        | `text-body`, or `text-ink` for a heading                        |
| slate-200 edge                                     | `border-card-edge`, or `border-hairline` between rows           |
| slate-300 edge                                     | `border-edge`                                                   |
| slate-50 / slate-100 fill                          | `bg-shade` / `bg-hairline`                                      |
| red, `#b3261e`                                     | `danger`; its tints `danger-tint`, `danger-edge`                |
| amber, `#7a5a00`, `#fff4d6`                        | `warning`, `warning-soft`, `warning-tint`, `warning-edge`       |
| green, emerald                                     | `success`, `success-tint`                                       |
| a status dot: amber, green or red 500–600          | `StatusDot`, or `bg-warning-dot` / `success-dot` / `danger-dot` |
| `z-[1]`, `z-10`…                                   | the `--layer-…` with that job                                   |

Left as typed, on purpose: sizes in `em` (relative to their text), layout arithmetic
(`max-w-[calc(100vw-4rem)]`, grid templates), and the colours Google Maps draws with (its
API takes colour strings, not classes).
