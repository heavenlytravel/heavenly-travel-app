import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LngLat, Ring } from "./geo";
import {
  chargedExtraKm,
  chargedKmOf,
  extraKmOf,
  firstEntryKm,
  kmBetween,
  lastExitKm,
  lineBetweenKm,
  lineKm,
  nearestZoneByRoad,
  payableExtraKmOf,
  pointAtKm,
  roundKm,
  stretchesInside,
  trimmedKm,
  wholeKmUp,
  zoneCandidates,
  zoneTripCharge,
  zoneTripChargeOf,
  type PricingZone,
  type RoadRoute,
  type RoutePoint,
  type ZoneTripMeasure,
} from "./zone-trip";

/**
 * Made-up shapes on the equator, where a degree of longitude is the same
 * length everywhere: square zones and straight or L-shaped roads of known
 * lengths. No network, no database.
 */

const DEG = kmBetween([0, 0], [1, 0]);

/** A square zone from west to east and south to north, in degrees. */
function square(
  id: string,
  west: number,
  south: number,
  east: number,
  north: number,
): PricingZone {
  const shape: Ring = [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [west, south],
  ];
  return {
    id,
    name: id,
    shape,
    inside: [(west + east) / 2, (south + north) / 2],
  };
}

/** A road along the line, its length the line's own. */
const road = (...line: LngLat[]): RoadRoute => ({
  distanceKm: lineKm(line),
  line,
});

const near = (actual: number, expected: number, within = 1e-6) =>
  assert.ok(
    Math.abs(actual - expected) <= within,
    `${actual} is not ${expected}`,
  );

describe("stretchesInside", () => {
  const zone = square("a", 0, -0.05, 0.1, 0.05);

  it("finds where a straight road enters and leaves a zone", () => {
    const [stretch, ...rest] = stretchesInside(
      road([-0.1, 0], [0.3, 0]),
      zone.shape,
    );
    assert.equal(rest.length, 0);
    near(stretch![0], 0.1 * DEG);
    near(stretch![1], 0.2 * DEG);
  });

  it("starts at 0 for a road that starts inside, and ends at its end for one that ends inside", () => {
    assert.deepEqual(
      stretchesInside(road([0.05, 0], [0.06, 0]), zone.shape).length,
      1,
    );
    const [stretch] = stretchesInside(road([0.05, 0], [0.2, 0]), zone.shape);
    near(stretch![0], 0);
    near(stretch![1], 0.05 * DEG);
  });

  it("reads a road through a corner and along an edge", () => {
    const corner = stretchesInside(
      road([-0.1, -0.15], [0.2, 0.15]),
      zone.shape,
    );
    assert.equal(corner.length, 1);
    near(
      corner[0]![1] - corner[0]![0],
      kmBetween([0, -0.05], [0.1, 0.05]),
      1e-3,
    );
  });

  it("scales the line to the distance the router answered", () => {
    const [stretch] = stretchesInside(
      {
        distanceKm:
          2 *
          lineKm([
            [-0.1, 0],
            [0.3, 0],
          ]),
        line: [
          [-0.1, 0],
          [0.3, 0],
        ],
      },
      zone.shape,
    );
    near(stretch![0], 0.2 * DEG);
    near(stretch![1], 0.4 * DEG);
  });

  it("finds every stretch of a road that leaves and comes back", () => {
    const stretches = stretchesInside(
      road([-0.1, 0], [0.05, 0], [0.05, 0.2], [0.07, 0.2], [0.07, 0]),
      zone.shape,
    );
    assert.equal(stretches.length, 2);
  });
});

describe("firstEntryKm and lastExitKm", () => {
  it("is the first stretch's start and the last stretch's end", () => {
    const stretches: [number, number][] = [
      [1, 2],
      [5, 6],
    ];
    assert.equal(firstEntryKm(stretches), 1);
    assert.equal(firstEntryKm(stretches, 3), 5);
    assert.equal(firstEntryKm(stretches, 5.5), 5.5);
    assert.equal(firstEntryKm(stretches, 7), null);
    assert.equal(lastExitKm(stretches), 6);
    assert.equal(lastExitKm([]), 0);
  });
});

describe("pointAtKm", () => {
  it("walks the line by the router's km", () => {
    const route = road([0, 0], [0.1, 0], [0.1, 0.1]);
    const [lng, lat] = pointAtKm(route, 0.15 * DEG);
    near(lng, 0.1);
    near(lat, 0.05);
  });
});

