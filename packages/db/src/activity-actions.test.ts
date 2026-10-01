import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACTIVITY_ACTIONS,
  activityActionMeta,
  describeActivity,
} from "./activity-actions";

describe("describeActivity", () => {
  it("names the item an item action touched", () => {
    assert.equal(
      describeActivity({
        action: "booking.item.confirmed",
        before: { position: 2, status: "received" },
        after: { position: 2, status: "confirmed" },
      }),
      "Confirmed item 2",
    );
    assert.equal(
      describeActivity({
        action: "booking.item.assigned",
        before: { position: 1, status: "confirmed" },
        after: { position: 1, status: "assigned" },
      }),
      "Marked item 1 driver assigned",
    );
  });

  it("counts the items of a new booking only when there are several", () => {
    const one = {
      action: "booking.created",
      before: null,
      after: { items: 1 },
    };
    const three = { ...one, after: { items: 3 } };
    assert.equal(describeActivity(one), "Made the booking");
    assert.equal(describeActivity(three), "Made the booking with 3 items");
  });

  it("says a booking was entered when staff made it on the console", () => {
    assert.equal(
      describeActivity({
        action: "booking.created",
        before: null,
        after: { items: 1, via: "console" },
      }),
      "Entered the booking",
    );
  });

  it("reads a price override and its removal from after", () => {
    assert.equal(
      describeActivity({
        action: "booking.item.priced",
        before: { position: 2, priceTotalSen: 25000 },
        after: { position: 2, priceTotalSen: 30000, reason: "Agreed by phone" },
      }),
      "Set the price of item 2 to RM 300.00",
    );
    assert.equal(
      describeActivity({
        action: "booking.item.priced",
        before: { position: 2, priceTotalSen: 30000 },
        after: { position: 2, priceTotalSen: 25000, reason: null },
      }),
      "Reset the price of item 2 to RM 250.00",
    );
  });

  it("names the fields an amend changed, or just says amended", () => {
    assert.equal(
      describeActivity({
        action: "booking.item.amended",
        before: {
          position: 2,
          pickup: "KLIA Terminal 1",
          startsAt: "2026-10-03T01:30:00.000Z",
          vehicleClassName: "Executive sedan",
        },
        after: {
          position: 2,
          pickup: "KLIA Terminal 2",
          startsAt: "2026-10-03T02:00:00.000Z",
          vehicleClassName: "MPV",
        },
      }),
      "Changed the pick-up, the pick-up time and the vehicle of item 2",
    );
    assert.equal(
      describeActivity({
        action: "booking.item.amended",
        before: { position: 1 },
        after: { position: 1 },
      }),
      "Amended item 1",
    );
  });

  it("spells a level with its team labels", () => {
    assert.equal(
      describeActivity({
        action: "admin.updated",
        before: { level: "SUPER", teams: [] },
        after: { level: "REGULAR", teams: ["SALES", "OPERATION"] },
      }),
      "Changed from SUPER to REGULAR (Operation, Sales)",
    );
  });

  it("reads the wall switch from after", () => {
    const flip = (wallActive: boolean) =>
      describeActivity({
        action: "wall.switched",
        before: { wallActive: !wallActive },
        after: { wallActive },
      });
    assert.equal(flip(true), "Turned the wall on");
    assert.equal(flip(false), "Turned the wall off");
  });

  it("reads a state's multiplier and a district's switch from after", () => {
    assert.equal(
      describeActivity({
        action: "state.updated",
        before: { multiplier: 1 },
        after: { multiplier: 1.2 },
      }),
      "Set the multiplier to ×1.20",
    );
    assert.equal(
      describeActivity({
        action: "district.updated",
        before: { isActive: false },
        after: { isActive: true },
      }),
      "Turned the district on",
    );
  });

  it("lists the fields of a class that changed by their labels", () => {
    assert.equal(
      describeActivity({
        action: "vehicle-class.updated",
        before: { baseFareSen: 3000, perKmSen: 180, minLeadHours: 4 },
        after: { baseFareSen: 3500, perKmSen: 200, minLeadHours: 6 },
      }),
      "Changed the base fare, the per km and the notice needed",
    );
    assert.equal(
      describeActivity({
        action: "vehicle-class.updated",
        before: { isActive: true },
        after: { isActive: false },
      }),
      "Turned the class off",
    );
  });

  it("names what changed on a location", () => {
    assert.equal(
      describeActivity({
        action: "location.updated",
        before: { name: "Langkawi Island", tagline: null },
        after: { name: "Langkawi", tagline: "Beaches and duty-free" },
      }),
      "Renamed to Langkawi, changed the tagline",
    );
    assert.equal(
      describeActivity({
        action: "location.updated",
        before: { place: "Kuala Lumpur", districtCode: "kuala-lumpur" },
        after: { place: "Petaling Jaya", districtCode: "petaling" },
      }),
      "Changed the place",
    );
  });

  it("says which saved addresses were added, removed, renamed or reordered", () => {
    const airport = { id: "a1", name: "Langkawi Airport", place: "LGK" };
    const jetty = { id: "a2", name: "Kuah Jetty", place: "Kuah Jetty" };
    const beach = { id: "a3", name: "Pantai Cenang", place: "Pantai Cenang" };
    const change = (before: object[], after: object[]) =>
      describeActivity({
        action: "location.addresses.updated",
        before: { addresses: before },
        after: { addresses: after },
      });

    assert.equal(
      change([airport], [airport, jetty, beach]),
      "Added the addresses Kuah Jetty and Pantai Cenang",
    );
    assert.equal(
      change([airport, jetty], [{ ...jetty, name: "Jetty Point" }]),
      "Removed the address Langkawi Airport, renamed the address Kuah Jetty to Jetty Point",
    );
    assert.equal(
      change([airport, jetty], [jetty, airport]),
      "Reordered the saved addresses",
    );
  });

  it("falls back to the raw action for one it does not know", () => {
    const entry = { action: "vehicle.washed", before: null, after: null };
    assert.equal(describeActivity(entry), "vehicle.washed");
  });

  it("has a sentence for every action", () => {
    for (const action of ACTIVITY_ACTIONS) {
      const text = describeActivity({ action, before: {}, after: {} });
      assert.notEqual(text, action);
    }
  });
});

describe("activityActionMeta", () => {
  /** Booking actions whose entry carries something a customer must not see. */
  const INTERNAL_BOOKING_ACTIONS: string[] = [
    "booking.item.priced",
    "booking.note.added",
  ];

  it("keeps staff, settings and internal booking actions from customers", () => {
    for (const action of ACTIVITY_ACTIONS) {
      const meta = activityActionMeta(action);
      assert.equal(
        meta.customerVisible,
        action.startsWith("booking.") &&
          !INTERNAL_BOOKING_ACTIONS.includes(action),
        action,
      );
    }
  });
});
