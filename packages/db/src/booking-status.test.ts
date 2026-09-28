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
  const item = (startsIn: number, cutoff: number, status = "received") => ({
    status,
    startsAt: hours(startsIn),
    cancellationCutoffHours: cutoff,
  });
  const booking = (status: string, ...items: ReturnType<typeof item>[]) => ({
    status,
    items,
  });

  it("allows a received or confirmed booking before the deadline", () => {
    for (const status of ["received", "confirmed"]) {
      assert.deepEqual(
        checkCustomerCancel(booking(status, item(25, 24)), now),
        {
          ok: true,
          deadline: hours(1),
        },
      );
    }
  });

  it("refuses from the deadline on and names it as a date", () => {
    const check = checkCustomerCancel(booking("received", item(24, 24)), now);
    assert.equal(check.ok, false);
    assert.equal(!check.ok && check.reason, "cutoff");
    assert.equal(
      !check.ok && check.message,
      "Free cancellation ended on Thu, 1 Oct 2026, 08:00.",
    );
  });

  it("uses each item's own cutoff, earliest deadline wins", () => {
    // A coach in 60 hours with a 48 hour cutoff closes before a car in
    // 30 hours with a 24 hour cutoff.
    const both = booking("confirmed", item(30, 24), item(60, 48));
    assert.deepEqual(checkCustomerCancel(both, now), {
      ok: true,
      deadline: hours(6),
    });
    const later = hours(12);
    assert.equal(checkCustomerCancel(both, later).ok, false);
  });

  it("ignores cancelled items", () => {
    const check = checkCustomerCancel(
      booking("confirmed", item(2, 24, "cancelled"), item(100, 48)),
      now,
    );
    assert.deepEqual(check, { ok: true, deadline: hours(52) });
  });

  it("refuses a completed or cancelled booking whatever the time", () => {
    for (const status of ["completed", "cancelled"]) {
      const check = checkCustomerCancel(booking(status, item(100, 24)), now);
      assert.equal(check.ok, false);
      assert.equal(!check.ok && check.reason, "status");
    }
  });
});
