# Manage overhaul: the Signature look, one menu, one route per screen

Status: designed with the user on 2026-10-29, from a review of the console and HTML
mock-ups. Not built. The CEO chose the "Signature" look out of three. The mock-up is
`docs/mockups/261029-manage-signature.html`: open it in a browser at full width. It is
deleted in the last PR of this plan.

This supersedes `docs/261022-console-scope.md` (the path picks the scope, global and
location copies of a screen) and `docs/261023-console-sidebar.md` (two menus, drills).

Top management found the console confusing and did not want to use it. A review on
2026-10-29 rated it 4/10. The main causes:

- The menu rearranges itself: a location has its own menu, and Fleet, Pages and Settings
  replace the whole sidebar.
- The home page is not a dashboard.
- Explanatory sentences sit under nearly every title.
- Every card has the same weight.
- Red appears where nothing is wrong.
- Rates is one 3,570px page.

This plan changes the look and the structure only. Every feature stays as it is today, and
nothing new is added behind the screens.

## Decisions

### What stays

- **The left sidebar is the only menu.** There is no right panel. The location picker sits
  at the top, and the brand blues are kept. These are the CEO's three conditions.
- **Every feature works as today.** No new data, queries or server work. The mock-up shows
  a few things the code does not have; they are listed under "What the mock-up shows that
  we do not build" and are not built.
- **Status labels stay**, "Received" included. Only their colours change.
- **The phone keeps today's pattern:**
  - the picker in a white bar at the top
  - the floating Search and menu pill at the bottom (`ConsoleDock`)
  - the menu opening as a panel over the page
- **Each page keeps its permission check** (`requireAdmin`).

### The look

- **Type:**
  - DM Serif Display for page titles, figures and the dashboard greeting
  - DM Sans for everything else
  - loaded with `next/font` the way `apps/web/app/_home/fonts.ts` does, as `--font-display`
    and `--font-body`
  - Geist is removed. Clerk's headings already read `--font-display`
    (`packages/ui/src/clerk-appearance.ts`), so the sign-in screen follows.
- **The sidebar:**
  - a navy-to-ink gradient
  - azure-light group labels and icons
  - white text at 80%
- **The page:**
  - a mist canvas
  - white cards with 14px corners and a soft navy shadow
  - status chips as pills
- **A page title is serif, 34px.** On a page inside a section with pages, a small uppercase
  label above the title names the section, e.g. "FLEET" over "Vehicles".
- **The dashboard alone has the navy band:** greeting, date, and four figures in glass tiles.
- **Status colours, each its own:**

  | Status          | Colour     |
  | --------------- | ---------- |
  | Received        | amber      |
  | Confirmed       | brand blue |
  | Driver assigned | navy       |
  | Completed       | green      |
  | Cancelled       | grey       |

- **Red means a real problem only:** an expired document, or a failed action. Waiting and
  "due soon" are amber, and a missing driver days ahead is not red.
- **Words:**
  - no explanatory sentence under a page title; help stays in the existing info tips
  - one name for one place, the zone's name ("Kuah Ferry Terminal", not "Kuah Jetty")
- **Text contrast is at least 4.5:1.** The small label above a title is brand blue, not azure.
- **Colours come from tokens, never hex in code.**

### Addresses: the location comes first

Every console screen lives under one dynamic first segment, the location. `~` means every
location the person may see, and a slug means that location alone. One route file serves
both, so a screen exists once.

