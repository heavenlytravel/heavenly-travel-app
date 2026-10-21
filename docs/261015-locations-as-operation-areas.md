# Locations as operation areas: coverage, rates and bookings per location

Proposed on 2026-10-15, decided on 2026-10-16 ("Decisions to confirm" at the end),
and revised the same day after the first review: the zones are the coverage, so a
location no longer owns districts. This document wins over `260930-coverage.md` (the
state and district screens), over "A location names its districts" in
`261001-locations-and-pages.md`, and over "Pricing" in `260923-car-with-driver.md`. The
work is built in one thread and committed piece by piece, in the order under "Pieces".

## Why

The console is organised by table: bookings here, coverage there, vehicle classes in a
third place, locations under Marketing. The business is organised by place. Langkawi has
its own fleet, its own price list and its own partner contracts; so does Penang; the
Klang Valley will. A new place means a page, the districts it serves, the vehicles sold
there and their prices, and then the bookings that arrive. Today those live on four
screens for three teams, and nothing ties them together.

The price list is the clearest case. A partner contract is a grid: a row per route
(Langkawi Airport to Cenang, Ferry Terminal to Pantai Kok), a column per vehicle class,
one price in each cell, a surcharge for odd hours. The site prices by road distance with
a per-state multiplier, which no contract matches. Admins must be able to enter the grid
as it is.

So: the location becomes the operation area. It lies in its states, draws the zones it
serves, sells its classes at its rates, and holds its bookings. The console's home is
the list of locations, the sidebar lists them, and every team works inside one.

## Decisions

### A location is a name, a slug and its states

- A location is the three things only a person can say: a name, a slug, and the states
  it lies in. Penang is Penang; the Klang Valley is Kuala Lumpur, Putrajaya and
  Selangor, and the KLIA to KL route prices as one grid. Nothing else is asked when it
  is added; the rest of the setup follows on its page.
- The states scope the location: its saved addresses have to lie in one of them
  (placed by their coordinates, as a pickup is), and the map of its coverage draws the
  districts of those states in grey, so what is covered can be seen against what is
  not. Two locations may share a state.
- The name and slug are free. `/selangor` is a location named Selangor in Selangor;
  `/langkawi` is in Kedah. The slug rules of `261001` stand.
- The tagline, the short line on a home page card and over the landing page's headline,
  is Marketing copy and lives with the rest of it: on the landing page, in its editor,
  published with the page. `Location.tagline` goes.
- What goes: "a district holds any number of locations", and "a location owns its
  districts". Bukit Bintang and KLCC are not locations; they are places, or zones,
  inside Kuala Lumpur. Pages for such areas are a Marketing follow-up, not part of this
  plan.
- Pages, saved addresses, the preview, the home page's top choices: unchanged.

### Coverage is the zones

- A location serves a pickup when the pickup falls in one of its zones. There is no
  other switch: the zones an admin draws are the coverage, and the same zones are the
  rows of the price list. The first zone of a new location is usually the whole area
  (the island, as one drawn shape, its mukims or a 25 km circle around Kuah); the
  airport, the jetty and the beach strips come as zones of their own, for the grid,
  cut out of it. Zones never overlap, within a location or across locations (revised
  2026-10-21, see "Zones and zone-to-zone rates"); a pickup outside every zone is told
  the area is not served.
- `locationAt(place)` answers the zone the point falls in and the location that zone
  belongs to, among the locations that are public (live or paused). Since zones never
  overlap, a point is in one zone of one location at most; of two saved before that
  rule, the smallest still wins. `quoteTrip` starts there.
  A draft location serves nothing, whatever it has drawn.
- Districts stay as a fixed list for placing an address: a booking records the
  district its pickup fell in, for the record and the booking screens, and the
  coverage map draws the district outlines under the zones. The old per-district
  switch and the Coverage screen (`/coverage`, `/coverage/[code]`) go, and so does the
  state multiplier: rates are set per location.
- "Test an address" stays, on the console home. It says which zone and location a
  place falls in, or that no live location serves it, with the district for the
  record.

### Vehicle classes: one catalogue, sold per location at the location's rates

- `VehicleClass` becomes a catalogue: category, name, description, seats, luggage, the
  three rules, sort order. Its rates come off it.
