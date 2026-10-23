# Nearest-zone pricing: every trip priced from the rate grid

Decided by the CEO on 2026-10-23, after the interactive map of Langkawi (Sedan) built on
the zones and the rate grid as they are. It replaces two things. The first is the
2026-10-21 rule of "no per km anywhere": per km comes back, but only for the road past a
zone's edge. The second is the metered fallback and the three drop-off rules of
`261015-locations-as-operation-areas.md` ("Pickup here, drop-off anywhere"). This is a
plan. Nothing in it is built yet. The open questions are under
"Decisions to confirm" and are answered before any code.

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

## The drop-off rules: suggestion

**Why "In Penang" shows in Langkawi's Add route dialog.** The dialog's "To" list
offers every other location's zones (`listZonesElsewhere`) whenever the drop-off rule
is not "inside this location only". Langkawi's rule is "Only the routes on the rate
grid", which allows routes out. Nothing checks that a road connects the two locations,
so Penang's districts (Barat Daya, Timur Laut) are offered to an island.

**With nearest-zone pricing, the three rules have nothing left to decide.** Every
address that a road connects to a zone gets a price, and there is no metered price any
more, so "anywhere", "inside the zones" and "grid only" collapse into one behaviour.
What a location still needs to say is **how far past its zones it drives**. Without
that, a Kuala Lumpur pickup to Penang would be priced as the nearest KL zone plus
350 km of extra road.

Suggested, for discussion before any code:

1. **Remove the drop-off rule** (`Location.dropoffRule`, `DROPOFF_RULES`, the form on
   the Rates tab, `dropoffAllowed`, `dropoffZonesOf`, the "Not offered" logic tied to
   "grid"). Remove the metered fallback with it: an offering's base fare and minimum
   fare stop pricing anything. Its per km becomes **the rate per extra km**. Hourly
   hire stays as it is.
2. **Add one setting per location: the furthest extra road**, `Location.maxExtraKm`
   (whole km, required, suggested default 15 km for Langkawi; Ops to say). An end whose
   extra road is longer, or with no road to any zone, cannot be priced. The customer
   is sent to WhatsApp, as today's refusals are.
3. **Ferries never count as road.** The route request sets Google's `avoidFerries`, so
   Langkawi to the mainland has no road and is refused by point 2, not priced.
4. **Routes out stay, in their own place.** A priced route to another location's zone,
   such as Kuala Lumpur to KLIA, still wins over everything above. The Add route dialog
   offers only this location's zones (and the within-zone cell). A second button, "Add
   a route to another location", lists the other locations' zones by location. This
   ends the Penang entries in Langkawi's everyday dialog without deciding reachability
   in code.
5. **A pickup outside every zone is served**, by the location of its nearest zone by
   road, within that location's furthest extra road. Today it is refused.

This also closes the gap parked on 2026-10-21, where Kuala Lumpur wanted metered trips
inside KL, a fixed price to KLIA and no metered trip to Penang. KL's grid and KLIA's
route out price the first two, and the furthest extra road refuses the third.

## When a trip cannot be priced