| Screen                        | All locations                                                   | One location                                                      |
| ----------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------- |
| Dashboard                     | `/~`                                                            | `/langkawi` (a draft shows its setup checklist)                   |
| Bookings                      | `/~/bookings?status=received`                                   | `/langkawi/bookings`                                              |
| A booking, its history, amend | `/~/bookings/{id}`, `/history`, `/amend/{itemId}`               | `/langkawi/bookings/{id}`, …                                      |
| New booking                   | `/~/bookings/new`                                               | `/langkawi/bookings/new` (location already chosen)                |
| Fleet: vehicles, drivers      | `/~/fleet/vehicles`, `/~/fleet/drivers`, with a Location column | `/langkawi/fleet/vehicles`, `/langkawi/fleet/drivers`             |
| A vehicle, a driver, add one  | `/~/fleet/vehicles/{id}`, `/new`                                | `/langkawi/fleet/vehicles/{id}`, `/new`                           |
| Classes                       | `/~/fleet/classes` (the catalogue), `/{id}`                     | `/langkawi/fleet/classes` (what is on sale here), `/{offeringId}` |
| Coverage                      | `/~/coverage` (all zones, read only)                            | `/langkawi/coverage`, `/zones/{id}`, `/zones/new`                 |
| Rates                         | `/~/rates/...` (read only, by location)                         | `/langkawi/rates/classes`, `/grid`, `/rules`, `/try`              |
| Pages                         | `/~/pages` (website and every location)                         | `/langkawi/pages`, `/{page}`, `/{page}/{entry}`                   |
| Website pages, footer         | `/~/pages/website/{page}`, `/~/pages/website/footer`            | —                                                                 |
| Media                         | `/~/media`                                                      | —                                                                 |
| Team                          | `/~/team` (staff), `/~/team/customers`                          | —                                                                 |
| Activity                      | `/~/activity`, `/~/activity/{entryId}`                          | `/langkawi/activity` (today's location History)                   |
| Settings                      | `/~/settings` (the list of locations), `/~/settings/new`        | `/langkawi/settings` (details, state, delete)                     |

**How scope works:**

- **The picker is the only location control.** Picking Langkawi on
  `/~/bookings?status=received` goes to `/langkawi/bookings?status=received`: the first
  segment changes and the rest is kept. In-page Location dropdowns (bookings, vehicles,
  drivers, coverage, rates, pages) go.
- **Addresses use the location's slug**, never its database id
  (`?location=cmvjbdqcr…` today).
- **Console-wide screens** (Media, website pages, Team, the location list) exist under `~`
  only. Their rows link to `/~/…`, and the picker shows All locations there.
- **A record opens under any scope that holds it.** There is one route file for a vehicle,
  so `/~/fleet/vehicles/{id}` and `/langkawi/fleet/vehicles/{id}` are the same screen.
- **Fixed pages stay at the root:**
  - `/` redirects to `/~`
  - `/sign-in`, `/no-access`, `/restricted` and `/api` stay where they are
- **No redirects from old addresses.** Old staff emails' "Open booking" links stop
  working; that is accepted.
- **No data is touched.** Production bookings stay.

### Location access, ready but not built

A location's layout turns the first segment into the locations this person may see:

- today, every location
- later, when a team is limited to its own location (not in this plan), that function
  narrows the set, and `~` quietly means "my locations"

Every query already filters by location ids, so later this is one function, not a rewrite.

### The menu

One menu. It does not change when the location changes:

- **Operations:** Dashboard, Bookings, Fleet (Vehicles, Drivers, Classes)
- **Selling:** Coverage, Rates (Classes and hourly, Rate grid, Trip rules, Try a trip)
- **Website:** Pages, Media
- **Admin:** Team (Staff, Customers), Activity, Settings

How it behaves:

- **A section with pages opens in place** under its row. Only one is open at a time:
  opening another closes the one that was open. The section of the page on screen is open
  when a page loads. There are no drills and no "back" row.
- **The page you are on is a white pill** with ink text and a brand-blue icon. It is
  bright, with no dot and no bar.
  - Its open section is lit softly (white at 10%).
  - Hover is white at 14%.
  - A count on the white pill turns brand blue.
- **Counts only where something waits:**
  - received bookings (amber)
  - documents and licences due (amber)
- **A row may hide, never move.** Rows hide by permission, by the location's state (a
  draft has no Bookings yet) and by scope (console-wide rows link to `~`). A section always
  sits in the same place.
- **A draft location keeps its setup marks** on the rows of its setup steps.
- **The rail:** the collapsed sidebar shows each page of an open section as its own icon,
  as today.
- **The person** sits at the sidebar's foot (name, level, menu), not in the top bar.
- **The top bar holds** the picker and Search (Ctrl/Cmd+K) and nothing else. No breadcrumb
  repeats the title, and there is no bell.
- **On a phone** the same menu fills the panel, sections opening in place, the picker
  on top.
- **The search palette** keeps working as today, with its index moved to the new addresses.

The menu is built from one list where each row names its group, so a later product (see
"Future work") is a new entry, not a rework.

### No tabs

The CEO does not like tabs.

- **A section's pages** (Fleet, Rates, Team) live in the menu, not in tabs on the page.
- **Rates' four pages end with "Before" and "Next" cards**, so they read in order.
- **Status filters become figure tiles you click:**
  - Bookings: Received, Confirmed, Completed, Cancelled, All, each with its count from
    `countBookings`
  - Media: All, In use, Past versions only, Unused, as today
  - The chosen tile has a brand ring.
