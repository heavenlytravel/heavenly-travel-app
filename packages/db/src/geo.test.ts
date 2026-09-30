import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bboxOf,
  distanceToShapeKm,
  inBBox,
  pointInMultiPolygon,
  pointInPolygon,
  pointInRing,
  pointOnSurface,
  simplifyRing,
  type MultiPolygon,
  type Ring,
} from "./geo";

const square: Ring = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
  [0, 0],
];
const hole: Ring = [
  [4, 4],
  [6, 4],
  [6, 6],
  [4, 6],
  [4, 4],
];
/** A C shape: a square with a bite taken from its right side. */
const crescent: Ring = [
  [0, 0],
  [10, 0],
  [10, 3],
  [3, 3],
  [3, 7],
  [10, 7],
  [10, 10],
  [0, 10],
  [0, 0],
];

describe("point in ring and polygon", () => {
  it("tells inside from outside", () => {
    assert.equal(pointInRing([5, 5], square), true);
    assert.equal(pointInRing([15, 5], square), false);
    assert.equal(pointInRing([-1, -1], square), false);
  });

  it("treats a hole as outside", () => {
    assert.equal(pointInPolygon([5, 5], [square, hole]), false);
    assert.equal(pointInPolygon([2, 2], [square, hole]), true);
  });

  it("checks every polygon of a multipolygon", () => {
    const far: Ring = square.map(([x, y]) => [x + 100, y]);
    const shape: MultiPolygon = [[square], [far]];
    assert.equal(pointInMultiPolygon([105, 5], shape), true);
    assert.equal(pointInMultiPolygon([50, 5], shape), false);
  });
});

describe("bbox", () => {
  it("covers every polygon", () => {
    const far: Ring = square.map(([x, y]) => [x + 100, y + 20]);
    const box = bboxOf([[square], [far]]);
    assert.deepEqual(box, [0, 0, 110, 30]);
    assert.equal(inBBox([50, 15], box), true);
    assert.equal(inBBox([-1, 15], box), false);
  });
});

describe("pointOnSurface", () => {
  it("is the centroid when the centroid is inside", () => {
    assert.deepEqual(pointOnSurface([[square]]), [4, 4]);
  });

  it("finds an inside point for a crescent whose centroid is outside", () => {
    const point = pointOnSurface([[crescent]]);
    assert.equal(pointInPolygon(point, [crescent]), true);
  });

  it("uses the largest polygon", () => {
    const small: Ring = [
      [100, 100],
      [101, 100],
      [101, 101],
      [100, 101],
      [100, 100],
    ];
    const point = pointOnSurface([[small], [square]]);
    assert.equal(pointInPolygon(point, [square]), true);
  });
});

describe("simplifyRing", () => {
  it("drops vertices that barely bend the line and keeps the ring closed", () => {
    const wobbly: Ring = [
      [0, 0],
      [5, 0.001],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ];
    const out = simplifyRing(wobbly, 0.01);
    assert.deepEqual(out, square);
    assert.deepEqual(out[0], out.at(-1));
  });

  it("keeps a corner that matters", () => {
    assert.deepEqual(simplifyRing(crescent, 0.01), crescent);
  });
});

describe("distanceToShapeKm", () => {
  it("is the distance to the nearest edge, in kilometres", () => {
    const unit: Ring = [
      [100, 0],
      [101, 0],
      [101, 1],
      [100, 1],
      [100, 0],
    ];
    const km = distanceToShapeKm([101.01, 0.5], [[unit]]);
    assert.ok(km > 1.05 && km < 1.2, String(km));
    assert.equal(distanceToShapeKm([101, 0.5], [[unit]]), 0);
  });
});
