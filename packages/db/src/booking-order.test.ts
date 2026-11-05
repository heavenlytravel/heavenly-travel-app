import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays } from "./expiry";
import { BOOKING_ORDERS, isBookingOrder } from "./booking-order";

test("a booking order is one of the three", () => {
  for (const order of BOOKING_ORDERS) assert.equal(isBookingOrder(order), true);
  assert.equal(isBookingOrder("oldest"), false);
  assert.equal(isBookingOrder(undefined), false);
});

test("addDays crosses a month and a year", () => {
  assert.equal(addDays("2026-11-30", 1), "2026-12-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-11-05", 6), "2026-11-11");
});
