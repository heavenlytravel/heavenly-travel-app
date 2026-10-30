import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkTripEvent,
  contactVisible,
  contactVisibleUntil,
  nextTripStep,
  placeArea,
  waitingMinutes,
  type TripEventInput,
} from "./trip-events-input";

const NOW = new Date("2026-11-03T02:00:00Z");
const minutes = (n: number) => new Date(NOW.getTime() + n * 60_000);

function tap(over: Partial<TripEventInput> = {}): TripEventInput {
  return {
    itemId: "item1",
    kind: "arrived",
    at: NOW,
    note: null,
    clientId: "0b9c6f1e-2d4a-4c8e-9f00-1a2b3c4d5e6f",
    ...over,
  };
}

describe("checkTripEvent", () => {
  it("keeps a tap from the phone, with its id", () => {
    assert.equal(checkTripEvent(tap(), NOW).ok, true);
  });

  it("refuses a clock far ahead, a tap too old to keep and an id that is not one", () => {
    assert.match(
      (checkTripEvent(tap({ at: minutes(20) }), NOW) as { error: string })
        .error,
      /clock/,
    );
    assert.equal(checkTripEvent(tap({ at: minutes(5) }), NOW).ok, true);
    assert.equal(
      checkTripEvent(tap({ at: minutes(-4 * 24 * 60) }), NOW).ok,
      false,
    );
    assert.equal(checkTripEvent(tap({ clientId: "x" }), NOW).ok, false);
  });

  it("needs a few words for a problem", () => {
    assert.equal(checkTripEvent(tap({ kind: "problem" }), NOW).ok, false);
    assert.equal(
      checkTripEvent(tap({ kind: "problem", note: "Flat tyre" }), NOW).ok,
      true,
    );
  });
});

describe("nextTripStep", () => {
  it("suggests the first step not tapped, in order", () => {
    assert.equal(nextTripStep([]), "on-the-way");
    assert.equal(
      nextTripStep([{ kind: "on-the-way" }, { kind: "arrived" }]),
      "on-board",
    );
  });

  it("suggests nothing once the trip ended, by drop-off or no-show", () => {
    assert.equal(nextTripStep([{ kind: "dropped-off" }]), null);
    assert.equal(nextTripStep([{ kind: "no-show" }]), null);
  });
});

describe("waitingMinutes", () => {
  it("measures from arrived to on board", () => {
    assert.equal(
      waitingMinutes([
        { kind: "on-board", at: minutes(17) },
        { kind: "arrived", at: NOW },
      ]),
      17,
    );
  });

  it("is null until both are in", () => {
    assert.equal(waitingMinutes([{ kind: "arrived", at: NOW }]), null);
    assert.equal(waitingMinutes([{ kind: "on-board", at: NOW }]), null);
  });
});

describe("contactVisible", () => {
  const trip = {
    startsAt: NOW,
    endsAt: null,
    driveMinutes: 60,
    distanceKm: 40,
  };

  it("shows the customer until three days after the trip's end", () => {
    assert.equal(
      contactVisibleUntil(trip).toISOString(),
      "2026-11-06T03:00:00.000Z",
    );
    assert.equal(contactVisible(trip, new Date("2026-11-06T02:59:00Z")), true);
    assert.equal(contactVisible(trip, new Date("2026-11-06T03:00:00Z")), false);
  });
});

describe("placeArea", () => {
  it("names the area, never the exact place", () => {
    const place = {
      label: "The Datai",
      locality: "Teluk Datai",
      district: "Langkawi",
      state: "Kedah",
    };
    assert.equal(placeArea(place), "Teluk Datai");
    assert.equal(placeArea({ ...place, locality: null }), "Langkawi");
  });
});