describe("lineBetweenKm", () => {
  it("keeps the corners between the two distances, and the points at them", () => {
    const route = road([0, 0], [0.1, 0], [0.1, 0.1]);
    const part = lineBetweenKm(route, 0.05 * DEG, 0.15 * DEG);
    assert.equal(part.length, 3);
    near(part[0]![0], 0.05);
    assert.deepEqual(part[1], [0.1, 0]);
    near(part[2]![1], 0.05);
    assert.deepEqual(lineBetweenKm(route, 1, 1), []);
  });
});

describe("trimmedKm", () => {
  const start = square("start", 0, -0.05, 0.1, 0.05);
  const end = square("end", 0.3, -0.05, 0.4, 0.05);
  const route = road([0.05, 0], [0.35, 0]);

  it("measures from the starting zone's last exit to the ending zone's first entry", () => {
    near(trimmedKm(route, start.shape, end.shape).km, 0.2 * DEG);
  });

  it("measures from the address at an end in no zone", () => {
    near(trimmedKm(route, null, end.shape).km, 0.25 * DEG);
    near(trimmedKm(route, start.shape, null).km, 0.25 * DEG);
  });

  it("is 0 from a zone's edge to the same zone", () => {
    const toEdge = road([0.05, 0], [0.1, 0]);
    near(trimmedKm(toEdge, start.shape, start.shape).km, 0, 1e-3);
  });
});

describe("zoneCandidates", () => {
  const zones = [
    square("far", 1, -0.05, 1.1, 0.05),
    square("near", 0.1, -0.05, 0.2, 0.05),
    square("middle", 0.3, -0.05, 0.4, 0.05),
  ];

  it("orders the zones within the furthest extra road by straight line", () => {
    const candidates = zoneCandidates({ lat: 0, lng: 0 }, zones, 50);
    assert.deepEqual(
      candidates.map((c) => c.zone.id),
      ["near", "middle"],
    );
    near(candidates[0]!.straightKm, 0.1 * 111.32, 0.01);
  });
});

describe("nearestZoneByRoad", () => {
  // The address is at the origin. "west" is nearer in a straight line, but
  // its road runs round a bay: 0.1 down, 0.3 west and 0.1 back up.
  const west = square("west", -0.25, -0.05, -0.15, 0.05);
  const east = square("east", 0.2, -0.05, 0.3, 0.05);
  const roads: Record<string, RoadRoute> = {
    west: road([0, 0], [0, -0.1], [-0.2, -0.1], [-0.2, 0]),
    east: road([0, 0], [0.25, 0]),
  };
  const zones = [west, east];

  function router() {
    const asked: string[] = [];
    const route = async (_from: RoutePoint, to: RoutePoint) => {
      const zone = zones.find(
        (z) => z.inside[0] === to.lng && z.inside[1] === to.lat,
      )!;
      asked.push(zone.id);
      return roads[zone.id] ?? null;
    };
    return { asked, route };
  }

  it("takes the zone whose road reaches its edge first, not the straight line's", async () => {
    const { asked, route } = router();
    const candidates = zoneCandidates({ lat: 0, lng: 0 }, zones, 100);
    assert.equal(candidates[0]!.zone.id, "west");
    const nearest = await nearestZoneByRoad(
      { lat: 0, lng: 0 },
      candidates,
      route,
    );
    assert.equal(nearest?.zoneId, "east");
    near(nearest!.extraKm, roundKm(0.2 * DEG), 1e-3);
    near(nearest!.entry[0], 0.2);
    assert.deepEqual(asked, ["west", "east"]);
  });

  it("stops when the next zone is further in a straight line than the best road", async () => {
    const { asked, route } = router();
    const nearest = await nearestZoneByRoad(
      { lat: 0, lng: 0 },
      zoneCandidates(
        { lat: 0, lng: 0 },
        [east, square("far", 1, 0, 1.1, 0.1)],
        500,
      ),
      route,
    );
    assert.equal(nearest?.zoneId, "east");
    assert.deepEqual(asked, ["east"]);
  });

  it("is null when no road reaches a zone within the furthest extra road", async () => {
    const nearest = await nearestZoneByRoad(
      { lat: 0, lng: 0 },
      zoneCandidates({ lat: 0, lng: 0 }, zones, 10),
      async () => null,
    );
    assert.equal(nearest, null);
  });
});

/** Airport to Orange and its kin, Langkawi, Sedan: the plan's worked examples. */
const measure = (
  pickup: ZoneTripMeasure["pickup"],
  dropoff: ZoneTripMeasure["dropoff"],
  gridTripKm: number,
  tripKm: number,
): ZoneTripMeasure => ({ pickup, dropoff, gridTripKm, tripKm });

