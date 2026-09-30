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

  it("spells a zone change from the fields that changed", () => {
    const changed = (after: Record<string, unknown>) =>
      describeActivity({ action: "zone.updated", before: {}, after });
    assert.equal(changed({ multiplier: 1.2 }), "Set the multiplier to ×1.20");
    assert.equal(
      changed({ name: "Penang", isActive: true }),
      "Renamed to Penang, turned the zone on",
    );
    assert.equal(changed({}), "Changed the zone");
  });

  it("names the district a zone gained or lost", () => {
    assert.equal(
      describeActivity({
        action: "zone.district.added",
        before: null,
        after: { state: "Selangor", district: "Seri Kembangan" },
      }),
      "Added Seri Kembangan",
    );
    assert.equal(
      describeActivity({
        action: "zone.district.removed",
        before: { state: "Selangor", district: "Seri Kembangan" },
        after: null,
      }),
      "Removed Seri Kembangan",
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
  it("keeps staff and settings actions from customers", () => {
    for (const action of ACTIVITY_ACTIONS) {
      const meta = activityActionMeta(action);
      assert.equal(meta.customerVisible, action.startsWith("booking."));
    }
  });
});
