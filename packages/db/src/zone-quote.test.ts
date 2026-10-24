import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LngLat } from "./geo";
import { priceTrip } from "./pricing";
import { routeRateOf } from "./zone-match";
import {
  emptyTrace,
  placeTrip,
  type NearestAnswer,
  type NearestCache,
  type QuoteLocation,
  type QuoteZone,
  type TripRouting,
} from "./zone-quote";
import { kmBetween, roundKm, type RoutePoint } from "./zone-trip";

/**
 * The plan's Langkawi examples rebuilt on the equator with square zones,
 * priced through `placeTrip` with a fake router: straight roads, except
 * where a test draws one by hand, and no road across the sea between
 * Langkawi and Penang. Each example is its own test with its fare.
 */

const DEG = kmBetween([0, 0], [1, 0]);
const SEDAN = "sedan";
const PER_KM = 250;

function square(
  id: string,
  west: number,
  south: number,
  east: number,
  north: number,
): QuoteZone {
  return {
    id,
    name: id,
    shape: [
      [west, south],
      [east, south],
      [east, north],
      [west, north],
      [west, south],
    ],
    inside: [(west + east) / 2, (south + north) / 2],
    version: "1",
  };
}

const airport = square("Airport", 0, 0, 0.1, 0.1);
const pantaiKok = square("Pantai Kok", 0.2, 0, 0.3, 0.1);
const datai = square("Datai", 0.2, 0.3, 0.3, 0.4);
const kuah = square("Kuah Town", 0.6, 0, 0.7, 0.1);
const timurLaut = square("Timur Laut", 3, 0, 3.1, 0.1);
const klia = square("KLIA", 5, 0, 5.1, 0.1);

const cell = (from: QuoteZone, to: QuoteZone, priceSen: number) => ({
  fromZoneId: from.id,
  toZoneId: to.id,
  vehicleClassId: SEDAN,
  priceSen,
});

function langkawi(extra: Partial<QuoteLocation> = {}): QuoteLocation {
  return {
    id: "langkawi",
    name: "Langkawi",
    slug: "langkawi",
    maxExtraKm: 15,
    freeExtraKm: 0,
    crossLocation: false,
    zones: [airport, pantaiKok, datai, kuah],
    zonesOut: [],
    zoneRates: [
      cell(airport, pantaiKok, 5_000),
      cell(airport, datai, 8_000),
      cell(kuah, kuah, 2_500),
    ],
    oddHours: null,
    weekend: null,
    ...extra,
  };
}

function penang(crossLocation: boolean): QuoteLocation {
  return {
    id: "penang",
    name: "Penang",
    slug: "penang",
    maxExtraKm: 15,
    crossLocation,
    zones: [timurLaut],
    zonesOut: [klia],
    zoneRates: [cell(timurLaut, klia, 30_000)],
    oddHours: null,
    weekend: null,
    freeExtraKm: 0,
  };
}

const selangor: QuoteLocation = {
  id: "selangor",
  name: "Selangor",
  slug: "selangor",
  maxExtraKm: 15,
  crossLocation: false,
  zones: [klia],
  zonesOut: [],
  zoneRates: [],
  oddHours: null,
  weekend: null,
  freeExtraKm: 0,
};

const at = (lng: number, lat: number): RoutePoint => ({ lng, lat });

// Orange: north-east of Pantai Kok, past it from the airport.
const orange = at(0.35, 0.05);
// Blue: south of Datai, reached from the airport before Datai.
const blue = at(0.25, 0.25);

/** Straight roads, but none across the sea between Langkawi (x < 1) and Penang or KLIA. */
function fakeRouting(nearest?: NearestCache): TripRouting & { asked: number } {
  const routing = {
    asked: 0,
    nearest,
    route: async (from: RoutePoint, to: RoutePoint) => {
      routing.asked += 1;
      if (from.lng < 1 !== to.lng < 1) return null;
      const line: LngLat[] = [
        [from.lng, from.lat],
        [to.lng, to.lat],
      ];
      return { distanceKm: kmBetween(line[0]!, line[1]!), line };
    },
  };
  return routing;
}

function memory(): NearestCache {
  const kept = new Map<string, NearestAnswer>();
  return {
    get: (key) => kept.get(key),
    set: (key, value) => kept.set(key, value),
  };
}

const near = (actual: number, expected: number, within = 2e-3) =>
  assert.ok(
    Math.abs(actual - expected) <= within,
    `${actual} is not ${expected}`,
  );