describe("zoneTripCharge", () => {
  const airport = { zone: "Airport", nearest: false, extraKm: 0 };

  it("adds the whole extra road, rounded up to the km, when the trip is longer than the grid trip", () => {
    const orange = { zone: "Pantai Kok", nearest: true, extraKm: 0.776 };
    const charge = zoneTripCharge(measure(airport, orange, 8.8, 9.57), 250);
    assert.equal(charge.chargedKm, 1);
    assert.equal(charge.extraSen, 250);
    assert.equal(charge.perKmSen, 250);
    // Read back the other way, the same.
    assert.equal(
      zoneTripCharge(measure(orange, airport, 8.8, 9.57), 250).extraSen,
      250,
    );
  });

  it("adds nothing when the trip is not longer, as for an address reached before the zone", () => {
    const blue = { zone: "Datai", nearest: true, extraKm: 0.62 };
    assert.equal(
      zoneTripCharge(measure(airport, blue, 12.4, 11.78), 250).extraSen,
      0,
    );
  });

  it("adds both ends' extra road for two ends outside every zone, rounded once", () => {
    const orange = { zone: "Pantai Kok", nearest: true, extraKm: 0.77 };
    const blue = { zone: "Datai", nearest: true, extraKm: 0.62 };
    const both = measure(orange, blue, 3.61, 4);
    assert.equal(extraKmOf(both), 1.39);
    assert.equal(chargedKmOf(both, 0), 2);
    assert.equal(zoneTripCharge(both, 250).extraSen, 500);
  });

  it("adds the extra road within one zone, from its edge", () => {
    const kuah = { zone: "Kuah Town", nearest: false, extraKm: 0 };
    const past = { zone: "Kuah Town", nearest: true, extraKm: 2 };
    assert.equal(zoneTripCharge(measure(kuah, past, 0, 2), 250).extraSen, 500);
  });

  it("charges only the road past the free km, of each end", () => {
    const five = { zone: "Datai", nearest: true, extraKm: 5 };
    const charge = zoneTripCharge(measure(airport, five, 10, 15), 250, 3);
    assert.equal(charge.freeKm, 3);
    assert.equal(charge.chargedKm, 2);
    assert.equal(charge.extraSen, 500);
    const two = { zone: "Pantai Kok", nearest: true, extraKm: 2.5 };
    assert.equal(payableExtraKmOf(measure(two, five, 10, 20), 3), 2);
    assert.equal(chargedKmOf(measure(two, five, 10, 20), 3), 2);
  });

  it("charges nothing within the free km", () => {
    const near = { zone: "Datai", nearest: true, extraKm: 2.9 };
    assert.equal(
      zoneTripCharge(measure(airport, near, 10, 13), 250, 3).extraSen,
      0,
    );
  });

  it("rounds up to the whole km, but not float noise", () => {
    assert.equal(wholeKmUp(0.3), 1);
    assert.equal(wholeKmUp(2), 2);
    assert.equal(wholeKmUp(2.0000001), 2);
    assert.equal(wholeKmUp(0), 0);
  });

  it("charges the whole extra road, even when the trip adds less", () => {
    assert.equal(chargedExtraKm(4.95, 3.51), 4.95);
  });

  it("reads back what it wrote, and nothing else", () => {
    const charge = zoneTripCharge(
      measure(airport, { zone: "Datai", nearest: true, extraKm: 1 }, 1, 2),
      250,
      0,
    );
    assert.deepEqual(
      zoneTripChargeOf(JSON.parse(JSON.stringify(charge))),
      charge,
    );
    assert.equal(zoneTripChargeOf(null), null);
    assert.equal(zoneTripChargeOf({ pickup: {} }), null);
  });

  it("reads a receipt from before the free km as the whole extra road, unrounded", () => {
    const old = {
      pickup: airport,
      dropoff: { zone: "Pantai Kok", nearest: true, extraKm: 0.776 },
      gridTripKm: 8.8,
      tripKm: 9.57,
      perKmSen: 250,
      extraSen: 194,
    };
    const read = zoneTripChargeOf(old);
    assert.equal(read?.freeKm, 0);
    assert.equal(read?.chargedKm, 0.776);
    assert.equal(read?.extraSen, 194);
  });

  it("rejects a negative rate or free km", () => {
    assert.throws(
      () => zoneTripCharge(measure(airport, airport, 0, 0), -1),
      RangeError,
    );
    assert.throws(
      () => zoneTripCharge(measure(airport, airport, 0, 0), 1, -1),
      RangeError,
    );
  });
});
