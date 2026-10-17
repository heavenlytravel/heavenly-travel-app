import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { circleRing, type Ring } from "./geo";
import {
  isRing,
  isZoneShape,
  routeRateOf,
  zoneAt,
  zoneShapeArea,
} from "./zone-match";

/** A square of about two kilometres around Kuah, closed. */
const kuah: Ring = [
  [99.83, 6.31],
  [99.85, 6.31],
  [99.85, 6.33],
  [99.83, 6.33],
  [99.83, 6.31],
];

/** Most of the island, drawn loosely around the square above. */
const island: Ring = [
  [99.6, 6.2],
  [100.0, 6.2],
  [100.0, 6.5],
  [99.6, 6.5],
  [99.6, 6.2],
];

const zones = [
  { id: "island", name: "Langkawi", shape: island },
  { id: "kuah", name: "Town", shape: kuah },
  { id: "broken", name: "Broken", shape: "not a ring" },
];

describe("isRing", () => {
  it("accepts three or more corners of [lng, lat]", () => {
    assert.equal(isRing(kuah), true);
    assert.equal(isRing(kuah.slice(0, 3)), true);
  });

  it("refuses too few corners, bad numbers and coordinates off the globe", () => {
    assert.equal(isRing(kuah.slice(0, 2)), false);
    assert.equal(
      isRing([
        [1, 2],
        [3, "4"],
        [5, 6],
      ]),
      false,
    );
    assert.equal(
      isRing([
        [181, 2],
        [3, 4],
        [5, 6],
      ]),
      false,
    );
    assert.equal(isRing(null), false);
  });
});

describe("zoneAt", () => {
  it("finds the zone a point is in", () => {
    assert.equal(zoneAt(zones, { lat: 6.4, lng: 99.7 })?.id, "island");
  });

  it("prefers the smallest of overlapping zones", () => {
    assert.equal(zoneAt(zones, { lat: 6.32, lng: 99.84 })?.id, "kuah");
  });

  it("is null outside every zone, and skips a zone whose shape cannot be read", () => {
    assert.equal(zoneAt(zones, { lat: 3.1, lng: 101.6 }), null);
    assert.equal(zoneAt([zones[2]!], { lat: 6.32, lng: 99.84 }), null);
  });

  it("matches a district of several pieces of land, and takes a hole out", () => {
    const islet: Ring = [
      [99.5, 6.0],
      [99.52, 6.0],
      [99.52, 6.02],
      [99.5, 6.02],
      [99.5, 6.0],
    ];
    const hole: Ring = [
      [99.7, 6.3],
      [99.72, 6.3],
      [99.72, 6.32],
      [99.7, 6.32],
      [99.7, 6.3],
    ];
    const district = {
      id: "district",
      name: "Langkawi",
      shape: [[island, hole], [islet]],
    };
    assert.equal(zoneAt([district], { lat: 6.01, lng: 99.51 })?.id, "district");
    assert.equal(zoneAt([district], { lat: 6.4, lng: 99.7 })?.id, "district");
    assert.equal(zoneAt([district], { lat: 6.31, lng: 99.71 }), null);
    // Of a ring drawn inside the district and the district, the ring wins.
    assert.equal(
      zoneAt([district, zones[1]!], { lat: 6.32, lng: 99.84 })?.id,
      "kuah",
    );
    assert.ok(
      zoneShapeArea(district.shape) <
        zoneShapeArea(island) + zoneShapeArea(islet),
    );
    assert.equal(isZoneShape(district.shape), true);
    assert.equal(isZoneShape([[island], "x"]), false);
  });

  it("matches a circle drawn around a place", () => {
    const airport = { lat: 6.3297, lng: 99.7287 };
    const ring = circleRing(airport, 1500);
    const circle = [{ id: "airport", name: "Airport", shape: ring }];
    assert.equal(zoneAt(circle, airport)?.id, "airport");
    assert.equal(zoneAt(circle, { lat: 6.3297, lng: 99.74 })?.id, "airport");
    assert.equal(zoneAt(circle, { lat: 6.3297, lng: 99.76 }), null);
  });
});

describe("routeRateOf", () => {
  const cells = [
    {
      fromZoneId: "airport",
      toZoneId: "town",
      vehicleClassId: "sedan",
      priceSen: 4_500,
    },
    {
      fromZoneId: "airport",
      toZoneId: "town",
      vehicleClassId: "mpv",
      priceSen: 7_500,
    },
    {
      fromZoneId: "town",
      toZoneId: "ferry",
      vehicleClassId: "sedan",
      priceSen: 4_000,
    },
  ];

  it("reads the cell for the route and the class", () => {
    assert.equal(routeRateOf(cells, "airport", "town", "mpv")?.priceSen, 7_500);
  });

  it("reads the route the other way round when only that cell is set", () => {
    assert.equal(
      routeRateOf(cells, "town", "airport", "sedan")?.priceSen,
      4_500,
    );
  });

  it("is null for a route or a class with no cell", () => {
    assert.equal(routeRateOf(cells, "airport", "ferry", "sedan"), null);
    assert.equal(routeRateOf(cells, "town", "ferry", "mpv"), null);
  });
});
