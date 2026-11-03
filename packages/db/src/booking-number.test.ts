import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bookingLabelOf,
  bookingNumbersOf,
  bookingNumberYear,
  parseBookingNumber,
} from "./booking-number";

const NONE = {
  quoteYear: null,
  quoteNumber: null,
  invoiceYear: null,
  invoiceNumber: null,
};

describe("booking numbers", () => {
  it("counts the year in Malaysia", () => {
    // 31 Dec 2026, 20:00 UTC is 1 Jan 2027 in Malaysia.
    assert.equal(bookingNumberYear(new Date("2026-12-31T20:00:00Z")), 27);
    assert.equal(bookingNumberYear(new Date("2026-11-03T02:00:00Z")), 26);
  });

  it("keeps the quotation's number beside the invoice's", () => {
    const quoted = { ...NONE, quoteYear: 26, quoteNumber: 42 };
    assert.deepEqual(bookingNumbersOf(quoted), {
      quote: "HTQ-26-00042",
      invoice: null,
    });
    const sold = { ...quoted, invoiceYear: 26, invoiceNumber: 17 };
    assert.deepEqual(bookingNumbersOf(sold), {
      quote: "HTQ-26-00042",
      invoice: "HTI-26-00017",
    });
  });

  it("is called by its invoice, else its quotation, else its reference", () => {
    const reference = "HT-7K3QZM";
    assert.equal(bookingLabelOf({ ...NONE, reference }), reference);
    const quoted = { ...NONE, reference, quoteYear: 26, quoteNumber: 42 };
    assert.equal(bookingLabelOf(quoted), "HTQ-26-00042");
    assert.equal(
      bookingLabelOf({ ...quoted, invoiceYear: 26, invoiceNumber: 17 }),
      "HTI-26-00017",
    );
    // A website booking: an invoice number only.
    assert.equal(
      bookingLabelOf({ ...NONE, reference, invoiceYear: 26, invoiceNumber: 3 }),
      "HTI-26-00003",
    );
  });

  it("finds a number however it is typed", () => {
    assert.deepEqual(parseBookingNumber("HTQ-26-00042"), {
      kind: "quote",
      year: 26,
      number: 42,
    });
    assert.deepEqual(parseBookingNumber("hti-26-42"), {
      kind: "invoice",
      year: 26,
      number: 42,
    });
    assert.deepEqual(parseBookingNumber("26/00042"), {
      kind: null,
      year: 26,
      number: 42,
    });
    assert.equal(parseBookingNumber("HT-7K3QZM"), null);
    assert.equal(parseBookingNumber("26-0"), null);
  });
});