- **The page editor stacks its cards:**
  - Page content, then SEO with the search-result and share previews
  - Publish history becomes a link in the header
- **Activity's record types are filter chips**, as today.

### Screen by screen

- **Dashboard** (replaces the location tiles and the address tester at `/`):
  - **The band:** a greeting, the date, and four figures from `listLocationOverviews`,
    summed under `~`: Pick-ups today, Received, Awaiting a driver, Documents due.
  - **Needs you:** the same counts as actions, worst first. Expired documents come before
    due ones, and a list item only shows when its count is above 0.
  - **Today's pick-ups:** `listBookings({pickupOn: today})`.
  - **Under `~`, By location:** each location's state and its figures.
  - **A draft location** shows its setup checklist, as today.
- **Bookings:**
  - The figure tiles above the list, then search and the pick-up date.
  - Columns as today: Booking, Customer, Trip, Location (under `~`), Pick-up, Total.
  - The "Upcoming" table from the mock-up is not built.
- **A booking:**
  - **The header:** the reference, its status chip, then a line saying who booked it and
    when, and where.
  - **One card per trip.** Each carries a step line (Received → Confirmed → Driver assigned
    → Completed, from its own status) and its actions:
    - Confirm (primary), Mark driver assigned, Mark completed
    - Amend, Change price
    - Cancel item, which is not red until its confirm dialog
  - **Booking level:** Cancel booking and the History link sit in the header.
  - **Side cards:** Customer (with phone and email links), Notes, and the last few History
    lines.
