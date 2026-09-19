# Landing designs: colour and type

An analysis of the four landing designs in `apps/web`, read from each page's
components and CSS. Use it to compare the designs or to lift a palette or a
type pairing from one into another.

| Design | Route        | Status                  | Code                     |
| ------ | ------------ | ----------------------- | ------------------------ |
| Home   | `/`          | In use as the home page | `app/page.tsx`, `_home/` |
| 1      | `/landing/1` | Alternative             | `app/landing/1/`         |
| 2      | `/landing/2` | Alternative             | `app/landing/2/`         |
| 3      | `/landing/3` | Alternative             | `app/landing/3/`         |

All four share the same facts (`app/_lib/content.ts`), the same photography
(`public/brand`) and the same way of sending a request (a pre-written WhatsApp
message). They differ in colour, type, shape and tone.

## At a glance

| Trait        | Home                      | 1                      | 2                          | 3                         |
| ------------ | ------------------------- | ---------------------- | -------------------------- | ------------------------- |
| Mood         | Calm, editorial           | Dense, practical       | Quiet, premium             | Bright, friendly          |
| Lead colour  | Deep green `#073C36`      | Deep teal `#0C3B3A`    | Near-black teal `#071918`  | Teal `#157A74` on white   |
| Accent       | Gold `#CAA243`            | Amber `#E4A93C`        | Amber `#E4A93C`, sparingly | Amber `#E4A93C`, one use  |
| Display type | DM Serif Display 400      | Overpass 900           | Overpass 300               | Overpass 900              |
| Body type    | DM Sans                   | Figtree                | Figtree                    | Figtree                   |
| Corners      | 22px cards, 14px fields   | 6px fields, 12px cards | Square throughout          | Pills and 24px cards      |
| Hero         | Pale photo, ink text      | Teal wash over a photo | Full-screen dark photo     | Mint field, no photo wash |
| Search box   | Six services as tall tabs | Two products, one row  | One way or by the hour     | Side panel with a stepper |

## Home (`/`)

**Palette**

| Hex       | Name       | Role                                                  |
| --------- | ---------- | ----------------------------------------------------- |
| `#073C36` | Deep green | Search button, closing band, active tab text, eyebrow |
| `#082F2B` | Ink        | Header text and headline                              |
| `#CAA243` | Gold       | Active tab bar, focus ring, airport card line         |
| `#E8F2EF` | Mint       | Active tab background, hover on the closing button    |
| `#FBFCFA` | Paper      | Page background                                       |
| `#67726F` | Muted      | Secondary text                                        |
| `#DCE3E0` | Line       | Field and card borders                                |

**Type**

- Display: **DM Serif Display**, weight 400. Headlines are large and tight
  (line height 0.9 to 1.05), up to 6.5rem in the hero.
- Body: **DM Sans**, weights 400 to 700. Labels are 600, the button is 700.
- Accent: **Oooh Baby**, a handwritten script, used twice only: "Travel" above
  the headline and the "More than a trip" note, both slightly rotated.
- Eyebrows are DM Sans 700, 0.76rem, uppercase, tracked 0.25em.

**Shape and motion.** Large radii: 22px on the booking card and closing band,
17px on destination cards, 14px on the joined field row. Soft, wide shadow
under the booking card. Destination photos scale up 4.5% on hover. Motion is
off under `prefers-reduced-motion`.

**Imagery and voice.** One aerial photo under two pale washes so dark text
reads on it. Short, warm sentences: "Travel made simple."

## Design 1 (`/landing/1`)

**Palette**

| Hex       | Name      | Role                                       |
| --------- | --------- | ------------------------------------------ |
| `#0C3B3A` | Deep teal | Hero wash, footer, score chips, prices     |
| `#157A74` | Teal      | Links, field hover and focus, reason icons |
| `#E4A93C` | Amber     | Search and book buttons, focus ring        |
| `#10201F` | Ink       | Body text, text on amber                   |
| `#3F5653` | Slate     | Secondary text                             |
| `#F4F7F6` | Mist      | Page background                            |
| `#E8F2EF` | Mint      | Active tab, icon circles                   |

