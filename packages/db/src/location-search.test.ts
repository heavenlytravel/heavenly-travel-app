import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { inBBox, type BBox } from "./geo";
import {
  dropoffBox,
  offersDropoffAddress,
  pickupBox,
  type LocationSearch,
} from "./location-search";

// Langkawi with three zones; the grid prices the airport to the ferry
// terminal, and Four Season to nowhere.
const island: BBox = [99.6, 6.1, 99.95, 6.5];
const search = (
  dropoffRule: LocationSearch["dropoffRule"],
): LocationSearch => ({
  dropoffRule,
  zones: [
    { id: "airport", box: island, routesTo: ["jetty"] },
    { id: "jetty", box: [99.83, 6.28, 99.87, 6.32], routesTo: ["airport"] },
    { id: "fourSeason", box: [99.8, 6.43, 99.83, 6.46], routesTo: [] },
  ],
  addressZones: { kuahJetty: "jetty", fourSeasons: "fourSeason" },
});

const kuah: [number, number] = [99.85, 6.31];
const kl: [number, number] = [101.71, 3.16];

describe("pickupBox", () => {
  it("boxes every zone with the coast", () => {
    const box = pickupBox(search("anywhere"))!;
    assert.equal(inBBox(kuah, box), true);
    assert.equal(inBBox(kl, box), false);
    assert.ok(box[0] < island[0]);
  });

  it("is none for a location with no zone", () => {
    assert.equal(pickupBox({ ...search("anywhere"), zones: [] }), null);
  });
});

describe("dropoffBox", () => {
  it("is all of Malaysia for drop-offs anywhere", () => {
    assert.equal(dropoffBox(search("anywhere"), "airport"), null);
  });

  it("is the pick-up's box for drop-offs inside the location", () => {
    assert.deepEqual(
      dropoffBox(search("zones"), "airport"),
      pickupBox(search("zones")),
    );
  });

  it("is where the grid reaches from the pick-up's zone, once it is known", () => {
    const box = dropoffBox(search("grid"), "jetty")!;
    assert.ok(box[2] - box[0] > 0.3);
    const fromJetty = dropoffBox(search("grid"), "airport")!;
    assert.ok(fromJetty[2] - fromJetty[0] < 0.2);
    assert.deepEqual(
      dropoffBox(search("grid"), null),
      pickupBox(search("grid")),
    );
  });
});

describe("offersDropoffAddress", () => {
  it("offers every saved address for drop-offs anywhere", () => {
    assert.equal(
      offersDropoffAddress(search("anywhere"), "outside", "airport"),
      true,
    );
  });

  it("offers only the addresses in a zone inside the location", () => {
    assert.equal(
      offersDropoffAddress(search("zones"), "kuahJetty", null),
      true,
    );
    assert.equal(offersDropoffAddress(search("zones"), "outside", null), false);
  });

  it("offers only the addresses a route reaches under the grid", () => {
    const grid = search("grid");
    assert.equal(offersDropoffAddress(grid, "kuahJetty", "airport"), true);
    assert.equal(offersDropoffAddress(grid, "fourSeasons", "airport"), false);
    assert.equal(offersDropoffAddress(grid, "fourSeasons", null), true);
  });
});