- **New booking:**
  - The four steps as today (Customer, Trip, Vehicle, Details) and the sticky summary.
  - **Add "Add another trip".** The create action already takes several items (PR #56); only
    the form offers one. The form gains a trip list like the site's
    (`docs/261027-multi-trip-booking.md`), with its rules, reusing the site's shared pieces.
- **Fleet:**
  - **Vehicles:** a figure strip (In service, Out of service, Documents due, Document
    expired), the "Documents due" filter, and a table with a photo thumbnail.
  - **A vehicle:** a document banner when one is due or expired, Photos, Details, the
    Documents card with each date and its chip, and History.
  - **Drivers and a driver:** the same pattern, with licences.
  - **Classes:** the catalogue under `~`, what is on sale under a location.
- **Coverage:**
  - The map and the zone list side by side.
  - "Add zone" and "Test an address" in the header. The address tester moves here from `/`.
- **Rates:**
  - **Classes and hourly:** the class rates table.
  - **Rate grid:**
    - a figure strip of the trip rules
    - Car with driver and Coach charter as a filter
    - cells that always look editable
    - the save bar
  - **Trip rules:** the form.
  - **Try a trip:** the inputs in one row, then the map and the breakdown.
- **Pages:**
  - A figure strip by status, then the tree.
  - **The editor:** a publish bar under the title (status, Unsaved edits, Preview, Save
    draft, Publish), then the stacked cards.
- **Media:** the figure tiles, then the grid. Choosing images shows a dark bar with
  "Delete N images".
- **Team:**
  - **Staff:** today's Admins, with the wall switch and "Promote to staff".
  - **Customers:** today's Users.
  - **"What each team can do":** a table drawn from the permission rules in
    `packages/db/src/permissions.ts`.
- **Activity:** grouped by day, record-type chips, and the location's own under `/langkawi/activity`.
- **Settings:**
  - **Under `~`:** the list of locations with their state and setup progress (today's home
    tiles), and Add location.
  - **Under a location:** details, state and delete, as today.

### What the mock-up shows that we do not build

The mock-up was drawn before this plan was settled. These are left out because the code does
not have them:

- Export
- the bell and notifications
- revenue and any chart of bookings by day
- "compared with last week" figures
- a vehicle's next trips and trip count
- a satellite map
- dragging zones into order
- an Upcoming filter

The Board, vendors and assigning a driver belong to the unmerged fulfilment branch; see
"When the vendors branch merges".

## What the code has today

- **Each screen exists twice, as files:** once for every location and once under
  `/locations/[slug]/…`. The pairs are bookings (list, booking, history, amend), vehicles,
  drivers, coverage, rates, pages and vehicle classes.
  - **Most share a component** (`BookingsList`, `bookingScreen`, `FleetList`).
  - **Some differ:**
    - coverage and rates are read only under All locations
    - classes are the catalogue globally and offerings in a location
- **The `@scope` parallel route draws the menu** (`AllScopeNav` or `LocationScopeNav`), so
  a location's menu can stream its counts.
- **The menu and drills:**
  - `nav.ts` and `LocationNav.tsx` hold the two menus
  - `menu.ts` holds the matching
  - `ConsoleMenu.tsx` draws drills
- **Routes:**
  - `_lib/routes.ts` holds every route helper and `scopeSwitchHref`
  - `scopeOfPath` reads the scope from the path
- **The building blocks live in `apps/manage/app/_components`:**

  | Block                 | Imported by |
  | --------------------- | ----------- |
  | `PageHeader`          | 23 files    |
  | `SectionHeader`       | 18          |
  | `Card`                | 35          |
  | `Table`               | 8           |
  | `Skeleton`/`Streamed` | 45          |
  | `StatusBadges`        | 9           |
  | `PageColumn`          | 13          |

- **Shared with the website:**
  - `@repo/ui` reaches the site through Button (via `alert-dialog`), `inputClassName`
    (Select, DateField, NumberField), Toast, Sheet, Menu, Dialog, Markdown, PlaceInput and
    `clerk-appearance`.
  - These are console-only: Badge, Sidebar, Switch, Tooltip, InfoTip, CommandPalette and
    Combobox.
  - `packages/tailwind-config/shared-styles.css` holds the brand colours for both apps.
- **Data a dashboard can use today:**
  - `listLocationOverviews` / `getLocationOverview`: received, pick-ups today, awaiting a
    driver, documents and licences due, zones, classes on sale, routes priced
  - `countBookings(filter)`
  - `listBookings`
  - There is no sum of money and no series by day.
- **Links into the console from outside:**
  - the staff "received" email: `${adminUrl}/bookings/${id}` in
    `packages/email/src/booking-emails.ts`
  - the website's preview bar: `pageEditorPath` and `sitePageEditorPath` in `packages/db`
- **`RESERVED_SLUGS` in `packages/db/src/location-input.ts`** already keeps slugs off the
  site's paths.

## How it is built

### One route per screen

- **One route tree:** the console's pages move to `app/(console)/[location]/…`, one file per
  screen. The global and location copies are deleted, and the shared screen components take
  a scope instead of an optional `place`.
- **`[location]/layout.tsx` resolves the scope:**
  - It holds `{ slug: string | null, locationIds, location }`. `slug` is null for `~`;
    `location` is set for a slug.
  - An unknown slug is `notFound()`.
  - It asks `locationsVisibleTo(admin)` for the set. Today that returns every location; it
    is the seam for location access.
- **The menu is drawn by this layout,** on the server, with counts streamed by `Streamed`
  as today. The `@scope` slot and its catch-alls are deleted.
- **`_lib/routes.ts` is rebuilt** around `consolePath(scope, section, …rest)`. The picker's
  switch is: replace the first segment, keep the rest and the query.
- **The paths other apps use** come from `packages/db`, next to `pageEditorPath`. Add a
  `consoleBookingPath(id)` there, and use it in the email and in the console. The website's
  "Edit" links follow on their own.
- **`RESERVED_SLUGS` gains the console's root words:** `api`, `sign-in`, `no-access`,
  `restricted`. `~` cannot be a slug, since `slugify` drops it.

### Shared parts, one home each

The rule: anything two screens or two apps can share is shared. Variants, never copies.
A replaced part is deleted in the PR that replaces it.

- **A new package, `packages/console` (`@repo/console`),** for the console's own parts:
  - `Card`, `PageHeader` (with the section label), `SectionHeader`, `Table`, `Skeleton`,
    `PageColumn`
  - the status chips, `FigureTiles`, the document chips and `FormError`
  - the shell: the sidebar menu, the picker, the top bar and the phone panel
  - It is source only, transpiled by manage, like `@repo/db`. It uses the same file names
    as the package the vendors branch already made (`packages/console/src/Card.tsx`, …), so
    that branch's rebase is a swap, not a merge of two designs.
- **`@repo/ui`:**
  - **Console-only parts change directly:**
    - Badge gets one tone per status and a `className`
    - Sidebar gets a navy variant with the white-pill active row
    - Switch, Tooltip, InfoTip and CommandPalette match the look
  - **Parts the website uses change only through opt-in props or CSS-variable hooks**, like
    today's `--ui-popover-radius`, with every default unchanged: Button, the field classes,
    Select, Toast, Sheet, Dialog, AlertDialog.
  - Any PR that touches `@repo/ui` clicks through the website's booking flow (selects,
    date field, confirm dialog, toasts) before merging.