/** The trip placed and priced for a sedan, as the quote does; null for no cell. */
async function fare(
  locations: QuoteLocation[],
  pickup: RoutePoint,
  dropoff: RoutePoint,
) {
  const placed = await placeTrip(locations, { pickup, dropoff }, fakeRouting());
  assert.ok(placed.ok, placed.ok ? "" : placed.error.reason);
  const found = routeRateOf(
    placed.location.zoneRates,
    placed.pickup.zone.id,
    placed.dropoff!.zone.id,
    SEDAN,
  );
  if (!found) return { placed, price: null };
  const price = priceTrip({
    trip: { mode: "oneway", distanceKm: placed.distanceKm! },
    rates: { perKmSen: PER_KM, hourlyRateSen: 6_000 },
    route: {
      fromZone: placed.pickup.zone.name,
      toZone: placed.dropoff!.zone.name,
      rateSen: found.priceSen,
    },
    zoneTrip: placed.measure,
  });
  return { placed, price };
}

describe("nearest-zone quotes, Langkawi", () => {
  const locations = [langkawi(), penang(true), selangor];

  it("prices zone to zone at the cell, with nothing measured", async () => {
    const { placed, price } = await fare(
      locations,
      at(0.05, 0.05),
      at(0.25, 0.05),
    );
    assert.equal(placed.measure, null);
    assert.equal(price?.totalSen, 5_000);
  });

  it("adds the extra road to an address past the zone, as Airport to Orange", async () => {
    const { placed, price } = await fare(locations, at(0.05, 0.05), orange);
    const measure = placed.measure!;
    assert.equal(measure.dropoff.zone, "Pantai Kok");
    assert.equal(measure.dropoff.nearest, true);
    near(measure.dropoff.extraKm, 0.05 * DEG);
    near(measure.gridTripKm, 0.1 * DEG);
    near(measure.tripKm, 0.25 * DEG);
    assert.equal(
      price?.totalSen,
      5_000 + PER_KM * Math.ceil(measure.dropoff.extraKm),
    );
  });

  it("prices Orange to Airport the same, read the other way", async () => {
    const there = await fare(locations, at(0.05, 0.05), orange);
    const back = await fare(locations, orange, at(0.05, 0.05));
    assert.equal(back.price?.totalSen, there.price?.totalSen);
  });

  it("adds nothing to an address reached before its zone, as Airport to Blue", async () => {
    const { placed, price } = await fare(locations, at(0.05, 0.05), blue);
    assert.equal(placed.measure?.dropoff.zone, "Datai");
    assert.ok(placed.measure!.tripKm < placed.measure!.gridTripKm);
    assert.equal(price?.totalSen, 8_000);
  });

  it("needs the cell of both nearest zones, as Orange to Blue", async () => {
    const { placed, price } = await fare(locations, orange, blue);
    assert.equal(placed.pickup.zone.name, "Pantai Kok");
    assert.equal(placed.dropoff?.zone.name, "Datai");
    assert.equal(price, null);
  });

  it("prices a trip inside one zone at its within-zone cell", async () => {
    const { price } = await fare(locations, at(0.62, 0.05), at(0.68, 0.05));
    assert.equal(price?.totalSen, 2_500);
  });

  it("adds the road past the zone's edge to its within-zone price", async () => {
    const { placed, price } = await fare(
      locations,
      at(0.65, 0.05),
      at(0.75, 0.05),
    );
    near(placed.measure!.gridTripKm, 0);
    near(placed.measure!.tripKm, 0.05 * DEG);
    assert.equal(
      price?.totalSen,
      2_500 + PER_KM * Math.ceil(placed.measure!.dropoff.extraKm),
    );
  });

  it("serves a pickup outside every zone, by its nearest zone", async () => {
    const { placed, price } = await fare(
      locations,
      at(-0.05, 0.05),
      at(0.25, 0.05),
    );
    assert.equal(placed.location.id, "langkawi");
    assert.equal(placed.pickup.zone.name, "Airport");
    assert.ok(price);
  });
});

