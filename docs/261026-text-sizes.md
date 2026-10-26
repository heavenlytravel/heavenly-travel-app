# Text sizes in both apps: audit, fix later

Status: audited on 2026-10-26 at the user's request ("some content is too small"). The
user decided to solve it later, in its own PR. Nothing here is built yet.

## What the audit found

- **The customer site has no type scale.** It uses 31 hand-picked sizes
  (`text-[0.55rem]` to `text-[3.75rem]`) and no `text-xs` or `text-sm` at all. The
  smallest:
  - 8.8px: the badge on the search card's tabs (`ServiceTabsSearch.tsx`, `text-[0.55rem]`);
  - 11px: the captions on the destination cards (`DestinationCards.tsx`, `text-[0.69rem]`);
  - 11.2px: the photo badges on cards (`page-parts.tsx`, `LocationPageView.tsx`,
    `text-[0.7rem]`);
  - about 12px: every eyebrow label (`Sections.tsx`, `(site)/_components/Page.tsx`,
    `SiteHeader.tsx`, `text-[0.76rem]`) and the preview bar's labels (`text-[0.75rem]`).
- **The console** uses `text-xs` (12px) in 146 places, mostly helper lines and table
  details. It uses `text-[11px]` in 10 places and `text-[10px]` in 2, mostly badges,
  counters and step numbers (`ConsoleMenu.tsx`, `StepMark.tsx`, `LocationMark.tsx`,
  `PublishDialog.tsx`, `TripRulesForm.tsx`).
- **Inputs are too small on a phone.** Every input in `@repo/ui` (`field.tsx`, the
  combobox, the command palette) is `text-sm`, 14px. iPhone Safari zooms the page when an
  input under 16px is focused. This hits the console's phone dock and the customer
  site's booking forms.
- **The shared field's hint and error** are `text-xs`, 12px (`field.tsx`). So are the
  `@repo/ui` badge, the small button and the menu and select group labels.
  `info-tip.tsx` uses 9.6px and `place-input.tsx` 11.2px.

## Proposed floors, to confirm before building

| Role                                     | At least                         |
| ---------------------------------------- | -------------------------------- |
| Inputs on a phone                        | 16px (`text-base`, `sm:text-sm`) |
| Body text on the customer site           | 16px                             |
| Body text in the console                 | 14px                             |
| Hints, table details, helper lines       | 13px                             |
| Uppercase eyebrows, badges, step numbers | 12px, with their letter spacing  |

- One change in `packages/tailwind-config/shared-styles.css` could raise `text-xs` to
  13px in both apps at once.
- The customer site's sizes would become a few named steps there instead of bracket
  values.
- Check every changed screen at 390, 768, 1280 and 1440px.
- The new footer (`261026-site-footer.md`) already uses 12.8px headings and 14px for its
  bottom line.
