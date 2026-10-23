# Nearest-zone pricing: every trip priced from the rate grid

Decided by the CEO on 2026-10-23, after the interactive map of Langkawi (Sedan) built on
the zones and the rate grid as they are. It replaces two things. The first is the
2026-10-21 rule of "no per km anywhere": per km comes back, but only for the road past a
zone's edge. The second is the metered fallback and the three drop-off rules of
`261015-locations-as-operation-areas.md` ("Pickup here, drop-off anywhere"). This is a
plan. Nothing in it is built yet. The user's answers of 2026-10-23 are under
"Decisions".

## Why

Today a trip is priced one of two ways. A trip between two zones with a grid price costs
that price. Anything else is metered (base fare, per km and minimum fare from the class's
offering), or refused, depending on the location's drop-off rule. Langkawi sets "Only
the routes on the rate grid". So in Langkawi:

- A pickup outside every zone is refused ("We do not serve that pickup area yet"),
  wherever it goes.
- A drop-off outside every zone is refused, and so is a trip between two zones whose
  cell is empty, such as Pantai Kok to Datai.
- A trip inside one zone, such as Kuah Town to Kuah Town, is refused, because the grid
  cannot hold it: `parseRateCells` answers "A route runs between two different zones".

Ops wants to sell every one of these from the grid they already keep, without a
second price list.

## The rule

Every one-way trip is priced as one cell of the grid, plus the road past a zone's edge
when the trip really goes past it.

1. **Each end gets a zone.** An end inside a zone uses that zone. An end outside every
   zone takes its **nearest zone by road**: the first zone its road reaches. The spot
   where that road meets the zone's edge is the **entry spot** (purple on the map). The
   road from the entry spot to the address is the end's **extra road**.
2. **Base price** = the grid's cell for the two zones and the class, read both ways.
   When both ends have the same zone, it is that zone's **within-zone price**, the
   grid's diagonal (new, see below).
3. **Two distances, both from the zone edges.**
   - **Grid trip**: by road from the first zone's edge, or the first end's entry spot,
     to the second zone's edge, or the second end's entry spot.
   - **Trip**: by road from the first zone's edge, or the first address when it is
     outside every zone, to the second zone's edge, or the second address.
4. **If the trip is longer than the grid trip**, add the whole extra road of each end
   outside every zone, at the class's rate per extra km. **Otherwise the fare is the
   base price.**
5. Round to the sen once, at the end. The receipt keeps every input (both zones, the
   entry spots, the three distances and the rate), as receipts do today.

In plain words: an address past a zone pays that zone's price plus the road past it.
An address on the way to a zone, reached before its edge, pays the zone's price and
nothing more.

Agreed with the CEO on 2026-10-23:

- Two ends outside every zone use their two nearest zones' cell, even when the trip is
  short. Orange to Blue below is 2.21 km and pays the Pantai Kok to Datai price.
- The extra is the whole extra road, not only the km by which the trip beats the grid
  trip. A trip 10 m longer than the grid trip pays the whole extra road.
- The price jumps where the nearest zone changes. Blue pays Datai's RM80, while Orange,
  2.2 km away, pays RM51.94. Noted and accepted.
- A trip inside one zone gets its own price on the grid.

### The four kinds of trip

| Kind | Example | Base | Extra |
|---|---|---|---|
| Zone to zone | Airport to Pantai Kok | the cell | none |
| Zone to no zone | Airport to Orange | the cell with the drop-off's nearest zone | the drop-off's extra road, if the trip is longer |
| No zone to zone | Orange to Airport | the same cell, read the other way | the same |
| No zone to no zone | Orange to Blue | the cell for the two nearest zones | both extra roads, if the trip is longer |

## Worked examples (Langkawi, Sedan)

The rate is RM2.50 per extra km, the figure from the CEO's mockup. Distances are from
the demo map, which ran on OpenStreetMap roads. Google's will differ by a little, so
the tests pin the arithmetic, not these kilometres (see "Testing").

