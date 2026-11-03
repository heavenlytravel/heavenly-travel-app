import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bookingNumberOf,
  bookingNumberYear,
  parseBookingNumber,
} from "./booking-number";

describe("booking numbers", () => {
  it("counts the year in Malaysia", () => {
    // 31 Dec 2026, 20:00 UTC is 1 Jan 2027 in Malaysia.
    assert.equal(bookingNumberYear(new Date("2026-12-31T20:00:00Z")), 27);
    assert.equal(bookingNumberYear(new Date("2026-11-03T02:00:00Z")), 26);
  });

  it("reads as a quotation, then the invoice once confirmed", () => {
    const booking = { numberYear: 26, number: 42, confirmedAt: null };
    assert.equal(bookingNumberOf(booking), "HTQ-26-00042");
    assert.equal(
      bookingNumberOf({ ...booking, confirmedAt: new Date() }),
      "HTI-26-00042",
    );
    assert.equal(
      bookingNumberOf({ numberYear: null, number: null, confirmedAt: null }),
      null,
    );
  });

  it("finds a number however it is typed", () => {
    const n = { numberYear: 26, number: 42 };
    assert.deepEqual(parseBookingNumber("HTQ-26-00042"), n);
    assert.deepEqual(parseBookingNumber("hti-26-42"), n);
    assert.deepEqual(parseBookingNumber("26-42"), n);
    assert.equal(parseBookingNumber("HT-7K3QZM"), null);
    assert.equal(parseBookingNumber("26-0"), null);
  });
});
