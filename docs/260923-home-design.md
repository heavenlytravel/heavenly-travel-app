# Home page: colour and type

An analysis of the home page design in `apps/web` (`app/page.tsx`, `_home/`), read
from its components and CSS. Use it to keep new screens on the customer site in the
same family. Design analysis lives here, never as text on the pages themselves.

The page uses the brand's own photography from `public/brand` and sends requests as a
pre-written WhatsApp message until a product becomes a real booking.

## At a glance

| Trait        | Home                      |
| ------------ | ------------------------- |
| Mood         | Calm, editorial           |
| Lead colour  | Deep green `#073C36`      |
| Accent       | Gold `#CAA243`            |
| Display type | DM Serif Display 400      |
| Body type    | DM Sans                   |
| Corners      | 22px cards, 14px fields   |
| Hero         | Pale photo, ink text      |
| Search box   | Six services as tall tabs |

## Palette

| Hex       | Name       | Role                                                  |
| --------- | ---------- | ----------------------------------------------------- |
| `#073C36` | Deep green | Search button, closing band, active tab text, eyebrow |
| `#082F2B` | Ink        | Header text and headline                              |
| `#CAA243` | Gold       | Active tab bar, focus ring, airport card line         |
| `#E8F2EF` | Mint       | Active tab background, hover on the closing button    |
| `#FBFCFA` | Paper      | Page background                                       |
| `#67726F` | Muted      | Secondary text                                        |
| `#DCE3E0` | Line       | Field and card borders                                |

The gold `#CAA243` is only ever used for lines, bars and focus rings, never for text,
because it fails contrast on light backgrounds.

## Type

- Display: **DM Serif Display**, weight 400. Headlines are large and tight (line height
  0.9 to 1.05), up to 6.5rem in the hero.
- Body: **DM Sans**, weights 400 to 700. Labels are 600, the button is 700.
- Accent: **Oooh Baby**, a handwritten script, used twice only: "Travel" above the
  headline and the "More than a trip" note, both slightly rotated.
- Eyebrows are DM Sans 700, 0.76rem, uppercase, tracked 0.25em.

## Shape and motion

Large radii: 22px on the booking card and closing band, 17px on destination cards, 14px
on the joined field row. Soft, wide shadow under the booking card. Destination photos
scale up 4.5% on hover. Motion is off under `prefers-reduced-motion`.

## Imagery and voice

One aerial photo under two pale washes so dark text reads on it. Short, warm sentences:
"Travel made simple." Every brand photo was taken in Langkawi. Cards for other places
use them as mood, and their `alt` text describes the picture, not the place.
