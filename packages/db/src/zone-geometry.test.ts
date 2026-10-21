import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { circleRing, type Ring } from "./geo";
import {
  areaKm2,
  cutOut,
  overlapKm2,
  shapesOverlap,
  unionOf,
} from "./zone-geometry";

/** A box `wide` by `tall` degrees with its south-west corner at the point. */
const box = (lng: number, lat: number, wide: number, tall = wide): Ring => [
  [lng, lat],
  [lng + wide, lat],
  [lng + wide, lat + tall],
  [lng, lat + tall],
  [lng, lat],
];
const square = (lng: number, lat: number, size: number) => box(lng, lat, size);

// Two mukims side by side on Langkawi's latitude, sharing an edge.
const west = square(99.7, 6.3, 0.02);
const east = square(99.72, 6.3, 0.02);

describe("unionOf", () => {
  it("puts neighbours together into one outline, the shared edge gone", () => {
    const both = unionOf([west, east]);
    assert.equal(both.length, 1);
    assert.equal(both[0]!.length, 1);
    assert.ok(Math.abs(areaKm2(both) - 2 * areaKm2([[west]])) < 1e-6);
  });

  it("keeps pieces that do not touch apart", () => {
    assert.equal(unionOf([west, square(99.8, 6.3, 0.01)]).length, 2);
  });
});

describe("overlap", () => {
  it("is none for neighbours that only share an edge", () => {
    assert.equal(overlapKm2(west, east), 0);
    assert.equal(shapesOverlap(west, east), false);
  });

  it("is the ground both cover", () => {
    const half = square(99.71, 6.3, 0.02);
    assert.ok(
      Math.abs(
        overlapKm2(west, half) - areaKm2([[box(99.71, 6.3, 0.01, 0.02)]]),
      ) < 1e-6,
    );
    assert.equal(shapesOverlap(west, half), true);
  });

  it("forgives the rounding of borders drawn to meet", () => {
    // Half a metre into the neighbour along a 2 km edge.
    const nudged = square(99.72 - 0.0000045, 6.3, 0.02);
    assert.equal(shapesOverlap(west, nudged), false);
  });

  it("counts an airport circle inside a mukim", () => {
    const airport = circleRing({ lat: 6.31, lng: 99.71 }, 500);
    assert.equal(shapesOverlap(west, airport), true);
  });
});

describe("cutOut", () => {
  it("leaves a hole where a zone inside is cut out", () => {
    const airport = circleRing({ lat: 6.31, lng: 99.71 }, 500);
    const left = cutOut(west, [airport]);
    assert.equal(left.length, 1);
    assert.equal(left[0]!.length, 2);
    assert.equal(shapesOverlap(left, airport), false);
    assert.ok(
      Math.abs(areaKm2(left) - (areaKm2([[west]]) - areaKm2([[airport]]))) <
        0.01,
    );
  });

  it("takes the shared ground off the edge, and meets the other zone there", () => {
    const left = cutOut(west, [square(99.71, 6.3, 0.02)]);
    assert.ok(
      Math.abs(areaKm2(left) - areaKm2([[box(99.7, 6.3, 0.01, 0.02)]])) < 1e-6,
    );
    assert.equal(overlapKm2(left, square(99.71, 6.3, 0.02)), 0);
  });

  it("leaves nothing when the others cover it all", () => {
    assert.deepEqual(cutOut(square(99.705, 6.305, 0.005), [west]), []);
  });
});
