# The console's sidebar: one scope at a time, sections that open

Decided on 2026-10-23, after staff said the sidebar's grouping made the console hard to
work in. Five reviews of every console screen (the fleet and the class catalogue, the
bookings and the day's work, a location's setup and prices, the console's own screens with
what each team sees, and the shell) found the same faults; the CEO prefers a sidebar whose
sections open in its place, under a way back. This replaces "The sidebar" of
`261022-console-scope.md` and "The panel by daily work and setup" of
`261018-location-work-and-class-catalogue.md`. The top bar and the picker of
`261022-console-scope.md` stand.

## Why

- The tab on screen opened its own submenu and closed the last one, so every row under it
  moved on each click, and the setup folded and unfolded with the tab.
- The headings named a scope, a team or a phase, not the work: "All locations", the
  location's name (also on the picker and the page), "Setup · Set once" over the zones and
  prices Operation keeps changing and the rates Reservation and Sales quote from,
  "Marketing" over Media, which only SUPER opens, and "Access" over Activity, the log. With
  the wall on, several teams saw a heading over one row.
- The submenus repeated the pages: the booking statuses were the list's filter, Documents
  due the fleet lists' filter, the Add rows the headers' buttons, and the four Rates rows
  jumps that could never show as the one on screen.
- Inside a location the console's own groups stood under its sections, so a location's
  sidebar never held the location alone.

## Decisions

### Two menus, by the picker

- The picker stays as `261022-console-scope.md` has it, and it alone decides the menu. A
  location's sidebar holds that location alone; All locations holds the views across
  locations and the console's own screens. Every path off a location is All locations,
  the home page, the users, the admins, the activity, the media and adding a location
  included (`scopeOfPath`). The `console_scope` cookie, which kept the last scope on those
  pages, goes.
- The rows stand in parts. The first, the day's work, has no name; the others are named
  by their work, Selling and Manage, in either scope (`MENU_PART_LABELS`). On the rail,
  where names do not fit, the parts are a line apart. Names, not lines, since 2026-10-25:
  lines alone left the parts unexplained.
- A location's Overview row has the location's mark for its icon, as the picker has it,
  so the menu itself says which location it holds; All locations' Overview has the
  dashboard icon. On the rail the mark is what tells the two menus apart.

### A location

- Overview, Bookings, Fleet; Selling: Coverage, Rates; Manage: Pages, Settings, and the
  public page once it is public. The same rows in the same places in every state,
  so going live moves nothing; a draft has no Bookings row, since it takes no bookings.
- The first row is Overview in every state and scope; a live location's overview is still
  its day.
- A count stands at a row's end where something waits, as before: the bookings awaiting
  confirmation; in Fleet the vehicles with a document due and the drivers with a licence
  due, the Fleet row their sum.
