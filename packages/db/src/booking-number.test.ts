import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bookingLabelOf,
  bookingNumbersOf,
  formatBookingNumber,
  formatInvoiceNumber,
  invoicePeriodEnd,
  invoicePeriodLabel,
  invoicePeriodStart,
  parseBookingNumber,
  parseOldInvoiceNumber,
} from "./booking-number";

const NONE = { quoteNumber: null, invoiceLine: null, invoice: null };

describe("booking numbers", () => {
  it("writes four digits at least, and more once past 9999", () => {
    assert.equal(formatBookingNumber("quote", 1), "HTQ-0001");
    assert.equal(formatBookingNumber("invoice", 1308), "HTI-1308");
    assert.equal(formatBookingNumber("invoice", 10001), "HTI-10001");
  });

  it("writes an agent's invoice line after the invoice", () => {
    assert.equal(formatInvoiceNumber(1295, 3), "HTI-1295-03");
    assert.equal(formatInvoiceNumber(1295, 120), "HTI-1295-120");
    assert.equal(formatInvoiceNumber(1308, null), "HTI-1308");
  });

  it("keeps a quotation's number beside the invoice's", () => {
    const quoted = { ...NONE, quoteNumber: 42 };
    assert.deepEqual(bookingNumbersOf(quoted), {
      quote: "HTQ-0042",
      invoice: null,
    });
    assert.deepEqual(
      bookingNumbersOf({ ...quoted, invoice: { number: 1308 } }),
      { quote: "HTQ-0042", invoice: "HTI-1308" },
    );
  });

  it("names a booking by its invoice, else its quotation, else its reference", () => {
    const reference = "HT-7K3QZM";
    assert.equal(bookingLabelOf({ ...NONE, reference }), reference);
    const quoted = { ...NONE, reference, quoteNumber: 42 };
    assert.equal(bookingLabelOf(quoted), "HTQ-0042");
    assert.equal(
      bookingLabelOf({ ...quoted, invoice: { number: 1308 } }),
      "HTI-1308",
    );
    assert.equal(
      bookingLabelOf({ ...quoted, invoice: { number: 1295 }, invoiceLine: 2 }),
      "HTI-1295-02",
    );
  });

  it("reads a number as typed", () => {
    assert.deepEqual(parseBookingNumber("HTI-1308"), {
      kind: "invoice",
      number: 1308,
      line: null,
    });
    // The old system's invoices: HT and the digits.
    assert.deepEqual(parseBookingNumber("HT1223"), {
      kind: "invoice",
      number: 1223,
      line: null,
    });
    assert.deepEqual(parseBookingNumber(" htq-0042 "), {
      kind: "quote",
      number: 42,
      line: null,
    });
    assert.deepEqual(parseBookingNumber("1308"), {
      kind: null,
      number: 1308,
      line: null,
    });
    assert.equal(parseBookingNumber("HT-7K3QZM"), null);
    assert.equal(parseBookingNumber("HTI-0"), null);
  });

  it("reads an agent's invoice line, only of an invoice", () => {
    const line = { kind: "invoice", number: 1295, line: 3 };
    assert.deepEqual(parseBookingNumber("HTI-1295-03"), line);
    assert.deepEqual(parseBookingNumber("HT1295-03"), line);
    assert.deepEqual(parseBookingNumber("1295-3"), line);
    assert.equal(parseBookingNumber("HTQ-0042-01"), null);
    assert.equal(parseBookingNumber("HTI-1295-00"), null);
  });

  it("reads an old invoice's number typed by staff, refusing anything else", () => {
    assert.deepEqual(parseOldInvoiceNumber("  "), { ok: true, number: null });
    assert.deepEqual(parseOldInvoiceNumber("HT1223"), {
      ok: true,
      number: 1223,
    });
    assert.equal(parseOldInvoiceNumber("HTQ-0042").ok, false);
    assert.equal(parseOldInvoiceNumber("HTI-1295-03").ok, false);
    assert.equal(parseOldInvoiceNumber("HT-7K3QZM").ok, false);
  });
});

describe("invoice periods", () => {
  it("puts a trip in its month by Malaysia's calendar", () => {
    // 00:30 on 1 November in Malaysia is 16:30 on 31 October in UTC.
    const early = new Date("2026-10-31T16:30:00Z");
    assert.equal(invoicePeriodStart(early, "month"), "2026-11-01");
    assert.equal(
      invoicePeriodStart(new Date("2026-10-31T15:59:00Z"), "month"),
      "2026-10-01",
    );
  });

  it("splits a month in two halves on the 16th", () => {
    const at = (day: string) => new Date(`2026-11-${day}T04:00:00Z`);
    assert.equal(invoicePeriodStart(at("15"), "half-month"), "2026-11-01");
    assert.equal(invoicePeriodStart(at("16"), "half-month"), "2026-11-16");
    assert.equal(invoicePeriodStart(at("30"), "half-month"), "2026-11-16");
  });

  it("ends a period on its last day", () => {
    assert.equal(invoicePeriodEnd("2026-11-01", "month"), "2026-11-30");
    assert.equal(invoicePeriodEnd("2026-12-01", "month"), "2026-12-31");
    assert.equal(invoicePeriodEnd("2028-02-01", "month"), "2028-02-29");
    assert.equal(invoicePeriodEnd("2026-11-01", "half-month"), "2026-11-15");
    assert.equal(invoicePeriodEnd("2026-11-16", "half-month"), "2026-11-30");
  });

  it("names a period", () => {
    assert.equal(invoicePeriodLabel("2026-11-01", "month"), "November 2026");
    assert.equal(
      invoicePeriodLabel("2026-11-01", "half-month"),
      "1–15 November 2026",
    );
    assert.equal(
      invoicePeriodLabel("2026-11-16", "half-month"),
      "16–30 November 2026",
    );
  });
});
