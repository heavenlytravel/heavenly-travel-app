import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays } from "./expiry";
import {
  BOOKING_ORDERS,
  isBookingOrder,
  nextSortOf,
  sortDirectionOf,
} from "./booking-order";

test("a booking order is one of the four", () => {
  for (const order of BOOKING_ORDERS) assert.equal(isBookingOrder(order), true);
  assert.equal(isBookingOrder("biggest"), false);
  assert.equal(isBookingOrder(undefined), false);
});

test("a heading turns its column's order over, and starts its own way", () => {
  assert.equal(sortDirectionOf("made", "newest"), "descending");
  assert.equal(sortDirectionOf("pickup", "newest"), null);
  assert.equal(nextSortOf("made", "newest"), "oldest");
  assert.equal(nextSortOf("made", "oldest"), "newest");
  assert.equal(nextSortOf("made", "soonest"), "newest");
  assert.equal(nextSortOf("pickup", "newest"), "soonest");
  assert.equal(nextSortOf("pickup", "soonest"), "latest");
  assert.equal(nextSortOf("pickup", "latest"), "soonest");
});

test("addDays crosses a month and a year", () => {
  assert.equal(addDays("2026-11-30", 1), "2026-12-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-11-05", 6), "2026-11-11");
});
