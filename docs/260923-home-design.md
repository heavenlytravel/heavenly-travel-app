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
| Lead colour  | Brand blue `#046BD2`      |
| Accent       | Azure `#0F86CE`           |
| Display type | DM Serif Display 400      |
| Body type    | DM Sans                   |
| Corners      | 22px cards, 14px fields   |
| Hero         | Pale photo, ink text      |
| Search box   | Six services as tall tabs |

## Palette

Since 2026-10-22 both apps use the brand's blues, read from heavenlytravel.my and the
logo; until then the site was deep green `#073C36` and gold `#CAA243`. The colours are
custom properties in `packages/tailwind-config/shared-styles.css`, each also a
utility (`bg-brand`, `text-ink`, `ui:bg-brand`), so a colour changes in one place.

| Token          | Hex       | Source                       | Role                                                |
| -------------- | --------- | ---------------------------- | --------------------------------------------------- |
| `brand`        | `#046BD2` | Site primary                 | Buttons, links, active tab, prices, eyebrows, focus |
| `brand-strong` | `#045CB4` | Site primary on hover        | Primary under the pointer                           |
| `brand-tint`   | `#E8F1FB` | Derived from `brand`         | Selected and active backgrounds, sidebar row        |
| `navy`         | `#003876` | Site menu links and icons    | Closing band, destination cards, admin sign-in      |
| `ink`          | `#00264B` | Site headings                | Headlines, header text, tooltips, dialog backdrop   |
| `azure`        | `#0F86CE` | Logo light blue              | Active tab bar, focus outline, accent lines         |
| `azure-light`  | `#8FCDF4` | Derived from `azure`         | Words in the accent colour on navy and ink          |
| `mist`         | `#F0F5FA` | Site pale section background | Empty photo frames, hero placeholder                |

The greys are Tailwind's `slate`, the cool grey of the site's own text (`#334155`,
`#475569`, `#1E293B` there): `slate-50` paper, `slate-200` lines, `slate-500` muted
text, `slate-700` body copy. Red stays for errors and refusals, and amber, emerald and red
for booking states.

White text on `brand` is 5.2:1 and on `navy` 11.5:1. `azure` on white is 3.9:1, enough
for lines, bars and focus rings but not for small text, so words take `brand`, or
`azure-light` on a dark field.

The logo itself is drawn in navy `#00283E` with a `#0F86CE` blue; the site's `#003876`
is a lighter navy than the logo's.

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