- A location sells a class through an offering, `LocationVehicleClass`: the class, an
  active switch, and the location's metered rates for it (base fare, per km, hourly,
  minimum). Langkawi's Sedan and Penang's Sedan are the same catalogue class with
  different rates.
- The location's Vehicle classes tab lists its offerings in a table like today's. "Add
  class" picks from the catalogue, or creates a catalogue class and the offering in one
  form, so a team that only knows its own location never leaves it.
- The catalogue screen (`/vehicle-classes`) stays for the shared fields, behind
  `coverage.manage`. A class with no offering is sold nowhere.
- A class sold in one place only is a catalogue class with one offering: "Premium SUV"
  in the catalogue, offered by Langkawi, offered nowhere else, shown on no other
  location's options page.
- Why not a class per location: the name, seats, luggage and rules repeat for every
  location, drift apart, and the customer's options page shows "Sedan" three ways. The
  catalogue keeps one Sedan.
- The offering is what a location sells; the fleet, later, is the vehicles it sells it
  with: units with a plate, based at the location, each of one catalogue class, assigned
  to bookings. A location can offer a class before it has a unit of it, as it does
  today.
- A booking item already snapshots the class and its rates in the price breakdown, so
  nothing historical changes.

### Zones and zone-to-zone rates

The partner grid, as data:

- A **zone** belongs to a location: a name ("Langkawi Airport", "Town / Cenang /
  Tengah") and a shape the admin draws on a map, the zone maker. The map is Google's
  JavaScript map, in the admin only, behind a browser key restricted to the admin's
  hosts (`NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY`). It is a second key in the same Google
  Cloud project as the server key, not a new account or billing: the server key is
  restricted by API and never leaves the server, while a map key is sent to every
  browser that opens the zone maker, so it is restricted by HTTP referrer (the admin's
  hosts and localhost) and to the Maps JavaScript API alone. The map draws the
  location's districts in outline, from the same geoBoundaries shapes coverage uses,
  so a zone is drawn in context; a district outline is coverage, a zone is a line on
  the price list, and the two stay separate.
  A zone starts one of three ways and is reshaped from there; no corner is clicked out
  by hand (revised 2026-10-17, after the first try at corner-by-corner drawing):
  - **A district or mukim**, picked from the list of Malaysia's districts (the
    location's own states first): its official boundary from the same geoBoundaries
    data, islands included, for a whole district such as Langkawi or Timur Laut. It
    stays the boundary as it is (`drawnFrom: { districtCode, label }`), read again from
    the code on every save so it never drifts from the data, until "Reshape by hand"
    frees it (`{ reshapedFrom, label }`, the district a reference only). The boundaries
    are simplified already: 136 corners for the median district, 653 for Kudat, the
    most. Since 2026-10-21 the district can instead be **some of its mukims**: after
    the district, "The whole district" or "Some of its mukims", ticked in a list or
    clicked on the map. The mukims are the areas below a district from geoBoundaries
    ADM3 (see `260930-coverage.md`): Peninsular mukims with the bandar and pekan cut
    out of them, and Sarawak's land and town districts. Sabah and Putrajaya have none,
    so their districts offer the whole district only. Ticked mukims are put together
    into one outline, `{ districtCode, mukimCodes, label }`, read again from the codes
    on every save like a district, until reshaped (`{ reshapedFrom, mukimCodes, label }`).
    Neighbouring mukims share their borders exactly, so they merge with no slivers and
    two zones of neighbouring mukims meet without overlapping.
  - **An address**, searched with the autocomplete the saved addresses use: a circle
    of the given radius around it, for an airport or a ferry terminal, then reshaped
    like any other. The place and the radius are a reference only
    (`{ placeId, label, radiusM }`); a new radius redraws the circle while it is
    untouched.
  - **Draw**: a circle or a square in the middle of the map's view, to move and reshape
    into a beach strip or a town (`drawnFrom: null`).

  The zone is edited piece by piece (revised 2026-10-21: Google's own editing put a
  handle on all 800 corners of Kuah's 37 islands, another halfway along every edge, and
  dragged them all together). The tools sit in a bar at the bottom of the map, there in
  full screen too: the pencil to edit, the hand to only move the map, a square and a
  circle to add a piece in the middle of the view, the bin to delete the piece selected,
  and Undo. With the pencil a click selects a piece and only its corners show, thinned
  where they crowd closer than 12 pixels until the map is zoomed in. Drag a corner to
  move it, or the inside of the piece to move that piece alone; right-click a corner to
  remove it, an edge to add one, or the inside of any piece to delete it. The map pans
  and zooms around them all the while. Each gesture is one step of Undo, and neither an
  edit nor an undo moves the view; the map frames the zone only when a district or a
  place is newly picked (`piece-editor.ts`). A
  district as it is works without the map, so a server without the browser key still
  makes zones. A zone is stored as one closed ring or, a district's islands, as
  polygons, at most 2,000 corners in all (1,000 until 2026-10-21; Kuah and Kedawang
  together have 1,043), so the quote has one test, `zoneAt` in `zone-match.ts`, over
  both. Only a district or its mukims as they are have the shape read again by the
  server; every other shape is the admin's drawing and is stored as posted. The map
  shows the location's districts in outline, its other zones in blue and other
  locations' zones in amber, so a new one is made in context and clear of them.

- The Coverage tab draws every zone in its own colour on the map and lists them beside
  it, each row with its colour, how it was made and the priced routes it is an end
  of. Pointing at a zone on the map names it beside the pointer and lights its row;
  pointing at a row lights the zone; a click on either opens the zone maker.
- A zone may lie anywhere, inside the location's districts or far outside them. A zone
  is a line on the price list, not coverage. Penang can have a zone "Kuala Lumpur" and
  a row "Penang Airport to Kuala Lumpur" on its grid: outstation prices are the same
  grid, not a second concept. Since the zones are the coverage, such a zone takes
  pickups there for Penang too, and it may not overlap a zone of the location there.
- Zones never overlap, this location's or another's (2026-10-21). `createZone` and
  `updateZone` refuse a shape that covers more than 0.002 km² of another zone (about 45
  m by 45 m: the rounding of borders drawn to meet), under an advisory lock so two
  saves at once cannot both pass. The refusal names the zones in the way, and the zone
  maker offers "Cut them out", which takes their ground off the new zone
  (`cutOutOverlaps`); a district or its mukims cut that way become the admin's own
  shape. The console home's "Test an address" names the zone a place falls in, next to
  its location and district.
- A **zone rate** is one cell: from zone, to zone, vehicle class, price. Entered on a
  grid, one row per route and one column per offered class, as in the contract. A route
  is read both ways: the quote looks up (from, to), then (to, from). A cell left empty
  means no fixed price for that route and class.
- The grid is edited as a spreadsheet, so a contract goes in as it is: the classes
  grouped under their category, the route column held in view while they scroll, the
  arrow keys and Enter moving between cells, and a block copied from a spreadsheet
  pasted from the cell it lands in ("RM 1,020" reads as 1020.00). A cell that is not
  a price is marked, changed cells are shaded until saved, one bar at the foot counts,
  saves or discards the changes, and leaving with any unsaved asks first. "Add route"
  opens a dialog: the two zones, only the pairs not on the grid yet so a pair has one
  row, then the route's price per class; it saves the route at once.
- An **odd-hours surcharge** is set on the location: a window (23:00 to 07:00) and
  what it adds, either a percentage of the trip's price or a flat amount in RM
  (`oddHoursPercent` or `oddHoursFlatSen`, exactly one). It applies to every trip
  that starts in the window.
- "Driver tipping, bus only" is a flat add-on per class. Not in this plan; a later
  `addOnSen` on the offering when a contract needs it.

The quote, for a one-way trip: place the pickup and the drop-off in the location's
zones. If both land in a zone and the offering has a rate for that route, the price is
the rate. Otherwise the price is metered from the offering's rates, as today. Hourly
hire is the offering's hourly rate, as today. The surcharge is applied last. The
breakdown records which it was: the route and the rate, or the distance and the metered
rates, and the surcharge.

Why not district to district: Langkawi is one district. Every route in the contract is
inside it. Districts answer "do we serve this pickup"; zones answer "what does this
route cost". Why not zone to zone only: a hotel outside every zone still gets a price,
from the metered rates, and the site never says "ask us" for a trip inside a served
district.

### Pickup here, drop-off anywhere

The price always follows the pickup. The zone the pickup falls in names the location,
and the location's offerings, zones and rates price the trip, wherever the drop-off is.
A pickup at KLIA going to Penang is priced by the Klang Valley; the same trip the other
way by Penang. This is today's rule (the quote checks the pickup only) kept.

For the drop-off, the location chooses one of three rules, `Location.dropoffRule`,
from the loosest to the strictest (`DROPOFF_RULES` in `rates-input.ts`):

1. **Drop-offs anywhere** (`anywhere`, the default): both ends in the location's zones
   with a rate for the class gets the grid price; since a zone may be an outstation
   destination, a Penang to KL row prices that trip. Anything else is metered, from the
   offering's base, per km and minimum and the road distance. A hotel outside every
   zone, or a town with no row on the grid, gets a price without anyone asking. Penang
   and Selangor keep this.
2. **Drop-offs inside this location only** (`zones`): the drop-off must fall in one of
   the location's zones; the grid price where the route has one, metered otherwise. A
   drop-off outside every zone gets the quote error `dropoff-outside`: "We only serve
   drop-offs within Langkawi from that pickup." For a fleet that does not leave its
   island, where a road route to the mainland is a ferry crossing that no per-km rate
   should price.
3. **Only the routes on the rate grid** (`grid`): the drop-off must fall in a zone, and
   the route between the two zones must have a price on the grid; a route with none
   gets the quote error `route-not-served`: "We only serve the routes on our price
   list from that pickup." The rule is strict per class: a class with an empty cell on
   the route is not offered on it, shown on the options page as "Not offered on this
   route" and refused at the confirm step. Nothing is metered. For a location that runs
   fixed transfers from a contract price list and nothing else. Langkawi sets this.

Whatever the rule, the pickup must be in a zone, and hourly hire, which has no
drop-off, is untouched by it. The pickup must be served; the drop-off is the
location's choice.

### Bookings per location

- `BookingItem` gets `locationId`, set at booking from the zone the pickup fell in, next
  to the `districtCode` it already keeps for the record. A zone redrawn later does not
  rewrite history.
- The location's Bookings tab is the bookings list narrowed to the location, with the
  same status filters and the same table. The global list stays for the queue across
  locations and gains a Location column and filter.
- Staff-entered bookings go through the same quote, so they carry a location too.

### Who may do what

The location page is split into tabs, each its own route with its own single permission
check, as every console page has today.

| Tab             | Route                               | Permission         | Team                     |
| --------------- | ----------------------------------- | ------------------ | ------------------------ |
| Overview        | `/locations/[slug]`                 | `locations.view`   | Every team               |
| Details         | `/locations/[slug]/details`         | `locations.manage` | Marketing                |
| Vehicle classes | `/locations/[slug]/vehicle-classes` | `coverage.manage`  | Operation                |
| Coverage        | `/locations/[slug]/coverage`        | `coverage.manage`  | Operation                |
| Rates           | `/locations/[slug]/rates`           | `coverage.manage`  | Operation                |
| Pages           | `/locations/[slug]/pages`           | `locations.manage` | Marketing                |
| Bookings        | `/locations/[slug]/bookings`        | `bookings.view`    | Ops, Res, Sales, Finance |
| History         | `/locations/[slug]/history`         | `locations.view`   | Every team               |

A location's address in the console is its slug, the same as its public page:
`/locations/langkawi/rates`. A draft's slug can still change; saving the new one moves
the admin to the new address. `new` is set aside, since `/locations/new` adds one.

The tabs are in the order a location is set up (next section), with the rates right
after the coverage whose zones they price, then the bookings and the history. Coverage is the zones
on the map; Rates is the grid between them, which grows with the zones and the classes
on sale and needs the page's whole width, with the drop-off rule under it, since the
rule decides what an empty cell means, then the odd-hours surcharge. Rates is not a
setup step: a location with no row on the grid is metered.

- `locations.view` is new: any team. The overview of a draft is its setup checklist; of
  a live or paused location, the day's operation: bookings awaiting confirmation,
  pick-ups today and awaiting a driver in numbers, then today's pick-ups and the
  bookings awaiting confirmation as lists for the teams that work the queue. Under
  either, "At a glance": a card for each other tab the admin may open, with what it
  holds in a line or two (the states and addresses, the classes on sale, the zones,
  the priced pairs and the rules, the pages, the latest three changes) and a link in.
  The whole history is its own tab, newest first by day, narrowed by part of the
  location. Tabs the admin may not open are not shown.
- `locations.activate` is new: `super`. The state move (draft to live, live to paused,
  paused to live) and Delete belong to SUPER. Marketing prepares the pages and Operation
  the classes, the coverage and the rates inside a draft location; SUPER flips it, once
  every setup step is done.
- Adding a location stays Marketing's (`locations.manage`): the name, slug and state.
  Operation takes it from there. Both teams see it in draft.
- The console home (`/`) is the locations overview, behind `dashboard.view`: one card per
  location with its main page's hero image, its state, its states, its zones, its classes
  on sale, its queue, how far its setup has come, "Add location" for Marketing, "Test an
  address" below. The Dashboard cards go; every number they held is now on the cards. The
  count awaiting confirmation links to those bookings only for an admin with
  `bookings.view`; for the others it is a number.
- The console's place search (`/api/places/search`), behind "Test an address", the zone
  maker and the saved addresses, answers a signed-in admin only (`locations.view`). The
  customer site's copy of the same handler stays open to everyone.
- Sidebar: the admin picks a location first and works inside it. The first group is
  Locations: "All locations" (the home) at its head, then every location, one name per
  row with a disc coloured by its state, and "Add location" at its foot for Marketing.
  Under it, Operations (Bookings, Vehicle classes), Marketing (Home page) and Access
  (Admins, Activity). Coverage goes. The header's trail reads "Locations / Langkawi /
  Coverage".
- Location panel: inside a location a second column sits on the page's right, after
  shadcn's sidebar-15. On top, the location's name, slug and state. Then its sections
  (the tabs the admin may open), each with one line on where it stands ("2 classes on
  sale", "3 zones, 4 routes priced", "Landing page published", "1 awaiting
  confirmation", "2 pick-ups today"), numbered and ticked while the location is a
  draft; how far its setup has come, with what to do next; and the facts about it
  (states, saved addresses, top choice, went live, last change). The queue and the
  pages are on those rows and in full on the overview, so the panel does not repeat
  them in groups of their own (it did at first, and the overview showed them twice
  beside each other). A section with something to list has a chevron that opens it
  as a submenu: Vehicle classes its classes, on sale or off, and "Add class";
  Coverage its zones and "Add zone"; Rates its grid, drop-offs and odd hours, each
  with where it stands; Pages each page with its standing; Bookings each status. The
  section on screen opens by itself; one opened or closed by hand stays so while the
  admin moves around the location. At the foot, the public page once it is live. The column collapses to a rail of the section icons
  by its own toggle or its edge, remembered in its own cookie (`panel_state`) apart
  from the sidebar's, so one can be open while the other is a rail; the rail keeps the
  sections and the public page, with each row's words as its tooltip, and the numbers
  and facts come back with the width. The panel is a column from `xl` up; below that the
  same panel opens as a sheet from the right, from a button at the right end of the
  console header, and closes on a move to another path; there a strip of the tabs
  under the location's header keeps the sections one tap away on a tablet or a phone.

### Setting a location up

A new location is set up in four steps, one per tab, in this order. The console walks
the admin through them: while the location is a draft, the panel says how many steps
are done and what to do next, with a link to that tab, and its rows for the steps
carry each step's number, ticked once done; and the Overview tab is the checklist
itself, each step with where it stands, what is left, and a link to its tab for an
admin who may open it. Once live, the checklist leaves the overview, which turns to the
day's operation; each step's standing stays on its row in the panel. The four steps and
what "done" means, from `setupSteps` in `location-input.ts`, the one place the rule
lives:

| #   | Step            | Done when                                                               | Team      |
| --- | --------------- | ----------------------------------------------------------------------- | --------- |
| 1   | Details         | The location lies in at least one state (always, since adding needs it) | Marketing |
| 2   | Vehicle classes | At least one class is on sale, with its rates                           | Operation |
| 3   | Coverage        | At least one zone is drawn                                              | Operation |
| 4   | Pages           | The landing page is published and no published page has edits waiting   | Marketing |

The classes come before the coverage because the rate grid's columns are the classes
on sale: a route cannot be priced before there is a class to price it for.

"Go live" is the same list: `stateMoveBlockers` is the to-dos of the steps not done,
and SUPER's button is disabled until the list is empty. A zone is a requirement because
the zones are the coverage: a live location with none serves no pickup. A route on the
grid is not required: a trip inside a zone with no row on the grid is metered at the
class's rates, which step 2 guarantees, so a per-km city with one big zone is a
complete setup. The earlier draft of this document required a priced route; that was
relaxed with the move to zones as coverage.

## Data model

```
Location
  + states             State[]   the states it lies in; implicit many-to-many
  + oddHoursFromMinute Int?      23:00 as 1380; both null when no surcharge
  + oddHoursToMinute   Int?      07:00 as 420
  + oddHoursPercent    Int?      what it adds: a percentage, or
  + oddHoursFlatSen    Int?      a flat amount; exactly one with the window
  + dropoffWithin      Boolean   default false: drop-offs anywhere
  - districtCodes                (after the one-off copy below)
  - tagline                      (after the copy: it is on the landing page's content)

District
  - isActive                     (after the copy: coverage is the zones)

PageContent (the landing page's JSON)
  + tagline String               empty on a product page

VehicleClass
  - baseFareSen, perKmSen, hourlyRateSen, minimumFareSen

LocationVehicleClass            an offering
  id, locationId, vehicleClassId, isActive
  baseFareSen, perKmSen, hourlyRateSen, minimumFareSen
  @@unique([locationId, vehicleClassId])

Zone
  id, locationId, name, sortOrder
  shape Json                    one closed ring of [lng, lat], or a district's polygons
  drawnFrom Json?               where it started: { districtCode, label } a district
                                as it is, with mukimCodes some of its mukims as
                                they are; { reshapedFrom, label } a district, or
                                with mukimCodes its mukims, reshaped;
                                { placeId, label, radiusM } a circle around an address;
                                null a circle or square drawn on the map

ZoneRate
  id, locationId, fromZoneId, toZoneId, vehicleClassId, priceSen
  @@unique([fromZoneId, toZoneId, vehicleClassId])

BookingItem
  + locationId String?
```

The price breakdown gains `route: { fromZone, toZone, rateSen } | null` and
`surcharge: { percent, amountSen } | null`; `multiplier` goes. `isTripPriceBreakdown`
accepts both shapes so old bookings still render.

One-off copies, run once per database after `db:push`, as
`pnpm --filter @repo/db db:migrate-locations`, and again with `:prod`:

1. Each location with no state yet lies in the states of the districts its
   `districtCodes` named.
2. Each location with no zone yet gets one zone per district its `districtCodes` named,
   drawn from the district's boundary (its largest polygon; the smaller islands of a
   district are left for the admin to add as circles). So Langkawi and Penang serve on
   the day of the deploy what they served the day before, and the admin refines from
   there.
3. Each location's tagline goes onto its landing page, in the draft and the published
   copy, where neither has one.
4. For each location and each active class, create an offering with the class's rates
   times the multiplier of the location's first state. Then the columns can go in the
   next push.
5. Each booking item with no location takes the location whose zone its pickup falls in.

### The activity log

| Action                                      | Logged                                           |
| ------------------------------------------- | ------------------------------------------------ |
| `location.updated`                          | as before, with the state codes among the fields |
| `location.offering.created`                 | after: class, rates                              |
| `location.offering.updated`                 | before and after of the changed fields           |
| `location.zone.created / updated / deleted` | the zone's name and shape                        |
| `location.dropoff.updated`                  | before and after: the drop-off rule              |
| `location.rates.updated`                    | before and after: the changed cells              |
| `location.surcharge.updated`                | before and after                                 |
| `location.state.changed`                    | unchanged; now SUPER's                           |

## The customer site

- The options page reads the pickup's location and lists its active offerings, priced
  as above. A class with no offering at that location is not shown.
- The location pages' "from RM 80" (`startingPriceSen`) reads the location's offerings,
  not the catalogue.
- The confirm page, emails and account pages read the booking's snapshot.

### The search card

Added 2026-10-21. On a location's pages the search card keeps to the location
(`location-search.ts` for the card, `search-areas.ts` on the server):

- The pick-up suggests places in the box around the zones and the districts they lie
  in (a zone lies in a district when 5% of it is there), with 5 km for the coast. The
  districts, not the zones: with three small zones on Langkawi a customer still finds
  every Langkawi hotel, and Alor Setar and Kuala Lumpur stay out. A box is all Google's
  autocomplete takes, so a strip of a neighbouring district can fall inside it
  (Butterworth's shore in Penang's).
- Nothing is checked while the customer picks. On "Get my price", once the card's own
  checks pass, the places are checked against the zones (`checkTripAt`, through the
  web's `checkTripAction`, whose details calls end Google's autocomplete sessions),
  and a place the location cannot take is said at its field: "We do not pick up from
  The Datai Langkawi yet. Choose a pick-up in Langkawi." The button reads "Finding
  prices…" meanwhile. A check that cannot answer lets the search through; the options
  page checks again.
- The drop-off follows the location's rule. Anywhere: all of Malaysia. Inside this
  location, or only the routes on the grid: the pick-up's box, with the zone, and for
  the grid the route from the pick-up's zone, checked on "Get my price". The "Popular
  in" list offers only the saved addresses in a zone under either.
- The areas are cached with the location's pages under its tag; zone, grid and
  drop-off rule changes refresh them. The cache key carries a version: a cached answer
  outlives a deploy, so a change to `LocationSearch`'s shape bumps it. The pages stay
  static. The home page and the options page's trip bar search all of Malaysia. The
  quote stays the last word.

## Pieces

Built together in one thread and shipped as one PR, #43 (2026-10-18), squashed into one
commit on `main`. The table is the order the work was planned and described in.

| #   | Commit                                      | Holds                                                                                                                                                                                                                                                                                                                          |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `docs: locations as operation areas`        | This document                                                                                                                                                                                                                                                                                                                  |
| 2   | `feat(admin): the console around locations` | `Location.states`, the tagline on the landing page, the copy script, the location's tabs, the setup checklist and overview, `locations.view` and `locations.activate`, SUPER's state move, the home as the locations overview, the sidebar with the locations, the location panel, `/coverage` and the district switch removed |
| 3   | `feat(admin): bookings per location`        | `BookingItem.locationId`, the Bookings tab, the Location column and filter on the global list                                                                                                                                                                                                                                  |
| 4   | `feat: vehicle classes sold per location`   | Offerings and their rates, the catalogue without rates, the Vehicle classes tab, the multiplier removed, the quote and the options page on offerings, `startingPriceSen` per location                                                                                                                                          |
| 5   | `feat: zones as coverage, with zone rates`  | Zones and the zone maker (map, browser key), the Coverage and rates tab with the coverage map, `locationAt` in the quote, the rate grid, the odd-hours surcharge, the drop-off rule, the quote's route match, the breakdown's new shape                                                                                        |

Fleet (vehicle units based at a location, assigned to bookings) is the step after, with
its own document.

## Decisions to confirm

All six were settled on 2026-10-16; the sixth replaced the first's "a district belongs
to one location" after the first review.

1. A location may span states. The Klang Valley is one location. Bukit Bintang and KLCC
   become places, or zones, inside it, not locations.
2. One class catalogue, rates per location, rather than a class per location.
3. Zones are drawn on a map in the admin, as a polygon or a circle around a place, and
   may lie outside the location. Zone rates are read both ways. A route with no rate is
   metered from the location's rates. This needs a browser Google key for the admin.
4. SUPER alone moves a location's state and deletes it. Marketing adds it. Every team
   opens it; each tab keeps its team's permission.
5. The price follows the pickup. Each location chooses "drop-offs anywhere" or
   "drop-offs inside this location only"; Langkawi takes the second.
6. The zones are the coverage. A location is added with its name, slug and state only;
   what it serves is what it draws. Districts stay for placing an address and as the
   grey outlines under the zones. A location needs a zone to go live, not a priced
   route.