Orange is on Jalan Teluk Yu (route 113), north of the Pantai Kok zone, at 6.3802,
99.6923. Blue is at Kampung Hijrah, west of the Datai zone, at 6.3898, 99.7084.

| Trip | Zones | Grid trip | Trip | Longer? | Fare |
|---|---|---|---|---|---|
| Airport to Pantai Kok | Airport, Pantai Kok | - | - | - | **RM50.00** |
| Airport to Orange | Airport, Pantai Kok (extra 0.77 km) | 8.80 km, Airport edge to Pantai Kok entry spot | 9.57 km, Airport edge to Orange | yes | RM50 + 0.77 x 2.50 = **RM51.94** |
| Orange to Airport | the same, read back | 8.80 km | 9.57 km | yes | **RM51.94** |
| Airport to Blue | Airport, Datai (extra 0.62 km) | 12.40 km, Airport edge to Datai entry spot | 11.78 km, Airport edge to Blue | no | **RM80.00** |
| Orange to Blue | Pantai Kok, Datai (extra 0.77 + 0.62 km) | 3.61 km, entry spot to entry spot | 2.21 km | no | the Pantai Kok to Datai cell, **empty today** |
| Kuah Town to Kuah Town | Kuah Town, both ends | - | - | - | the within-zone cell, **empty today** |
| Kuah Town to 2 km past Kuah Town's edge | Kuah Town, both ends (extra 2.00 km) | 0 km, the entry spot is on Kuah Town's edge | 2.00 km | yes | within-zone price + 2.00 x 2.50 |

What the examples show:

- **Airport to Orange**: the road to Orange runs through Pantai Kok and out of its north
  edge (the entry spot), so the trip is the grid trip plus the extra road.
- **Airport to Blue**: the road from the airport reaches Blue before it reaches the Datai
  zone, so Blue pays the plain Airport to Datai price. Measuring to The Datai itself
  (27.6 km, deep in the zone) was wrong, and the edges fix that.
- **Orange to Blue**: the trip needs the Pantai Kok to Datai cell. Until Ops fills it,
  the trip cannot be priced (see "When a trip cannot be priced").

