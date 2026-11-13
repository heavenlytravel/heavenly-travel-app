import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bookingLabelOf,
  bookingRefOfPath,
  documentLabelOf,
  formatDocumentNumber,
  parseDocumentNumber,
  parseLegacyInvoiceNumber,
} from "./booking-number";

describe("document numbers", () => {
  it("writes four digits at least, and more once past 9999", () => {
    assert.equal(formatDocumentNumber("booking", 1), "HTB-0001");
    assert.equal(formatDocumentNumber("invoice", 1308), "HTI-1308");
    assert.equal(formatDocumentNumber("credit", 10001), "HTC-10001");
    assert.equal(formatDocumentNumber("quote", 42), "HTQ-0042");
  });

  it("names a booking by its number, and one not numbered yet by its id", () => {
    assert.equal(bookingLabelOf({ id: "ck1", number: 1042 }), "HTB-1042");
    assert.equal(
      bookingLabelOf({ id: "ck1", number: 1042, quoteNumber: 12 }),
      "HTB-1042",
    );
    assert.equal(
      bookingLabelOf({ id: "ck1", number: null, quoteNumber: 12 }),
      "HTQ-0012",
    );
    assert.equal(
      bookingLabelOf({ id: "cmabcdef123456", number: null }),
      "Booking 123456",
    );
  });

  it("names an open invoice until it is numbered", () => {
    assert.equal(
      documentLabelOf({ type: "invoice", number: null }),
      "Open Invoice",
    );
    assert.equal(documentLabelOf({ type: "invoice", number: 12 }), "HTI-0012");
    assert.equal(documentLabelOf({ type: "credit", number: 3 }), "HTC-0003");
  });

  it("reads a number as typed, any kind for digits alone", () => {
    assert.deepEqual(parseDocumentNumber("HTB-1042"), {
      kind: "booking",
      number: 1042,
    });
    assert.deepEqual(parseDocumentNumber(" htc0003 "), {
      kind: "credit",
      number: 3,
    });
    assert.deepEqual(parseDocumentNumber("HTI 12"), {
      kind: "invoice",
      number: 12,
    });
    assert.deepEqual(parseDocumentNumber("1042"), { kind: null, number: 1042 });
    assert.equal(parseDocumentNumber("HT-7K3QZM"), null);
    assert.equal(parseDocumentNumber("HTI-1295-03"), null);
    assert.equal(parseDocumentNumber("HTB-0"), null);
  });

  it("opens a website booking only by its number as the site writes it", () => {
    assert.deepEqual(bookingRefOfPath("HTB-1042"), {
      kind: "booking",
      number: 1042,
    });
    assert.deepEqual(bookingRefOfPath("HTB-10001"), {
      kind: "booking",
      number: 10001,
    });
    assert.deepEqual(bookingRefOfPath("HTQ-0012"), {
      kind: "quote",
      number: 12,
    });
    assert.equal(bookingRefOfPath("htb-1042"), null);
    assert.equal(bookingRefOfPath("HTI-0001"), null);
    assert.equal(bookingRefOfPath("HT-7K3QZM"), null);
    assert.equal(bookingRefOfPath("1042"), null);
    assert.equal(bookingRefOfPath("%E0"), null);
  });

  it("keeps a legacy invoice number as free text, upper case", () => {
    assert.deepEqual(parseLegacyInvoiceNumber("  "), { ok: true, value: null });
    assert.deepEqual(parseLegacyInvoiceNumber(" hti-1295-03 "), {
      ok: true,
      value: "HTI-1295-03",
    });
    assert.deepEqual(parseLegacyInvoiceNumber("HT 1223"), {
      ok: true,
      value: "HT 1223",
    });
    assert.equal(parseLegacyInvoiceNumber("x".repeat(41)).ok, false);
  });
});