- **Tokens:**
  - `shared-styles.css` may gain tokens; existing values never change.
  - The console's own canvas, radius, shadows and fonts go in `apps/manage/app/globals.css`
    under `@theme`.

### Effect on the other apps

- **`apps/web`:** no visible change.
  - The preview bar's "Edit" link points at the new editor addresses through the shared
    helpers.
  - The `@repo/ui` rule above keeps the site's look.
- **`packages/email`:** the staff email links with `consoleBookingPath`.
- **`apps/connect`:** not on `main`; see the next section. Whether Connect moves to this look
  is not decided.

### Build order

Nine PRs, each leaving the console working, each with lint, types, a build, screenshots on
a computer and a phone, and the access probe for each team.

1. **Foundation:**
   - fonts and tokens
   - `@repo/console` with the restyled building blocks and status chips
   - the `@repo/ui` variants and hooks
   - The whole console takes the new look on the old structure.
2. **Addresses and the menu:**
   - the `[location]` route tree, which moves every page and deletes the copies
   - `~` and the picker as the only location control
   - the open-in-place menu with the bright active row, and the top bar
   - the phone panel and the palette index
   - `RESERVED_SLUGS` and `consoleBookingPath`
   - This is the largest PR. Pages move without being redrawn.
3. **Dashboard:** the band, Needs you, today's pick-ups, By location, the draft checklist.
4. **Bookings:** the list with figure tiles, a booking with trip cards and step lines, New
   booking with "Add another trip", Amend.
5. **Fleet:** vehicles, drivers, classes and offerings, and their record pages.
6. **Selling:** Coverage with the address tester, and the four Rates pages with Before
   and Next.
7. **Website:** Pages, the page editors, the footer editor, Media.
8. **Admin:** Team (Staff, Customers), Activity (with a location's own), Settings (the
   location list, a location's details).
9. **Sweep:**
   - a phone pass over every screen
   - words and names, and contrast
   - delete what is left of the drills, `menu.ts` matching and unused components
   - mark `docs/261022-console-scope.md` and `docs/261023-console-sidebar.md` superseded
   - delete `docs/mockups/261029-manage-signature.html`

## When the vendors branch merges

`feat/fulfilment-vendors-connect` was built on the old console. When it is reviewed for
merge, it is rebuilt on this structure:

- **Addresses:**
  - the Board at `/[location]/board`
  - vendors at `/[location]/fleet/vendors`, with `~` for every vendor
- **Its screens** use the menu and the shared parts.
- **Its `@repo/console`** merges into the one made here.

The rebuild is that branch's work, not this plan's.

## Future work

- **Products in the address**, once a product with its own way of working arrives (car
  rental, hotels, attractions, custom packages). The product's own pages go under
  `/[location]/[product]/…`; Dashboard, Bookings, Team and Activity stay at `/[location]/…`.
  Car with driver and coach charter stay categories of one product until then: they share
  zones, rates, the fleet and drivers, so they are a filter inside pages, not a part of the
  address. A product picker beside the location picker comes with the second product.
- **Location access:** narrow `locationsVisibleTo` for teams limited to their own location.
- **Several locations at once:** `/~/bookings?locations=langkawi,penang`.
- **Needs data first:** revenue figures, bookings by day, an Upcoming filter, Export,
  notifications.
- **Connect's look.**

## Answered questions (2026-10-29)

- **The vendors branch merges after this,** and follows this look then.
- **The sub-pages:** they open in place in the sidebar, one section at a time, on a phone
  too. Tried and dropped: the sidebar becoming the section's own menu (today's drills), a
  rail with a second column, and a switch in the page title.
- **The active row:** a bright white pill. Tried and dropped: a brand-blue pill and a side
  bar.
- **Received keeps its name.**
- **New booking gets "Add another trip".**
- **Products in the address:** left for later.
- **Old addresses:** no redirects, no data deleted.
- **The mock-up:** kept in `docs/mockups/` until this plan is built, then deleted.