The interactive map used for the CEO is outside the repo (review-shots/osm in the
assistant's workspace). It can go to the docs repo's `presentations/` if wanted.

## Within-zone prices

The grid gets its diagonal: a cell with the same zone at both ends prices a trip that
starts and ends in that zone, or that maps to it at both ends. Examples are Kuah Town to
Kuah Town, or a hotel in Cenang to the beach in Cenang.

- `ZoneRate` needs no new column: a row with `fromZoneId = toZoneId` is the cell.
  `parseRateCells` stops refusing it.
- The rate grid shows it as its own row per zone, "Within Kuah Town", first in that
  zone's group. The Add route dialog offers the same zone in "To", labelled "Within
  this zone".
- `routeRateOf` already finds it (forward and backward are the same row).
- A route out (to another location's zone) never has a diagonal.

## Where a location's trips may go

Decided on 2026-10-23. **The drop-off rule goes** (`Location.dropoffRule`,
`DROPOFF_RULES`, its form on the Rates tab, `dropoffAllowed`, `dropoffZonesOf`).
Nearest-zone pricing gives a price to every address that a road connects to a zone, so
"anywhere", "inside the zones" and "grid only" have nothing left to decide. Two
settings per location replace it, on the Rates tab:

1. **Furthest extra road**, `Location.maxExtraKm` (whole km, required). An end whose
   extra road is longer than this cannot be priced, and the customer is sent to
   WhatsApp. Without it, a Kuala Lumpur pickup to Penang would be priced as the nearest
   KL zone plus 350 km of extra road. Suggested to start at 15 km; Ops sets each
   location's.
2. **Trips across locations**, `Location.crossLocation` (on or off):
   - **Off, "This location only"**: both ends must map to this location's own zones.
     Routes to other locations' zones are not offered. Langkawi sets this, being an
     island. A Langkawi pickup to Penang finds no Langkawi zone within its furthest
     extra road (the road would have to cross the sea), so it is refused. It is never
     priced.
   - **On, "Also routes to other locations"**: as above, plus the routes out that this
     location prices to another location's zones. Penang can set this to sell
     Penang to KLIA.

Hourly hire has no drop-off, so neither setting touches it.

### Cross-location routes

A cross-location route is a **route out**: a row on the pickup location's grid from one
of its own zones to another location's zone. Penang to KLIA is a row on Penang's grid,
from Timur Laut to KLIA (Selangor's zone). Routes out exist today (`ZoneRate.toZoneId`
may be another location's zone). What changes is how they are added and when they count.

- **Adding one.** The everyday Add route dialog lists this location's zones only, plus
  the within-zone cell. A second button, **"Add a route to another location"**, shows
  only when trips across locations are on. Its "To" lists the other locations' zones,
  grouped by location ("In Selangor: KLIA"). This is also why "In Penang" showed in
  Langkawi's dialog today: the dialog offers every other location's zones whenever the
  drop-off rule is not "inside this location only", and Langkawi's is "grid only".
  Nothing checked that a road connects the two.
- **Pricing with one.** The price follows the pickup, as today. For a pickup in Penang,
  the zones its drop-off can map to are Penang's own, plus the zones its routes out end
  at. The nearest-zone rule then works as it does inside a location:

| Penang pickup in Timur Laut to | Drop-off maps to | Price |
|---|---|---|
| KLIA Terminal 1 (inside the KLIA zone) | KLIA, by the route out | the Timur Laut to KLIA cell |
| A hotel 3 km past the KLIA zone's edge | KLIA, its nearest zone by road (extra 3 km) | the cell + 3 km x the rate, if the trip is longer than the grid trip |
| Kuala Lumpur city (no route out to it) | no zone within Penang's furthest extra road | refused, WhatsApp |

- **One way only.** The row prices Penang to KLIA. KLIA to Penang starts in Selangor, so
  Selangor's grid prices it, with its own route out to a Penang zone. This is today's
  rule ("the price follows the pickup"), kept.
- **Switching trips across locations off** hides the routes out on the grid as "Not
  sold while trips stay in this location". It does not delete them, so switching it back
  on restores them.

### A pickup outside every zone

A pickup outside every zone is now served. It takes its nearest zone by road among all
the public locations' own zones (not their routes out). That zone's location prices
the trip, within that location's furthest extra road. Today such a pickup is refused.

## What a class's rates keep

Each location's offering of a class (`LocationVehicleClass`) keeps:

| Field | Becomes | Why |
|---|---|---|
| `perKmSen` | **Rate per extra km** | prices the extra road |
| `hourlyRateSen` | stays, **Per hour** | hourly hire is a separate trip mode, priced by the hour |
| `baseFareSen` | **removed** | only the metered price used it |
| `minimumFareSen` | **removed** | only the metered price, and the options page's "from RM", used it |

- **"From RM" on the options page** (`startingPriceSen`) becomes the class's cheapest
  cell on the location's grid, or its shortest hourly hire when that is less.
- **The catalogue's old rate columns** on `VehicleClass` (`baseFareSen`, `perKmSen`,
  `hourlyRateSen`, `minimumFareSen`, unread since 2026-10-15) go in the same clean-up.
- **Old receipts** keep their base fare and minimum fare in their JSON and still show
  them. `TripRates` makes the two fields optional for reading old receipts only.
- **The rates for MPV, Van and Coach** are placeholders until Ops gives them: RM3.50,
  RM4.50 and RM9.00 per extra km, beside Sedan's RM2.50. They are set in the offering
  form like any rate, not written by a script.
- The Rates tab's "Metered rates and rules" card becomes **"Rates and rules"**, with
  Rate per extra km, Per hour and the rules.

## When a trip cannot be priced

| Case | What the customer sees |
|---|---|
| No zone within the furthest extra road, or the road would cross the sea | "We do not serve that area yet. Message us on WhatsApp." |
| The drop-off is in another location's zone with no route out (or trips across locations are off) | the same |
| The cell is empty for every class | "We do not have a price for that trip yet. Message us on WhatsApp." |
| The cell is empty for some classes | Those classes show "Not offered on this trip", as today's "Not offered on this route" |
| Google cannot route right now | "We cannot price that route right now. Try again later." (today's `distance-unavailable`) |

## Measuring with Google: how many calls, and why

Google's Routes API answers one question: the road from A to B, with its length and,
when asked, its line on the map. It cannot answer "which zone does this road reach
first" or "how far is it from this address to that zone's edge". The quote works those
out itself, from the route lines. So it asks Google for more routes than today.

**Today**, a one-way quote makes **one** route call (pickup to drop-off, length only),
plus the place lookups the search already makes.

**With nearest-zone pricing**, it needs up to three kinds of route:

| Route | What it is for | When it is needed | Calls |
|---|---|---|---|
| **A. Address to a nearby zone** | Finding an end's nearest zone, its entry spot and its extra road. The quote routes from the address to a point inside each candidate zone and finds where each line first crosses into the zone. The shortest wins. | For each end outside every zone | 1 per candidate zone: the zones whose edge is within the furthest extra road in a straight line, at most 3, nearest first |
| **B. The trip** | The trip's length from the zone edge, or from the address. One route pickup to drop-off; the part inside a starting zone is cut at its last exit, and the part inside the ending zone at its first entry. | Whenever an end is outside every zone. Also kept for the receipt's full distance. | 1 |
| **C. The grid trip** | The same, between the two stand-ins: the zone's edge or the end's entry spot | Whenever an end is outside every zone | 1 |

| Trip | Today | New |
|---|---|---|
| Zone to zone (Airport to Pantai Kok) | 1 | 1 (B, for the receipt only; the price needs no distance) |
| Zone to no zone (Airport to Orange) | 1 | up to 3 (A) + 1 (B) + 1 (C) = **up to 5** |
| No zone to no zone (Orange to Blue) | 1 | up to 3 + 3 (A) + 1 + 1 = **up to 8** |

How this is kept small:

- **The candidate zones are few.** Only zones within the furthest extra road in a
  straight line, nearest first, at most 3. Usually one or two.
- **Caching.** Route A depends only on the address and the zones, so its answer
  (nearest zone, entry spot, extra road) is kept per place for a day. It is dropped when
  a zone of the location changes. Every route is memoised for 10 minutes, as today, so
  the options, confirm and create steps of one search pay once.
- **Zone to zone**, the most common trip, stays at one call.
- Each call is billed by Google; see "What it costs" below.

### Call by call: Airport to Orange

Simulated on the demo's roads (OpenStreetMap). Google's lines will differ a little.

| Step | Google call | We ask | Google answers | We work out | The map |
|---|---|---|---|---|---|
| 1 | none | - | - | The Airport pin is inside Airport; Orange is outside every zone | the two pins |
| 2 | none | - | - | Zones within 15 km of Orange in a straight line, nearest first, at most 3: Pantai Kok, Datai, Airport | dotted straight lines to the three zone edges |
| 3 | A | Orange to The Danna (inside Pantai Kok), with the line | a road and its line | The line first enters Pantai Kok after 0.77 km | grey route; orange dashes to a purple entry spot |
| 4 | A | Orange to The Datai (inside Datai) | a road and its line | It first enters Datai after 3.65 km | the same, for Datai |
| 5 | A | Orange to the airport (inside Airport) | a road and its line | It first enters Airport after 9.61 km | the same, for Airport |
| 6 | none | - | - | Nearest is Pantai Kok, extra road 0.77 km. Kept for a day for Orange | the winning dashes stay, the others fade |
| 7 | B | Airport pin to Orange, with the line | 10.65 km (kept on the receipt) | Cut at the line's last exit from Airport: the trip is 9.57 km | grey full route; dark from the green Airport edge to Orange |
| 8 | C | Airport pin to Orange's entry spot, with the line | a road and its line | Cut the same way: the grid trip is 8.80 km | green dots, Airport edge to the purple spot |
| 9 | none | - | - | 9.57 km is longer than 8.80 km, so RM50 + 0.77 km x RM2.50 = RM51.94 | trip, extra road and grid trip together |

Five calls. A second quote to Orange within the day makes two (steps 7 and 8), and
Airport to Pantai Kok makes one. The steps are also an interactive page (outside the
repo, review-shots/osm/calls.html); Try a trip shows the same list for a real trip.

### What it costs

Google bills each successful route request. Asking for the line and avoiding ferries
keep a request in the cheapest tier, **Compute Routes Essentials**. Pro is only
triggered by traffic-aware routing, 11 to 25 waypoints, waypoint optimisation, or side
of the road, heading and stopover. Enterprise is triggered by tolls, traffic on lines,
and two-wheeled or large-vehicle routing. None of these are used. Prices are from
Google's price list as read on 2026-10-23:

| Monthly route requests | Price per 1,000 |
|---|---|
| First 10,000 | free |
| 10,001 to 100,000 | US$5.00 |
| 100,001 to 500,000 | US$4.00 |

So a call costs US$0.005 once past the free 10,000 a month. A quote with five calls
costs US$0.025.

| Quotes a month | Calls at about 3 a quote | Cost a month |
|---|---|---|
| 1,000 | 3,000 | US$0 (free) |
| 3,000 | 9,000 | US$0 (free) |
| 10,000 | 30,000 | about US$100 |
| 30,000 | 90,000 | about US$400 |

"About 3 a quote" assumes most trips are zone to zone (1 call) and caching saves the
repeats. The free 10,000 is per billing account, shared by every app on it. Autocomplete
and place details are billed as today and do not change. Try a trip and the live check
make real calls too, so both are for people who need them. The live check prints its
call count.

The keyless provider used in local development answers with straight lines, so the app
and the tests run without a key.

## The receipt

`TripPriceBreakdown` gains one field, kept by `priceBreakdownOf` for old receipts
(null on them):

```ts
zoneTrip: {
  pickup:  { zone: string; nearest: boolean; extraKm: number };
  dropoff: { zone: string; nearest: boolean; extraKm: number };
  gridTripKm: number;
  tripKm: number;
  perKmSen: number;      // the class's rate per extra km when priced
  extraSen: number;      // 0 when the trip was not longer
} | null
```

`route` stays the cell used, and `distanceKm` stays the full road distance pin to pin.
The price breakdown on the website and in the console reads "Airport to Pantai Kok
RM50.00, extra road 0.77 km x RM2.50 RM1.94".

## Try a trip, on the Rates tab

Wanted by the user on 2026-10-23, to test prices before customers see them. It is a
card on the location's Rates tab, for anyone who can see the tab. It makes no booking
and writes nothing.

- **Inputs**: pickup and drop-off, each a place field (the booking form's) or a click on
  the map, which drops a pin there. Also the class, Sedan first, and the time, for the
  odd-hours surcharge.
- **The map** (Google Maps, as the zone editor uses) shows the location's zones, the
  trip in dark ink, each extra road dashed in orange, the zone edges the grid trip runs
  between in green, and the entry spots in purple. Pins can be dragged, and the price
  updates when one is dropped.
- **The calculation**, step by step beside the map, as in the demo:
  1. Each end's zone: "inside Airport", or "outside every zone; nearest by road is
     Pantai Kok, 0.77 km to its edge".
  2. The base price: "grid Airport to Pantai Kok = RM50.00", or "not on the grid yet",
     with a link to the cell.
  3. The grid trip and the trip, in km, each saying where it is measured from.
  4. Longer or not, and what is added: "0.77 km x RM2.50 = RM1.94".
  5. The fare, then the surcharge and the model charge, as the receipt shows them.
- **One code path.** It calls the same `quoteTrip` as the website, with the location
  pinned, so what it shows is what a customer is charged. It also shows the refusals
  ("beyond the furthest extra road: 18.2 km, the limit is 15 km").

## Testing

Asked: test in the app, or run a test backend? Both, in three layers, with the first two
as the gate. Try a trip is the fourth, for people.

1. **Unit tests of the pure pieces** (`node --test`, as `pricing.test.ts` today): the
   fare arithmetic, the entry and exit along a line, the trimming of a trip at zone
   edges, the choice of nearest zone, rounding, and old receipts. The geometry uses
   small made-up shapes: square zones and straight or L-shaped roads with known
   lengths. No network, no database, no licence questions over stored map data.
2. **Quote tests with a fake router.** `quoteTrip` takes the router as an argument (the
   app binds Google's), so a test hands it a fake whose lines are drawn by hand to
   rebuild the Langkawi examples: Orange passes through Pantai Kok, Blue is reached
   before Datai, Langkawi to Penang has no road. Each row of the examples becomes a
   test with its expected fare, and so do the furthest extra road, trips across
   locations on and off, and a route out. A change that breaks the rule fails
   `pnpm test` before it is merged.
3. **A live check, run by hand** (`pnpm --filter @repo/db price:check`, like
   `packages/places/scripts/check-coverage.ts`). It reads the zones and the grid from a
   database, read only, and real routes from Google. It prices a list of named trips
   (`scripts/price-check.json`: two places and the expected fare) and prints a table,
   with a non-zero exit on any difference. Ops adds a row whenever a price is
   questioned. It writes nothing, so it is safe during official testing.

## Build order

**One PR** (the user, 2026-10-23), built in this order of commits, each passing
`pnpm lint`, `pnpm check-types` and `pnpm test`:

1. **The rule, pure.** `zone-trip.ts` in `@repo/db`: entry and exit along a line,
   trimming, nearest zone, and the fare with its receipt. `priceTrip` takes the zone
   trip, the metered branch goes, and `priceBreakdownOf` reads old receipts. Layer 1
   tests.
2. **Routes with lines.** `route(from, to)` with the polyline, the polyline decoder, the
   keyless provider's straight lines, and the day-long cache of nearest zones.
   `tripResolver` hands the quote a router instead of a distance.
3. **The quote and the settings.** `quoteTrip` prices by the rule. Pickups outside every
   zone are served, and the furthest extra road and trips across locations decide the
   refusals. Schema: `Location.maxExtraKm` and `Location.crossLocation` are added, and
   the drop-off rule stops being read. The user runs `db:push`. Layer 2 tests. The
   website's and the console's price breakdown show the extra road.
4. **The grid and the Rates tab.** The within-zone cell (parse, grid row, dialog). The
   two settings replace the drop-off rule's form. "Add a route to another location" is
   its own button. The offering form and the rates card lose base fare and minimum
   fare, and per km is renamed "Rate per extra km". "From RM" reads the grid.
5. **Try a trip** on the Rates tab, with the list of calls it made (as in "Call by
   call" above).
6. **The live check script** (layer 3), with Langkawi's rows.

**Not in this PR**: dropping the columns that stop being read (`Location.dropoffRule`,
the offerings' `baseFareSen` and `minimumFareSen`, the catalogue's old rate columns).
As with every column before, they are dropped in a small follow-up once this PR runs on
every database, so a `db:push` can never remove a column the deployed code still
reads.

## Decisions

Answered by the user on 2026-10-23:

- The drop-off rule goes. In its place are the furthest extra road and trips across
  locations, per location.
- Langkawi keeps to itself (trips across locations off). Penang may sell routes out,
  such as Penang to KLIA.
- Routes out are added from their own button.
- Base fare and minimum fare go; per km is the rate per extra km. Hourly hire stays.
- MPV, Van and Coach take placeholder rates per extra km until Ops gives theirs.
- Ops fills the within-zone prices and the missing pairs later.
- Coach charter follows the same rule; both are transportation.
- Try a trip is built, with the map and the calculation.

Still open:

1. Each location's furthest extra road. The plan starts Langkawi at 15 km.
2. Google's tier for routes with a line: Essentials (checked 2026-10-23). Confirm the
   bill after the first month.
