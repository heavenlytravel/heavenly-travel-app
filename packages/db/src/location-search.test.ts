import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { offersDropoffAddress, type LocationSearch } from "./location-search";

// Langkawi: the island searched, and one saved address a trip may end at.
const search: LocationSearch = {
  pickup: [99.59, 6.12, 99.98, 6.53],
  dropoff: [99.59, 6.12, 99.98, 6.53],
  dropoffPlaces: ["kuahJetty"],
};

describe("offersDropoffAddress", () => {
  it("offers only the addresses a trip may end at", () => {
    assert.equal(offersDropoffAddress(search, "kuahJetty"), true);
    assert.equal(offersDropoffAddress(search, "outside"), false);
  });
});
