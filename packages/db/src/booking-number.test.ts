import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bookingLabelOf,
  bookingNumbersOf,
  formatBookingNumber,
  parseBookingNumber,
} from "./booking-number";

const NONE = { quoteNumber: null, invoiceNumber: null };

describe("booking numbers", () => {
  it("writes four digits at least, and more once past 9999", () => {
    assert.equal(formatBookingNumber("quote", 1), "HTQ-0001");
    assert.equal(formatBookingNumber("invoice", 1308), "HTI-1308");
    assert.equal(formatBookingNumber("invoice", 10001), "HTI-10001");
  });

  it("keeps a quotation's number beside the invoice's", () => {
    const quoted = { ...NONE, quoteNumber: 42 };
    assert.deepEqual(bookingNumbersOf(quoted), {
      quote: "HTQ-0042",
      invoice: null,
    });
    assert.deepEqual(bookingNumbersOf({ ...quoted, invoiceNumber: 1308 }), {
      quote: "HTQ-0042",
      invoice: "HTI-1308",
    });
  });

  it("names a booking by its invoice, else its quotation, else its reference", () => {
    const reference = "HT-7K3QZM";
    assert.equal(bookingLabelOf({ ...NONE, reference }), reference);
    const quoted = { ...NONE, reference, quoteNumber: 42 };
    assert.equal(bookingLabelOf(quoted), "HTQ-0042");
    assert.equal(
      bookingLabelOf({ ...quoted, invoiceNumber: 1308 }),
      "HTI-1308",
    );
  });

  it("reads a number as typed", () => {
    assert.deepEqual(parseBookingNumber("HTI-1308"), {
      kind: "invoice",
      number: 1308,
    });
    // The old system's invoices: HT and the digits.
    assert.deepEqual(parseBookingNumber("HT1223"), {
      kind: "invoice",
      number: 1223,
    });
    assert.deepEqual(parseBookingNumber(" htq-0042 "), {
      kind: "quote",
      number: 42,
    });
    assert.deepEqual(parseBookingNumber("1308"), { kind: null, number: 1308 });
    assert.equal(parseBookingNumber("HT-7K3QZM"), null);
    assert.equal(parseBookingNumber("HTI-0"), null);
  });
});