- A draft's setup steps are marked at the end of the rows that hold them, a ring until
  done and a tick once done (the classes' step on Fleet and on its Vehicle classes page),
  and the Overview row says how far the setup has come
  ("1 of 4"). Its overview is still the checklist, with a way into each step.
- The Setup group, its fold and the submenus go. What they held is on the pages: the
  booking statuses on the list, the due filter and Add on the vehicle and driver lists,
  the zones on Coverage, the classes on Vehicle classes, and the four parts of the rates as
  jumps under the Rates tab's header.
- Fleet, Pages and Settings are drills.

### Drills

- A row with a chevron opens its section in the sidebar's place: its name, a way back to
  the menu, and its pages. While one of its pages is on screen the drill stays open. Back
  shows the menu with the page left as it is; the drill returns once another of its pages
  opens, or its row is pressed. Each page of a drill has its own icon, as each row has;
  a location's pages keep their standing's dot beside it. On a phone the drill's row keeps the sheet open, so its
  pages show there. Collapsed to a rail there is no drill: the rows' icons alone.
- Fleet, decided by the CEO on 2026-10-25: Vehicles, Drivers, Vehicle classes, in either
  scope. An admin who may open one of them alone (Reservation and Sales read the classes,
  not the vehicles) sees that page's row in Fleet's place, with no drill.
- A location's Pages: All pages (the tiles and the saved addresses), each page with its
  standing, and Saved addresses, a jump to their card.
- A location's Settings: General, its state as the note, and History, the date of the last
  change as the note.
- All locations' Settings, for SUPER: Users, Admins, Activity, Media. The Settings screen
  of BL-42 (payment, policies, emails) joins it when it is built.

### A location's settings

- Details and Status are one page, General, at `/locations/[slug]/settings`: the details
  for Marketing, the state for every admin with its move for SUPER, then Delete for SUPER.
  `/details` and `/status` redirect to it (`next.config.ts`). The setup step "Details" opens
  it for Marketing, and its to-do reads "Tick at least one state in the location's
  settings".
- The history stays at `/locations/[slug]/history`, the second page of Settings.

### All locations

- Overview, Bookings, Fleet; Selling: Coverage, Rates; Manage: Home page, Settings.
- Fleet holds the class catalogue beside the vehicles and drivers, at `/vehicle-classes`,
  as staff asked: a vehicle is of a model of a class. It replaces the Classes tab Vehicles
  had in the first cut of this change.
- The home's title is Overview, as its row.
- The picker keeps the section across the two scopes as before, and a location's Pages
  and the home page are now one section in it.

### Still open

- Where a location's classes on sale belong for good: in Rates, whose fields they are but
  On sale, or Fleet. They are in Fleet until the Tech Lead decides.
- Admins for each location: which locations an admin works at, with All locations for
  SUPER. It needs a schema change; proposed separately.

## How it is built

- `_components/menu.ts`: the menus as data (`Menu`, `MenuRow`, `MenuEntry`), each icon by
  its name (`MENU_ICONS`), and which row and which page of a drill are on screen.
- `_components/ConsoleMenu.tsx`: draws a menu, its drills and the way back, in the browser.
- `_components/nav.ts`: All locations (`ALL_LOCATIONS_NAV`, `allLocationsMenu`) and the
  section for the header's trail (`sectionOnScreen`). The phone's strip of a location's
  tabs uses `LinkTabs`.
- `locations/[slug]/LocationNav.tsx`: a location's menu from its details and its numbers.
  It no longer reads the location's zones and classes, which only the submenus needed.
  `fleetRow` gathers Vehicles, Drivers and Vehicle classes into Fleet.
- `_lib/routes.ts`: `LOCATION_TABS` in the sidebar's order, `settings` in place of
  `details` and `status`; `locationTabsFor(state)` drops Bookings for a draft and nothing
  else; `SETUP_STEP_PERMISSIONS` for the checklist's way into each step.
- The `@scope` slot: `page.tsx` for the home, a catch-all `[...rest]` for every other page
  off a location, `locations/new` for adding one, and `locations/[slug]/layout.tsx` for a
  location. The six folders across locations go, and so does their line in the root
  `.gitignore`.
- The console's layout draws no sidebar or header for someone who is not an admin. The only
  page they reach under it is a page not found, which now includes any path the catch-all
  takes; this way not even the picker's location names reach them.
- `@repo/ui` gains `SettingsIcon`, `CarFrontIcon` (Fleet), `ActivityIcon`,
  `SlidersHorizontalIcon` (General) and `FilesIcon` (All pages).

## Not in this change

- Admins for each location (above).
- From the review of 2026-10-23: New booking on a location's Bookings tab, a trail above a
  record's title in place of the back links, and the picker as the only control for a
  location.
- Dropped on 2026-10-25: keeping a vehicle or driver opened from a list across locations
  on All locations. A record has one home, its location, and opens there with that
  location's sidebar and picker; Back returns to the filtered list.
- An overview across locations that gathers what waits on each team, and the schedule
  board (OP3-03).
