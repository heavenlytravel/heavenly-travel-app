import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkTripEvent,
  contactVisible,
  contactVisibleUntil,
  nextTripStep,
  noShowRefusal,
  noShowEndsAt,
  noShowUndoRefusal,
  placeArea,
  type TripEventInput,
  isOnTheRoad,
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

  it("needs a reason for a no-show", () => {
    assert.equal(checkTripEvent(tap({ kind: "no-show" }), NOW).ok, false);
    assert.equal(
      checkTripEvent(
        tap({ kind: "no-show", note: "Waited 30 min, no answer" }),
        NOW,
      ).ok,
      true,
    );
  });

  it("refuses the reports no longer tapped", () => {
    for (const kind of ["on-the-way", "on-board", "problem"] as const) {
      assert.equal(
        checkTripEvent(tap({ kind, note: "x" }), NOW).ok,
        false,
        kind,
      );
    }
  });
});

describe("noShowRefusal", () => {
  it("waits for Arrived and the pickup time", () => {
    assert.match(noShowRefusal([], NOW, minutes(10)) ?? "", /Arrived/);
    assert.match(
      noShowRefusal([{ kind: "arrived" }], NOW, minutes(-5)) ?? "",
      /pickup time/,
    );
    assert.equal(noShowRefusal([{ kind: "arrived" }], NOW, NOW), null);
  });
});

describe("noShowUndoRefusal", () => {
  // Received at NOW, though the phone said earlier.
  const noShow = [
    { kind: "arrived", createdAt: NOW },
    { kind: "no-show", createdAt: NOW },
  ];
  it("needs a no-show, and none dropped off after it", () => {
    assert.match(
      noShowUndoRefusal([{ kind: "arrived", createdAt: NOW }], NOW) ?? "",
      /no no-show/,
    );
    assert.match(
      noShowUndoRefusal(
        [...noShow, { kind: "dropped-off", createdAt: minutes(30) }],
        minutes(30),
      ) ?? "",
      /dropped off/,
    );
  });
  it("gives everyone the hour from when it was received, no longer", () => {
    assert.equal(noShowEndsAt(noShow)?.getTime(), minutes(60).getTime());
    assert.equal(noShowUndoRefusal(noShow, minutes(59)), null);
    assert.match(
      noShowUndoRefusal(noShow, minutes(60)) ?? "",
      /hour has passed/,
    );
  });
});

describe("nextTripStep", () => {
  it("suggests the first step not tapped, in order", () => {
    assert.equal(nextTripStep([]), "arrived");
    assert.equal(nextTripStep([{ kind: "arrived" }]), "dropped-off");
    // A trip begun with the old steps goes on to the next of the two.
    assert.equal(nextTripStep([{ kind: "on-the-way" }]), "arrived");
  });

  it("suggests nothing once the trip ended, by drop-off or no-show", () => {
    assert.equal(nextTripStep([{ kind: "dropped-off" }]), null);
    assert.equal(nextTripStep([{ kind: "no-show" }]), null);
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

describe("isOnTheRoad", () => {
  it("is on the road from On the way, or any step after it", () => {
    assert.equal(isOnTheRoad([]), false);
    assert.equal(isOnTheRoad([{ kind: "on-the-way" }]), true);
    assert.equal(isOnTheRoad([{ kind: "arrived" }]), true);
  });

  it("is not on the road for a problem reported alone", () => {
    assert.equal(isOnTheRoad([{ kind: "problem" }]), false);
    assert.equal(
      isOnTheRoad([{ kind: "problem" }, { kind: "on-the-way" }]),
      true,
    );
  });
});