describe("where trips may go", () => {
  it("refuses a drop-off further than the furthest extra road", async () => {
    const placed = await placeTrip(
      [langkawi()],
      { pickup: at(0.65, 0.05), dropoff: at(0.9, 0.05) },
      fakeRouting(),
    );
    assert.equal(placed.ok, false);
    assert.equal(!placed.ok && placed.error.code, "dropoff-outside");
    assert.match(!placed.ok ? placed.error.reason : "", /15 km/);
  });

  it("refuses a drop-off in another location's zone while trips stay in the location", async () => {
    const placed = await placeTrip(
      [langkawi(), penang(true)],
      { pickup: at(0.05, 0.05), dropoff: at(3.05, 0.05) },
      fakeRouting(),
    );
    assert.equal(!placed.ok && placed.error.code, "dropoff-outside");
    assert.match(
      !placed.ok ? placed.error.reason : "",
      /in Penang, and cross-location is off/,
    );
  });

  it("refuses a drop-off no road reaches: across the sea", async () => {
    const placed = await placeTrip(
      [langkawi({ maxExtraKm: 100 })],
      { pickup: at(0.65, 0.05), dropoff: at(1.2, 0.05) },
      fakeRouting(),
    );
    assert.equal(!placed.ok && placed.error.code, "dropoff-outside");
    assert.match(!placed.ok ? placed.error.reason : "", /cross the sea/);
  });

  it("prices a route out when trips across locations are on, and its zone's nearest addresses", async () => {
    const locations = [langkawi(), penang(true), selangor];
    const inside = await fare(locations, at(3.05, 0.05), at(5.05, 0.05));
    assert.equal(inside.price?.totalSen, 30_000);
    const past = await fare(locations, at(3.05, 0.05), at(5.15, 0.05));
    assert.equal(past.placed.dropoff?.zone.name, "KLIA");
    assert.equal(past.placed.dropoff?.nearest !== null, true);
    assert.ok(past.price!.totalSen > 30_000);
  });

  it("refuses the route out when cross-location is off", async () => {
    const placed = await placeTrip(
      [langkawi(), penang(false), selangor],
      { pickup: at(3.05, 0.05), dropoff: at(5.05, 0.05) },
      fakeRouting(),
    );
    assert.equal(!placed.ok && placed.error.code, "dropoff-outside");
  });

  it("keeps a pinned location's pickup to it", async () => {
    const placed = await placeTrip(
      [langkawi(), penang(true)],
      { pickup: at(3.05, 0.05), dropoff: null },
      fakeRouting(),
      { pinned: langkawi() },
    );
    assert.equal(!placed.ok && placed.error.code, "not-served");
    assert.match(!placed.ok ? placed.error.reason : "", /Penang's zone/);
  });
});

describe("the trace", () => {
  it("records each step in order, the calls made, and the receipt's figures", async () => {
    const trace = emptyTrace();
    const placed = await placeTrip(
      [langkawi()],
      { pickup: at(0.05, 0.05), dropoff: orange },
      fakeRouting(),
      { trace },
    );
    assert.ok(placed.ok);
    assert.deepEqual(
      trace.steps.map((step) => step.kind),
      ["ends", "candidates", "route-to-zone", "nearest", "trip", "grid-trip"],
    );
    assert.equal(trace.calls, 3);
    const trip = trace.steps.find((step) => step.kind === "trip");
    const grid = trace.steps.find((step) => step.kind === "grid-trip");
    assert.equal(
      trip?.kind === "trip" && trip.route?.km,
      placed.measure?.tripKm,
    );
    assert.equal(
      grid?.kind === "grid-trip" && grid.route?.km,
      placed.measure?.gridTripKm,
    );
  });

  it("answers a nearest zone from the cache the second time, with no call for it", async () => {
    const cache = memory();
    await placeTrip(
      [langkawi()],
      { pickup: at(0.05, 0.05), dropoff: orange },
      fakeRouting(cache),
    );
    const trace = emptyTrace();
    const again = await placeTrip(
      [langkawi()],
      { pickup: at(0.05, 0.05), dropoff: orange },
      fakeRouting(cache),
      { trace },
    );
    assert.ok(again.ok);
    assert.equal(trace.calls, 2);
    const nearest = trace.steps.find((step) => step.kind === "nearest");
    assert.equal(nearest?.kind === "nearest" && nearest.cached, true);
    near(again.measure!.dropoff.extraKm, roundKm(0.05 * DEG));
  });

  it("refuses a trip when the router cannot answer, and keeps nothing it half answered", async () => {
    const cache = memory();
    const down: TripRouting = {
      nearest: cache,
      route: () => Promise.reject(new Error("timeout")),
    };
    const failed = await placeTrip(
      [langkawi()],
      { pickup: at(0.05, 0.05), dropoff: orange },
      down,
    );
    assert.ok(!failed.ok);
    assert.equal(failed.error.code, "distance-unavailable");
    const trace = emptyTrace();
    const again = await placeTrip(
      [langkawi()],
      { pickup: at(0.05, 0.05), dropoff: orange },
      fakeRouting(cache),
      { trace },
    );
    assert.ok(again.ok);
    const nearest = trace.steps.find((step) => step.kind === "nearest");
    assert.equal(nearest?.kind === "nearest" && nearest.cached, false);
  });

  it("gives a refusal from the cache with its first reason", async () => {
    const cache = memory();
    // Every road climbs 0.2° north first, so orange is too far by road.
    const detour: TripRouting = {
      nearest: cache,
      route: async (from, to) => {
        const line: LngLat[] = [
          [from.lng, from.lat],
          [from.lng, from.lat + 0.2],
          [to.lng, to.lat],
        ];
        return {
          distanceKm:
            kmBetween(line[0]!, line[1]!) + kmBetween(line[1]!, line[2]!),
          line,
        };
      },
    };
    const trip = { pickup: at(0.05, 0.05), dropoff: orange };
    const first = await placeTrip([langkawi()], trip, detour);
    const again = await placeTrip([langkawi()], trip, detour);
    assert.ok(!first.ok && !again.ok);
    assert.match(first.error.reason, /beyond the furthest extra road/);
    assert.equal(again.error.reason, first.error.reason);
  });
});
