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
  the zones on Coverage, the classes on Vehicle classes, and the four parts of the rates
  (Rates and rules, Rate grid, Trip rules and Try a trip, since nearest-zone pricing) as
  jumps under the Rates tab's header.
- Fleet, Pages and Settings are drills.

### Drills

- A row with a chevron opens its section in the sidebar's place: its name, a way back to
  the menu, and its pages. While one of its pages is on screen the drill stays open. Back
  shows the menu with the page left as it is; the drill returns once another of its pages
  opens, or its row is pressed. Each page of a drill has its own icon, as each row has;
  a location's pages keep their standing's dot beside it. On a phone the drill's row keeps
  the menu's panel open, so its pages show there. Collapsed to a rail no drill opens; see
  "On the rail" below.
- A drill opens as its row is pressed, before its page has come. Its pages come in from
  the right out of a slight blur as the menu goes, and the menu comes back from the left
  (added 2026-10-25, after the way Vercel's dashboard moves between its menus).
- Fleet, decided by the CEO on 2026-10-25: Vehicles, Drivers, Vehicle classes, in either
  scope. An admin who may open one of them alone (Reservation and Sales read the classes,
  not the vehicles) sees that page's row in Fleet's place, with no drill.
- A location's Pages: All pages (the tiles and the saved addresses), each page with its
  standing, and Saved addresses, a jump to their card.
- A location's Settings: General, its state as the note, and History, the date of the last
  change as the note.
- All locations' Settings, for SUPER: Users, Admins, Activity, Media. The Settings screen
  of BL-42 (payment, policies, emails) joins it when it is built.

### On the rail

Decided on 2026-10-25, once a review found that the rail reached only a drill's first page:
with the sidebar collapsed, nothing led to Drivers, Vehicle classes, Admins, Activity, Media
or a location's History. Two ways were drawn and both liked; the first is built.

- **Built: each page its own icon.** Collapsed to a rail, Fleet and Settings, in either
  scope, lay their pages out as icons of their own, together on a tint, so each is one
  click away, as every page was on the rail before the drills. The rail shows no Fleet or
  Settings icon: each page's tooltip names it under the drill, as "Fleet / Vehicle
  classes", with its line where it has one ("Fleet / Vehicles: 3 vehicles in service").
  The icons are the drill's own, so the rail and the open drill show the same three. A
  location's Pages stays one icon: its pages are its editors, all reached from All pages.
- **Kept for later: a list beside the rail.** The rail stays one icon per section, and a
  drill's icon opens its pages in a small list beside it, with their notes and dots as in
  the drill: a shorter rail for two clicks. Worth taking up if the rail grows too long,
  say once BL-42's settings join All locations' Settings. `@repo/ui`'s `Menu`, opened to
  the right, would draw it.

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

### Search

Added on 2026-10-25, after shadcn's command menu, with no AI: the box in the top bar, or
Ctrl + K (⌘ K on a Mac, as the box says on each device), opens a palette over the page.

- Before anything is typed it lists Recent, the last five rows the admin opened from it,
  newest first, then what they may add across locations. The pages are the sidebar's, so
  they are not listed again (changed on 2026-10-25 from the pages of the scope on screen,
  which made too long a list). Recent is kept in the browser for each admin
  (localStorage, keyed by their Clerk id); nothing goes to the server, and a row kept is
  what it was when opened.
- As they type it finds, in groups in this order: Pages (across locations and each
  location's, "Rates · Langkawi", with a location's Trip rules and Try a trip by their own
  names), Actions (New booking, Add vehicle, driver, class or
  location, and for each location Add zone and Put a class on sale), Locations, then
  Bookings, Vehicles, Drivers, Users, Vehicle classes and Zones. A group shows only when
  something in it matches, and only to an admin who may open it. "abd" can list a
  booking and a plate together.
- Pages, actions and locations are found in the browser, out of what the console
  already holds, at the first key. Records are asked of the server from two letters, a
  moment after the typing rests, cancelled when it changes: each kind matched as its own
  list matches it, or by its id pasted whole, five at most, all kinds at once. Each
  opens inside its location, where it lives.
- A search that takes longer than 150 ms shows a spinner in the box and "Searching…"
  under the rows; a quick one shows neither, so nothing flickers. Enter opens the row
  marked, the first unless the arrows moved it. The box takes the keys as the palette
  opens, and an Esc at its end says how to close it.
- Not searched: Activity, a log rather than records to open, and Media, whose file names
  nobody searches by. Admins are found among Users.
- Cost: plain `contains` queries on our own database, a handful per pause in the typing,
  each capped; no outside service. Trigram indexes (`pg_trgm`) are the remedy if one
  grows slow.

### On a phone

Added on 2026-10-25, after Vercel's dashboard on a phone. The top bar keeps the picker and
the admin's own menu; the sidebar's toggle and the search move to a bar floating at the
foot of every page: Search, then the menu button.

- The menu opens as a panel over the page, all of it but a narrow margin. In place of the
  brand mark it has the location picker, so the admin sees which location the menu is
  of; picking another keeps the panel open on that location's menu.
- The palette takes the same room as the menu.
- The bar stays over both. The button of what is open turns into an X to close it (the
  menu's, or Search's as Close), and the other button opens its own in its place. A tap
  in the margin closes either.
- A press on the bar is felt as a light tap: the Vibration API on Android, a hidden
  switch turned on an iPhone (iOS 18), nothing elsewhere.
- Both fade in and rise a little. Pages keep room at their foot for the bar, and toasts
  stand above it.
- A location's page has no strip of its tabs under its name any more: the menu holds
  them, a tap away on the bar.

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
  tabs under its header goes, with `LinkTabs`, on 2026-10-25: the dock's menu holds them.
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
- Search: `_components/ConsoleSearch.tsx` (the palette),
  `_components/palette-index.ts` (pages, actions and locations), `GET /api/search`
  (`_lib/console-search.ts` for its answer) over `findBookingMatches` and the finders of
  `@repo/db`'s `console-search.ts`; `@repo/ui`'s `command-palette` (cmdk in a native
  `<dialog>`). The booking search, its route and `@repo/ui`'s `search-menu` go.
- On the rail: a drill whose `spreadOnRail` is set (`MenuDrill`) is drawn by `RailPages` in
  `ConsoleMenu`, on `@repo/ui`'s `SidebarMenuCluster`. A collapsed row's label stays for
  screen readers (`SidebarLabel`), so an icon's link is named.
- The Rates tab's parts are named once, `RATES_PART_LABELS` in `_lib/routes.ts`, for the
  cards, their jumps and the search.
- `@repo/ui`'s `Sheet` slides from its edge (`.ui-sheet` in its styles).
- On a phone: `@repo/ui`'s `SidebarDock` (the floating bar, felt through `haptic`) and
  the sidebar's panel in place of its sheet (`.ui-pop`). `ConsoleSearch` sits round the
  console so the header's `SearchBox` and `ConsoleDock` both reach the palette; Recent
  is `_components/palette-recent.ts`. `@repo/ui`'s `Menu` opens in the dialog it is in,
  so the picker works in the panel. A drill's way in is `.ui-swap-in`. `@repo/ui` gains
  `MenuIcon`.
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
