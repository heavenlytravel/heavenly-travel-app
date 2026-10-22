import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { offersDropoffAddress, type LocationSearch } from "./location-search";

// Langkawi: the island searched, and one saved address a trip may end at.
const search = (
  dropoffRule: LocationSearch["dropoffRule"],
): LocationSearch => ({
  pickup: [99.59, 6.12, 99.98, 6.53],
  dropoff: dropoffRule === "anywhere" ? null : [99.59, 6.12, 99.98, 6.53],
  dropoffRule,
  dropoffPlaces: dropoffRule === "anywhere" ? [] : ["kuahJetty"],
});

describe("offersDropoffAddress", () => {
  it("offers every saved address for drop-offs anywhere", () => {
    assert.equal(offersDropoffAddress(search("anywhere"), "outside"), true);
  });

  it("offers only the addresses a trip may end at under a strict rule", () => {
    for (const rule of ["zones", "grid"] as const) {
      assert.equal(offersDropoffAddress(search(rule), "kuahJetty"), true);
      assert.equal(offersDropoffAddress(search(rule), "outside"), false);
    }
  });
});