| Case | What the customer sees |
|---|---|
| No zone within the furthest extra road, or no road at all (an island, a ferry) | "We do not serve that area yet. Message us on WhatsApp." |
| The cell is empty for every class | "We do not have a price for that trip yet. Message us on WhatsApp." |
| The cell is empty for some classes | Those classes show "Not offered on this trip", as today's "Not offered on this route" |
| Google cannot route right now | "We cannot price that route right now. Try again later." (today's `distance-unavailable`) |

## Measuring with Google

Google's Routes API gives a road distance between two places. It cannot answer "where
does the road first enter a zone". The quote works that out from the route's line.

- **Route with a line.** `roadDistance` becomes `route(from, to)` and asks for
  `routes.polyline.encodedPolyline` with `distanceMeters`, `DRIVE`, `TRAFFIC_UNAWARE`
  and `avoidFerries`. It stays memoised per pair of place ids.
- **Entry and exit along a line** (pure, in `@repo/db`): walk the decoded line, find
  where it first enters a given zone and where it last leaves one, and measure along
  the line. Lengths are scaled so that the whole line equals Google's
  `distanceMeters`.
- **Nearest zone by road** for an address outside every zone: take the zones whose
  edge is within the furthest extra road in a straight line (usually one to three).
  Route from the address to a point inside each, and take the first entry along each
  line. The nearest entry wins. That is one to three calls, memoised per address.
- **Trip**: one route between the two places. The part inside a starting zone is cut
  off at its last exit, and the part inside an ending zone at its first entry.
- **Grid trip**: one route between the two stand-ins (the zone's edge spot or the end's
  entry spot), cut the same way.

About four calls for a trip with one end outside every zone. That is two today: one
for the distance, plus the resolve. Calls are memoised, so the options, confirm and
create steps of one search pay once. The keyless provider used in local development
keeps answering with straight lines, so the app still runs without a key.

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

## Testing

Asked: test in the app, or run a test backend? Suggested: both, in three layers, with
the first two as the gate.

1. **Unit tests of the pure pieces** (`node --test`, as `pricing.test.ts` today): the
   fare arithmetic, the entry and exit along a line, the trimming of a trip at zone
   edges, the choice of nearest zone, rounding, and old receipts. The geometry uses
   small made-up shapes: square zones and straight or L-shaped roads with known
   lengths. No network, no database, no licence questions over stored map data.
2. **Quote tests with a fake router.** `quoteTrip` takes the router as an argument (the
   app binds Google's), so a test hands it a fake whose lines are drawn by hand to
   rebuild the five Langkawi examples: Orange passes through Pantai Kok, Blue is
   reached before Datai. Each row of the examples table above becomes a test with its
   expected fare. A change that breaks the rule fails `pnpm test` before it is merged.
3. **A live check, run by hand** (`pnpm --filter @repo/db price:check`, like
   `packages/places/scripts/check-coverage.ts`). It reads the zones and the grid from
   a database, read only, and real routes from Google. It prices a list of named
   trips (`scripts/price-check.json`: two places and the expected fare) and prints a
   table, with a non-zero exit on any difference. Ops adds a row whenever a price is
   questioned. It writes nothing, so it is safe during official testing.

Later, in the app: a **"Try a trip"** panel on the location's Rates tab (pickup,
drop-off, class). It shows the receipt and the map of the demo: zone edges, entry
spots, the trip and the extra road, so Ops can check a price without making a booking.

## Build order

One PR each, in this order:

1. **The rule, pure.** `zone-trip.ts` in `@repo/db`: entry and exit along a line,
   trimming, nearest zone, and the fare with its receipt. `priceTrip` takes the zone
   trip, the metered branch goes, and `priceBreakdownOf` reads old receipts. Layer 1
   tests. Nothing calls it yet.
2. **Routes with lines.** `route(from, to)` with the polyline and `avoidFerries`, the
   polyline decoder, and the keyless provider's straight lines. `tripResolver` hands
   the quote a router instead of a distance.
3. **The quote.** `quoteTrip` prices by the rule. Pickups outside every zone are served
   by their nearest zone's location, and refusals follow the furthest extra road.
   Layer 2 tests. The website's and the console's price breakdown show the extra road.
4. **The grid and the rules.** The within-zone cell (parse, grid row, dialog). The
   furthest extra road replaces the drop-off rule on the Rates tab. Routes out get
   their own button. "Per km" is renamed "Rate per extra km", and base fare and minimum
   fare leave the screens. Schema: `Location.maxExtraKm` added. The user runs
   `db:push`.
5. **The live check script** (layer 3), with Langkawi's rows.
6. **Clean-up**, once every database has run 4: drop `Location.dropoffRule`, and the
   offerings' `baseFareSen` and `minimumFareSen`.

"Try a trip" comes after, in its own PR.

## Decisions to confirm

1. The drop-off rules go and the furthest extra road replaces them (above). Is that
   right, and what is Langkawi's furthest extra road?
2. Routes out move to their own button, so the everyday dialog lists this location's
   zones only.
3. The metered fallback goes: base fare and minimum fare stop pricing, and per km
   becomes the rate per extra km. Does anything still need a minimum fare?
4. The rate per extra km for MPV, Van and Coach. Only Sedan's RM2.50 is known.
5. The within-zone prices Ops wants first, and the missing pairs (Pantai Kok to Datai,
   Kuah Town, Tanjung Rhu and Cenang).
6. A pickup outside every zone is served (case 3). Confirmed by the four kinds of
   trip; listed so the refusal text can change.
7. Coach charter follows the same rule (it shares the grid today).
