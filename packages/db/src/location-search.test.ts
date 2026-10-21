import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BBox } from "./geo";
import {
  dropoffBox,
  offersDropoffAddress,
  type LocationSearch,
} from "./location-search";

// Langkawi: the island searched, and one saved address in a zone.
const island: BBox = [99.59, 6.12, 99.98, 6.53];
const search = (
  dropoffRule: LocationSearch["dropoffRule"],
): LocationSearch => ({
  pickup: island,
  dropoffRule,
  placesInZones: ["kuahJetty"],
});

describe("dropoffBox", () => {
  it("is all of Malaysia for drop-offs anywhere", () => {
    assert.equal(dropoffBox(search("anywhere")), null);
  });

  it("is the pick-up's box when a trip must end in the location", () => {
    assert.deepEqual(dropoffBox(search("zones")), island);
    assert.deepEqual(dropoffBox(search("grid")), island);
  });

  it("is none for a location with no zone", () => {
    assert.equal(dropoffBox({ ...search("zones"), pickup: null }), null);
  });
});

describe("offersDropoffAddress", () => {
  it("offers every saved address for drop-offs anywhere", () => {
    assert.equal(offersDropoffAddress(search("anywhere"), "outside"), true);
  });

  it("offers only the addresses in a zone under a strict rule", () => {
    for (const rule of ["zones", "grid"] as const) {
      assert.equal(offersDropoffAddress(search(rule), "kuahJetty"), true);
      assert.equal(offersDropoffAddress(search(rule), "outside"), false);
    }
  });
});
