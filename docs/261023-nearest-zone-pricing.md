# Nearest-zone pricing: every trip priced from the rate grid

Decided by the CEO on 2026-10-23, after the interactive map of Langkawi (Sedan) built on
the zones and the rate grid as they are. It replaces two things. The first is the
2026-10-21 rule of "no per km anywhere": per km comes back, but only for the road past a
zone's edge. The second is the metered fallback and the three drop-off rules of
`261015-locations-as-operation-areas.md` ("Pickup here, drop-off anywhere"). Built on
this branch on 2026-10-23; "As built" below lists where the build differs from the plan.
The user's answers of 2026-10-23 are under "Decisions".

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

### Nearest in a straight line is not nearest by road

The zone is always decided **by road**. The straight line only orders the zones to ask
about (see "Measuring with Google"). Two real places in Langkawi, checked with Google
routes on 2026-10-23, to test with:

- **Mak Ngah Kotiaw** (restaurant at Teluk Ewa, 6.41679, 99.76731, place id
  `ChIJh5KKPAB7TDARfUAC1-UxPqs`). In a straight line its nearest zone is Datai (3.4 km).
  By road, Tanjung Rhu's edge is 4.95 km and Datai's 5.16 km, so its zone is **Tanjung
  Rhu**.
- **Homestay Mahsuri** (Ulu Melaka, 6.33895, 99.77426, place id
  `ChIJoxCjvp15TDARAwF6y1Ad4e8`). In a straight line its nearest zone is Kuah Town. By
  road, Kuah Town's edge is 5.73 km and the Airport's 5.75 km. Twenty metres decide
  which family of prices it gets, so it is a good test of a near tie: a small change in
  Google's roads can flip it.

### A trip that does not pass through the nearest zone

Airport to Mak Ngah Kotiaw, by Google: the road goes north to Teluk Ewa directly, and
never passes through Tanjung Rhu.

| | km |
|---|---|
| Extra road, Mak Ngah Kotiaw to Tanjung Rhu's edge | 4.95 |
| Grid trip, Airport edge to the Tanjung Rhu entry spot | 15.62 |
| Trip, Airport edge to Mak Ngah Kotiaw | 19.13 |
| What the trip really adds over the grid trip | 3.51 |

- **If the trip were shorter than the grid trip**, nothing is added, as for Blue: the
  fare is the Airport to Tanjung Rhu cell, RM80.
- **It is longer, but by less than the extra road.** The rule as agreed adds the whole
  extra road: RM80 + 4.95 x RM2.50 = **RM92.38**, for 4.95 km the car does not
  drive past the grid trip.
- **Proposed fix, open:** add the smaller of the extra road and what the trip adds over
  the grid trip: RM80 + 3.51 x RM2.50 = **RM88.78**. When the road does pass through the
  zone, as for Orange, the two are the same (9.57 - 8.80 = 0.77 km, the extra road), so
  every agreed example keeps its fare. It only trims trips like this one. It reverses
  the earlier answer "the whole extra road, even 10 m longer", so it goes back to the
  CEO.

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
| **A. Address to a nearby zone** | Finding an end's nearest zone, its entry spot and its extra road. The quote routes from the address to a point inside each candidate zone and finds where each line first crosses into the zone. The shortest wins. | For each end outside every zone | 1 per candidate zone, in straight-line order, stopping as below |
| **B. The trip** | The trip's length from the zone edge, or from the address. One route pickup to drop-off; the part inside a starting zone is cut at its last exit, and the part inside the ending zone at its first entry. | Whenever an end is outside every zone. Also kept for the receipt's full distance. | 1 |
| **C. The grid trip** | The same, between the two stand-ins: the zone's edge or the end's entry spot | Whenever an end is outside every zone | 1 |

| Trip | Today | New |
|---|---|---|
| Zone to zone (Airport to Pantai Kok) | 1 | 1 (B, for the receipt only; the price needs no distance) |
| Zone to no zone (Airport to Orange) | 1 | up to 3 (A) + 1 (B) + 1 (C) = **up to 5** |
| No zone to no zone (Orange to Blue) | 1 | up to 3 + 3 (A) + 1 + 1 = **up to 8** |

How this is kept small:

- **The candidate zones are few, and none is skipped wrongly.** The zones are taken in
  order of their straight-line distance to the address, within the furthest extra road.
  The quote routes to each in turn, and stops when the next zone's straight-line
  distance is longer than the shortest extra road found so far. A road is never shorter
  than the straight line, so no zone left unasked could be nearer by road. There is no
  fixed cap: a cap of 3 could drop the zone that is nearest by road. Usually one or two
  calls.
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
| 2 | none | - | - | Zones within 15 km of Orange in a straight line, nearest first: Pantai Kok, Datai, Airport, and on | dotted straight lines to the three zone edges |
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

