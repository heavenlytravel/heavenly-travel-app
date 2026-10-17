import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isInStates,
  strayAddresses,
  strayAddressesPhrase,
} from "./location-places";
import type { Place } from "./place";

const place = (label: string, lat: number, lng: number): Place => ({
  placeId: label,
  label,
  address: label,
  lat,
  lng,
  state: null,
  district: null,
  locality: null,
});

/** ISO 3166-2 codes, as the boundary data keys the states. */
const KEDAH = "MY-02";
const PENANG = "MY-07";
const KUALA_LUMPUR = "MY-14";

const cenang = place("Pantai Cenang", 6.2993, 99.7209);
const georgeTown = place("George Town", 5.4141, 100.3288);
const klcc = place("KLCC", 3.1579, 101.7123);
const straits = place("Open sea", 3.0, 100.5);

describe("isInStates", () => {
  it("places an address by its coordinates, as a pickup is placed", () => {
    assert.equal(isInStates(cenang, [KEDAH]), true);
    assert.equal(isInStates(georgeTown, [PENANG, KEDAH]), true);
    assert.equal(isInStates(georgeTown, [KEDAH]), false);
    assert.equal(isInStates(straits, [KEDAH]), false);
  });
});

describe("strayAddresses", () => {
  const addresses = [
    { name: "Pantai Cenang", place: cenang },
    { name: "Petronas Towers", place: klcc },
    { name: "Somewhere at sea", place: straits },
    { name: "Unreadable", place: { label: "no coordinates" } },
  ];

  it("names the addresses outside the states and where each lies", () => {
    assert.deepEqual(strayAddresses(addresses, [KEDAH]), [
      { name: "Petronas Towers", district: "Kuala Lumpur, Kuala Lumpur" },
      { name: "Somewhere at sea", district: null },
    ]);
  });

  it("is empty when every address lies in one of the states", () => {
    assert.deepEqual(
      strayAddresses(addresses.slice(0, 2), [KUALA_LUMPUR, KEDAH]),
      [],
    );
  });

  it("reads as one phrase", () => {
    assert.equal(
      strayAddressesPhrase(strayAddresses(addresses, [KEDAH])),
      "Petronas Towers is in Kuala Lumpur, Kuala Lumpur; Somewhere at sea is in no district of Malaysia",
    );
  });
});
