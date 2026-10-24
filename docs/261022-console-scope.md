# The console's top bar and scope

Decided on 2026-10-22, after the CEO's review of the location panel: one sidebar, no
panel on the right, more use of the top bar. Three layouts were mocked up and compared
(in the docs repo, `presentations/261022-admin-workspace-layout.html`); this is the
one picked, with a location picker in the top bar. It replaces the panel of
`261015-locations-as-operation-areas.md` ("Who may do what") and moves the groups of
`261018-location-work-and-class-catalogue.md` ("The panel by daily work and setup")
into the sidebar.

## Why

Inside a location the console had two menus. The sidebar listed Bookings, Vehicles and
Drivers across every location; the panel on the right listed Bookings, Vehicles and
Drivers of the location. The same words meant two scopes, and the panel took 18rem
from every location page, the rate grid and the zone map most of all. The top bar held
the breadcrumb and nothing else.

## Decisions

### The top bar

From the left: the sidebar's toggle, the location picker, and the section on screen
("/ Rates"), a link back to the section from a record inside it. On the right: the
booking search, for an admin with `bookings.view`, and the signed-in admin's own menu
(Clerk's user button), moved from the sidebar's foot.

### The picker and the scope

- The scope is what the console works on: one location, or All locations. The picker
  shows it: the location's mark, name and state, or "All locations".
- Its menu holds All locations, every location with its state, and Add location for an
  admin with `locations.manage`.
- The path decides the scope. A location's pages are its own; the home and the views
  across locations (`/bookings`, `/vehicles`, `/drivers`, `/vehicle-classes`,
  `/coverage`, `/rates`) are All locations. `scopeOfPath` in `_lib/routes.ts`.
- A page of the whole console (Home page, Media, Users, Admins, Activity, Add
  location) keeps the scope last worked in, so opening Media from Langkawi does not
  swap the menu. The `console_scope` cookie remembers it for such a page opened
  afresh, as `all` or `location:langkawi`, so a location slugged `all` stays a
  location. A location since deleted falls back to All locations.
- Picking keeps the section on screen where the other scope has it: Langkawi's Rates to
  Penang's, a location's Bookings to the queue across locations and back. A tab the
  admin may not open there, or a draft's missing Bookings, lands on the overview.
  `scopeSwitchHref`.

### The sidebar

Revised on 2026-10-23: replaced by `261023-console-sidebar.md`. A location's sidebar holds
that location alone, in parts with no headings, with no Setup fold and no submenus; Pages
and Settings open in the sidebar's place. Marketing and Access move into All locations, as
Home page and a Settings drill. Every page off a location is All locations, and the
`console_scope` cookie and the six `@scope` folders across locations go. What follows is
the sidebar as it was.

- The brand on top, then the scope's sections, then Marketing and Access, which belong
  to no one location.
- A location's sections are the panel's, in the same groups and order
  (`locationTabsFor(state)`): the day's work under the location's name, the setup
  folded under Setup for a live or paused location, then History and the public page.
  A draft keeps its numbered steps and the bar of how far it has come.
- One line per row, as the other menus. A count stands at a row's end where something
  waits: the bookings awaiting confirmation, the vehicles with a document due, the
  drivers with a licence due. The line on where a section stands ("3 vehicles in
  service") is the row's tooltip on the rail; the numbers are on the location's Today.
- The submenus stay: the bookings by status, the zones, the classes, the parts of the
  rates, the pages, the documents due.
- All locations lists the home (Overview) and the six views across locations, which
  were the Operations group.
- Below `md` the sidebar is a sheet, closed by any move to another path. On a phone the
  strip of tabs under a location's header stays, since the sheet is a tap away; from
  `md` up the sidebar lists the tabs and the strip is hidden.

### Booking search

Replaced on 2026-10-25 by the console's search, the command palette of
`261023-console-sidebar.md`, which finds bookings the same way among everything else.

- Finds a booking by part of its reference, or of the customer's name, phone or email,
  the Bookings list's own search, across every location whatever the picker is on: a
  caller's booking is found from anywhere.
- The matches list under the box as the admin types, newest first, six at most, each
  with its reference, status, location, customer and pick-up. Enter or a click opens
  one inside the location it picks up in; one across two locations opens on its own
  page. The last row opens the Bookings list with the same search. While a newer
  search is on its way the last answer's rows stand dimmed and cannot be chosen, so
  Enter never opens a match for text since changed.
- Ctrl or Cmd + K puts the cursor in the box from anywhere. On a phone the box is a
  button until tapped, then lies across the top bar.
- `GET /api/bookings/search?q=`, behind `bookings.view`, as the place search is a route
  handler: a read the browser makes as the admin types, cancelled when the text
  changes. It reads only what a row shows (`findBookingMatches` in `@repo/db`).

### Page width

The page column grows from 64rem to 80rem, for the lists, the rate grid and the maps. A
form of stacked cards (a vehicle, a driver, a class, an offering, a new location) keeps
64rem (`FORM_WIDTH` in `_components/PageColumn.tsx`). The new booking and amend forms,
with their summary beside them, take the full column.

## How it is built

The sidebar's scope is the `@scope` parallel route of the console layout
(`app/(console)/@scope`), so each location's sections are read on the server with the
location, stream behind a skeleton, and stay while the admin moves between the
location's tabs.

- `@scope/locations/[slug]/layout.tsx` reads and draws the location's sections
  (`LocationScopeNav` in `locations/[slug]/LocationNav.tsx`); its pages are empty.
- `@scope/page.tsx` and a `page.tsx` plus `[...rest]` under each view across locations
  draw All locations. An optional catch-all is not allowed beside a page at the same
  path. The views are listed three times, which must agree: `ACROSS_LOCATIONS` in
  `_lib/routes.ts`, `ALL_LOCATIONS_NAV` in `_components/nav.ts`, and these folders.
  `@scope/coverage` needs its own line in the root `.gitignore`, which ignores every
  `coverage` folder as test output.
- A page of the whole console has no route in the slot, so a move to it keeps the
  slot as it was, which is the scope last worked in. `@scope/default.tsx` answers such a
  page opened afresh from the cookie; `@scope/locations/new` does the same.
- `ConsoleScopeProvider` in the console layout gives the picker the same scope in the
  browser and writes the cookie.

The panel's pieces in `@repo/ui` (`SidebarPanel`, its provider, toggle and trigger, and
the `panel_state` cookie) are removed. `@repo/ui` gains `menu` (a dropdown menu) and
`search-menu` (a search box with its matches under it).

## Not in this change

- The Today page's own layout (one row of numbers, pick-ups and drivers side by side),
  sketched in the same mockup.
- Counts on All locations' rows, and in the picker's menu.