**Type**

- Display: **Overpass**, weight 900 for headlines and prices, 700 for chips.
- Body: **Figtree**, 400 to 600.
- Headlines are modest in size (1.5rem section titles, 3rem hero) because the
  page is dense; hierarchy comes from weight, not size.

**Shape and motion.** Small radii: 6px fields and buttons, 12px cards, hairline
rings instead of shadows. Destination photos scale on hover. Information per
card is high: photo, seats, score, perks, price and button.

**Imagery and voice.** Photo-led cards and a washed hero photo. Plain,
comparative wording with scores and "from" prices.

## Design 2 (`/landing/2`)

**Palette**

| Hex       | Name            | Role                                          |
| --------- | --------------- | --------------------------------------------- |
| `#071918` | Near-black teal | Text, dark bands, primary button              |
| `#0C3B3A` | Deep teal       | Closing band, button hover                    |
| `#E4A93C` | Amber           | Eyebrows on dark, numerals, one button        |
| `#875D0C` | Dark amber      | Eyebrows on paper, where amber fails contrast |
| `#F6F4EF` | Paper           | Page background                               |
| `#5A6B68` | Grey-green      | Secondary text                                |
| `#D9DDD8` | Rule            | Hairlines between rows                        |

**Type**

- Display: **Overpass**, weight 300 for headlines, 400 for card titles. Light
  weight at large size (up to 4.5rem) carries the premium tone.
- Body: **Figtree**. Labels are 11px, uppercase, tracked 0.14em.
- Eyebrows are tracked 0.22em.

**Shape and motion.** No rounded corners anywhere. Fields are underlines, not
boxes. Sections are separated by hairlines and generous space (6rem to 8rem).
Service photos ease in 4% over 900ms on hover.

**Imagery and voice.** A full-screen dark hero photo that fills the viewport at
any size, tall photo panels, one large pull quote. Few words, confident:
"Your driver is already there."

## Design 3 (`/landing/3`)

**Palette**

| Hex       | Name      | Role                                          |
| --------- | --------- | --------------------------------------------- |
| `#0C3B3A` | Deep teal | Headline, header button, step numbers, banner |
| `#157A74` | Teal      | Check marks, selected chips, secondary button |
| `#E4A93C` | Amber     | The one main action in the booking panel      |
| `#EEF7F3` | Mint      | Section bands and reason cards                |
| `#E3F3EE` | Mint deep | Hero top, selected service chip               |
| `#FFFFFF` | White     | Page and card background                      |
| `#3F5653` | Slate     | Secondary text                                |

**Type**

- Display: **Overpass**, weight 900 for headlines, 700 for card titles.
- Body: **Figtree**, with 600 used often for a friendly, confident feel.
- Centred section headlines, 2.25rem.

**Shape and motion.** The roundest design: pill buttons and chips, 24px cards,
32px closing banner, circular step numbers joined by a dashed line. Soft tinted
shadows. The FAQ plus sign rotates to a cross when open.

**Imagery and voice.** Small rounded photos rather than a photo hero; the hero
is a mint gradient with a warm glow. Conversational and reassuring: "Your ride,
sorted before the day begins."

## Notes for mixing

- Designs 1 to 3 share one type pairing and one teal and amber family, so parts
  move between them without clashing. The home page has its own pairing and a
  greener, golder palette; bringing a part across means restyling it.
- The amber `#E4A93C` fails contrast as text on light backgrounds. Design 2
  uses `#875D0C` there. The home page's gold `#CAA243` is only ever used for
  lines, bars and focus rings, never for text.
- Every brand photo was taken in Langkawi. Cards for other places use them as
  mood, and their `alt` text describes the picture, not the place.
- The search boxes are compared on `/design-cta`.