Wanted by the user on 2026-10-23, to test prices in the app before customers see them,
and to see how each price is worked out. It does in the console what the two demo
pages did (`pricing-map.html` and `calls.html`, outside the repo in
`C:/Users/User/.claude-work/projects/C--Users-User-Desktop-project-heavenly-travel-app/review-shots/osm/`):
a map, and the calculation step by step. It is a card on the location's Rates tab,
shown to anyone who can see the tab, with the page's own access check. It makes no
booking and writes nothing.

### Inputs

- **Pickup and drop-off**: each a place field (the booking form's), or a click on the
  map, which drops a pin there. Pins can be dragged. The price is worked out again
  when a pin is dropped, not while it moves, since every try makes real Google calls.
- **Class** (Sedan first) and **pickup time** (for the odd-hours surcharge).
- **Examples**: one button per row of the live check list for this location
  (`scripts/price-check.json`, see "Testing"), so the plan's examples are one click
  away. For Langkawi these are Airport to Pantai Kok, Airport to Orange, Airport to Blue,
  Orange to Airport, Orange to Blue, Kuah Town to Kuah Town, Airport to Mak Ngah Kotiaw
  and Kuah Town to Homestay Mahsuri. One list serves both the script and the buttons.
  A row names its places by place id, or by a pin (lat, lng) for a spot with no place,
  such as Orange and Blue.

### The map

Google Maps, as the zone editor uses. It shows:

- the location's zones, filled and named;
- the pins;
- the trip in dark ink, from the zone edge or the address;
- each extra road, dashed orange;
- the grid trip, dotted green, between the green zone-edge dots and the purple entry
  spots;
- in the step view, each Google route's full line in grey, and the point inside each
  candidate zone it was routed to.

### Two views of the result

**The calculation** (shown first), as in the pricing demo:

1. Each end's zone: "inside Airport", or "outside every zone; nearest by road is
   Tanjung Rhu, 4.95 km to its edge". When it differs, also "nearest in a straight line
   is Datai, 3.4 km, but its road is longer".
2. The base price: "grid Airport to Tanjung Rhu = RM80.00", or "not on the grid yet",
   with a link to the cell on the grid below.
3. The grid trip and the trip, in km, each saying where it is measured from.
4. Longer or not, and what is added: "0.77 km x RM2.50 = RM1.94". If the cap applies, it
   says so: "the trip adds 3.51 km over the grid trip, less than the 4.95 km extra road".
5. The fare, then the surcharge and the model charge, as the receipt shows them.

**Step by step** (a tab beside it), as in the call-by-call demo. Back and Next walk
through every step of the quote. Each step says what we asked Google (or "no call"),
what Google answered, and what we worked out. The map redraws for that step only:

1. Which zone each end is in (no call).
2. The zones near an address outside every zone, in straight-line order (no call; the
   straight lines drawn).
3. One step per route to a candidate zone (call A): the grey line, the first crossing
   into the zone, that zone's extra road.
4. The nearest zone, and the others it beat (no call). Shows "from the cache" when the
   answer was kept from an earlier quote, and that no call was made.
5. The trip (call B): the full line grey, the part measured dark.
6. The grid trip (call C): the full line grey, the part measured dotted green.
7. The price (no call).

Under the steps: **calls made by this try**, and what they would cost past Google's
free allowance (US$0.005 each).

### How it is built

- **One code path.** It calls the same `quoteTrip` as the website, so what it shows is
  what a customer would be charged, with the pickup's location pinned to the tab's.
  It also shows the refusals as the customer would see them, with the reason in Ops'
  words: "beyond the furthest extra road: 18.2 km, the limit is 15 km", "the drop-off is
  in Penang, and trips across locations are off".
- **The trace.** `quoteTrip` takes an optional recorder. When one is given, each step
  above is recorded with its geometry: the route lines (decoded), the crossing points,
  and the distances. The recorder wraps the router, so every Google call is logged as it
  is made, and a cached answer is logged as such. The website passes no recorder and
  pays nothing for it. The server action behind Try a trip returns the quote and the
  trace; the card draws both. The trace is never stored.
- **Tests.** The layer 2 quote tests also check the trace for the Langkawi examples:
  the steps in order, the number of calls, and that the trace's figures are the
  receipt's.

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
   (`scripts/price-check.json`: two places and the expected fare, also Try a trip's
   example buttons) and prints a table,
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
5. **Try a trip** on the Rates tab: the map, the calculation and the step by step view,
   from `quoteTrip`'s trace (see "Try a trip, on the Rates tab").
6. **The live check script** (layer 3), with Langkawi's rows.

**Not in this PR**: dropping the columns that stop being read (`Location.dropoffRule`,
the offerings' `baseFareSen` and `minimumFareSen`, the catalogue's old rate columns).
As with every column before, they are dropped in a small follow-up once this PR runs on
every database, so a `db:push` can never remove a column the deployed code still
reads.

## As built

Where the build differs from the plan above, or settles what it left open:

- **The live check lives in `@repo/places`**: `pnpm --filter @repo/places price:check`,
  beside `check-coverage`, because it needs Google's router and `@repo/db` does not
  depend on `@repo/places`. The named trips are `packages/db/data/price-check.json`,
  read by `tryTripExamplesAt` for Try a trip's examples, but for the CEO demo's
  made-up spots (Orange, Blue), marked `liveCheckOnly`. Rows whose fare depends on
  Google's kilometres print without an expected fare until Ops confirms one.
- **The cap on the extra** is `EXTRA_CAPPED` in `packages/db/src/zone-trip.ts`, off:
  the whole extra road, as agreed. Turning it on is that one line.
- **The pure rule** is `zone-trip.ts` (geometry, nearest zone by road, the fare), and
  **the placing of a trip** is `zone-quote.ts` (both ends, the measures, the trace),
  pure but for the router, so the layer 2 tests hand it a fake one. `quoteTrip` loads
  the rows and prices the classes.
- **Trips across locations defaults to off** for every location after `db:push`, and
  `maxExtraKm` to 15. A location that sold routes out before (Kuala Lumpur to KLIA)
  stops selling them until Ops switches it on; the rows stay on the grid.
- **A class with no cell** is in the quote with no price and "Not offered on this
  trip". With no cell for any class, the trip is refused.
- **Try a trip's map** uses Google's classic markers for the draggable pins. A route
  asked again within ten minutes is answered from memory and not billed, but the trace
  still counts it, so the count is an upper bound.
- **"Test an address"** on the console's home page still names only the zone a point
  falls in; a pickup outside every zone is placed by Try a trip, which routes.

### Added on 2026-10-24

Asked by the user after the first review on staging:

- **A free extra road**, `Location.freeExtraKm`, default 0. Each end outside every zone
  pays only for its road past it: with 3 km free, an address 5 km past the edge pays
  2 km. Two ends outside each get their own free km. 0 keeps the rule as agreed with
  the CEO. The furthest extra road stays the limit past which a trip is not priced.
- **Whole km**: the extra road charged is rounded up to the next km, once, after the
  free km and both ends are added (`chargedKmOf`). Airport to Orange is now the
  Pantai Kok cell plus 1 km. The receipt keeps `freeKm` and `chargedKm`; receipts from
  before keep their unrounded km.
- **A weekend and holiday surcharge**, per location: the weekdays it applies on (the
  location's own weekend: Kedah's is Friday and Saturday), a list of holiday dates (Ops
  adds them; public holidays differ by state), and a percentage or a flat amount, by the
  pickup's local date. It is added beside the odd-hours surcharge, each worked on the
  price before either. It shows on the receipt as "Weekend" or "Public holiday". Off
  until a location switches it on.
- **One "Trip rules" card** on the Rates tab holds the extra road (free up to, served
  up to, drawn as one bar), cross-location (a switch; "trips across locations" is now
  "cross-location" everywhere), the odd-hours surcharge and the weekend and holiday
  surcharge, each behind its switch, with one save. Each part that changed is logged as
  its own entry, so the older entries still read.
- **One "Add route" button**: with cross-location on, its dialog's "To" also lists
  other locations' zones, by location. The separate "Add a route to another location"
  button is gone, which changes the decision "routes out are added from their own
  button".
- **Try a trip on the Rates tab, full screen if wanted**: the trip's settings along
  the top, the map on the left, the price and the calculation on the right. A button
  over the map puts all three in the browser's full screen, as the zone maker does;
  there is none where the browser cannot (an iPhone). Below a wide screen the parts
  stack, a tap on a road says what it measures, and picking a calculation line brings
  the map back into view. The class
  starts on Sedan and the day on tomorrow, any day can be picked, and an end may be as
  far as 100 km past its zone: a try is not held to a booking's limits. What a customer
  would meet instead (sent to WhatsApp, too far ahead, the class's booking rules) is
  said over the price. Pointing at a road on the map says what it measures; picking a
  line of the calculation lights its roads up. "Copy breakdown" copies the trip and
  its receipt as text.

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

0. The cap on the extra (see "A trip that does not pass through the nearest zone"):
   the whole extra road, or the smaller of it and what the trip adds. Proposed: the
   smaller. Build it behind one function so the answer is a one-line change.

1. Each location's furthest extra road. The plan starts Langkawi at 15 km.
2. Google's tier for routes with a line: Essentials (checked 2026-10-23). Confirm the
   bill after the first month.
