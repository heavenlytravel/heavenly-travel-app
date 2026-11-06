# Clicks that answer at once

Built on 2026-11-06, after the developer saw Chrome's "INP issue" (Interaction to Next
Paint) on the Bookings row of manage's menu in production: "Event handlers on this
element blocked UI updates for 264ms". The same warning had come up on 2026-11-04 for
typing in the rate grids, a different cause, fixed then in the grids alone.

INP is the time from a click or key press to the next frame the screen shows. Over 200 ms
reads as slow; Google counts it towards a site's ranking.

## What was measured

Production builds of all three apps on the developer's machine (`next start`, port 3005
and up), Chrome with its CPU slowed four times to stand for an ordinary office laptop or
a phone, signed in as the SUPER test account, nothing saved. A crawl of 88 manage pages
clicked every link to a new page from where it shows, opened every menu and popup, folded
every disclosure and typed into every field; the customer site and Connect were crawled
the same way.

A key press that changes nothing on screen (Escape with nothing open) reads 300 ms and
more even on an empty page: the browser waits for a frame that never comes. Those
readings were dropped; what is below had real work behind it.

| Where                                                                     | Before       | After        |
| ------------------------------------------------------------------------- | ------------ | ------------ |
| A menu row or any link, to Activity, Settings, New booking, the New forms | 200-290 ms   | 24-56 ms     |
| Typing in the page editor (any page, blog post or location page)          | 448 ms a key | 40-56 ms     |
| Opening the location picker                                               | 224-256 ms   | 104 ms       |
| Opening the account menu                                                  | 224-256 ms   | under 120 ms |
| Opening a select (the Section select, the selects in Filters)             | 264-280 ms   | 150 ms       |
| Filters, first open                                                       | 216 ms       | 144 ms       |
| "Collapse all" on Pages                                                   | 256 ms       | 144 ms       |
| Destinations on the customer site                                         | 288 ms       | 160 ms       |

## What changed

### 1. A click on a link shows at once

Manage has no `loading.tsx`: a click on a link to another page changed nothing on screen
until the next page had come from the server and been drawn. On production that wait
also holds the trip to Vercel and the access check.

- **The loading line starts with the click.** `NavigationProgress` (`@repo/ui`) waited
  400 ms before it showed, so a 250 ms wait showed nothing at all and read as a freeze.
  It now starts in the click's own frame, on manage and on the customer site.
- **A move made in code says so too.** `showNavigation(href)` from
  `@repo/ui/navigation-progress` starts the line before a `router.push`: a page's row in
  Pages, a zone pressed on the coverage map, the Section select, a result chosen in the
  search.
- **The menu row glows** from the click until its page lands (`useLinkStatus`, in
  `ConsoleMenu.tsx`), so the click shows where it was made.

Not a `loading.tsx`: the search boxes, filter chips and pager change the page's address,
and a route's loading screen would replace the whole page, search box and what is typed
in it, with a skeleton on each of them.

### 2. Menus and selects stop restyling the whole page

Radix's menu, in its default modal form, and its select turn pointer events off on the
`<body>` while open, and the select's scroll lock sets the scroll bar's width on the body
as a CSS variable. Every element inherits both, so the browser worked out every
element's style again, on opening and on closing: 50 to 65 ms each time with the CPU
slowed, the largest part of the press.

- `Menu` (`@repo/ui/menu`) is no longer modal. A click outside still closes it, and goes
  on to what it was on.
- `styles.css` in `@repo/ui` gives each child of the body its own `pointer-events` and
  variable (`:where(body > *)`, no weight), so the change stops at the body. A press
  outside an open select now closes it and goes on to what it was on, as on a menu.

### 3. Typing does the heavy work a moment behind

- **Page editor:** the live preview re-read the whole text with Markdown on every key,
  and the editor compared the whole page with the save twice. The preview, the checks,
  the comparison and the status now follow the typing a moment behind
  (`useDeferredValue`), so the key shows in the field at once. Ctrl+S still reads the
  text as typed.
- **Media picker:** the list narrows a moment behind the typing, and shows 48 tiles
  with "Show more", as the Media page pages at 48.
- **Customer confirm step:** each key in the flight number or the driver notes wrote
  the whole trip plan, prices and all, to local storage. The page still reads the change
  at once; storage is written 400 ms after the typing rests, or when the page is left or
  hidden (`trip-plan-store.ts`).

### 4. Folding in Pages hides rows, keeps them

"Collapse all" took every row off the page and drew them all again on the way back.
Folded rows are now hidden in place (React's `Activity`). The shared table draws its
hairline over each row but the first, not under each but the last, so a folded last
section leaves no line at the foot.

## Left as it is

- **Assign's list** loads every trip from the start of today. It grows with the bookings
  ahead, not with the history, and no page change here was slow.
- **Opening a picker** (the date and time, Filters, a select) still costs 100 to 150 ms
  with the CPU slowed, about 30 to 40 ms on a normal machine: React and Radix mounting it,
  and the browser's first layout of its list. No one part stands out.
- **New booking** redraws the whole form on each key; typing in it measured well under
  200 ms.

## Checking it again

The tools are outside the repo, in `review-shots/tool` of the Claude project folder:
`inp-audit-2611.mjs` (the crawl), `nav-inp-2611.mjs` (menu clicks),
`profile-open-2611.mjs` (what opening a popup spends its time on, through a build made
with source maps) and `style-cost-2611.mjs` (what a change to the body costs the page's
style).
