import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  offersDropoffAddress,
  offersPickupAddress,
  type LocationSearch,
} from "./location-search";

// Langkawi: the island first, one saved address a pickup is served at
// and a trip may end at, and one a trip may end at only.
const search: LocationSearch = {
  near: [99.59, 6.12, 99.98, 6.53],
  pickupPlaces: ["kuahJetty"],
  dropoffPlaces: ["kuahJetty", "klia"],
};

describe("offersPickupAddress", () => {
  it("offers only the addresses a pickup is served at", () => {
    assert.equal(offersPickupAddress(search, "kuahJetty"), true);
    assert.equal(offersPickupAddress(search, "klia"), false);
    assert.equal(offersPickupAddress(search, "outside"), false);
  });
});

describe("offersDropoffAddress", () => {
  it("offers only the addresses a trip may end at", () => {
    assert.equal(offersDropoffAddress(search, "kuahJetty"), true);
    assert.equal(offersDropoffAddress(search, "klia"), true);
    assert.equal(offersDropoffAddress(search, "outside"), false);
  });
});
