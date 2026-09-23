import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bookingStatusOf,
  checkCustomerCancel,
  isBookingStatus,
  isItemStatus,
  NEXT_ITEM_STATUS,
} from "./booking-status";

const items = (...statuses: string[]) => statuses.map((status) => ({ status }));

describe("bookingStatusOf", () => {
  it("is received while any live item is received", () => {
    assert.equal(bookingStatusOf(items("received")), "received");
    assert.equal(bookingStatusOf(items("confirmed", "received")), "received");
    assert.equal(bookingStatusOf(items("cancelled", "received")), "received");
  });

  it("is confirmed once every live item is confirmed or beyond", () => {
    assert.equal(bookingStatusOf(items("confirmed")), "confirmed");
    assert.equal(bookingStatusOf(items("assigned")), "confirmed");
    assert.equal(
      bookingStatusOf(items("confirmed", "assigned", "completed")),
      "confirmed",
    );
    assert.equal(bookingStatusOf(items("confirmed", "cancelled")), "confirmed");
  });

  it("is completed only when every live item is completed", () => {
    assert.equal(bookingStatusOf(items("completed")), "completed");
    assert.equal(bookingStatusOf(items("completed", "cancelled")), "completed");
    assert.equal(bookingStatusOf(items("completed", "assigned")), "confirmed");
  });

  it("is cancelled when no item is live", () => {
    assert.equal(bookingStatusOf(items("cancelled")), "cancelled");
    assert.equal(bookingStatusOf(items("cancelled", "cancelled")), "cancelled");
  });
});

describe("status guards", () => {
  it("accept only the known values", () => {
    assert.equal(isItemStatus("assigned"), true);
    assert.equal(isBookingStatus("assigned"), false);
    assert.equal(isItemStatus("paid"), false);
    assert.equal(isBookingStatus(undefined), false);
  });

  it("step forward one status at a time and stop at completed", () => {
    assert.equal(NEXT_ITEM_STATUS.received, "confirmed");
    assert.equal(NEXT_ITEM_STATUS.confirmed, "assigned");
    assert.equal(NEXT_ITEM_STATUS.assigned, "completed");
    assert.equal("completed" in NEXT_ITEM_STATUS, false);
    assert.equal("cancelled" in NEXT_ITEM_STATUS, false);
  });
});

describe("checkCustomerCancel", () => {
  const now = new Date("2026-10-01T00:00:00Z");
  const hours = (n: number) => new Date(now.getTime() + n * 60 * 60 * 1000);

  it("allows a received or confirmed booking before the cutoff", () => {
    assert.deepEqual(
      checkCustomerCancel({ status: "received", startsAt: hours(25) }, now),
      { ok: true },
    );
    assert.deepEqual(
      checkCustomerCancel({ status: "confirmed", startsAt: hours(25) }, now),
      { ok: true },
    );
  });

  it("refuses inside the cutoff", () => {
    const check = checkCustomerCancel(
      { status: "received", startsAt: hours(23) },
      now,
    );
    assert.equal(check.ok, false);
    assert.equal(!check.ok && check.reason, "cutoff");
  });

  it("refuses a completed or cancelled booking whatever the time", () => {
    for (const status of ["completed", "cancelled"]) {
      const check = checkCustomerCancel({ status, startsAt: hours(100) }, now);
      assert.equal(check.ok, false);
      assert.equal(!check.ok && check.reason, "status");
    }
  });
});
