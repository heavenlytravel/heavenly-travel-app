import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BOOKING_NOTE_MAX_LENGTH,
  checkPriceOverride,
  parseNoteBody,
  parsePriceOverride,
} from "./booking-input";

describe("parseNoteBody", () => {
  it("trims the note and refuses a blank one", () => {
    assert.deepEqual(parseNoteBody("  Customer will pay cash.  "), {
      ok: true,
      value: "Customer will pay cash.",
    });
    assert.equal(parseNoteBody("   ").ok, false);
    assert.equal(parseNoteBody(undefined).ok, false);
  });

  it("refuses a note past the limit", () => {
    assert.equal(parseNoteBody("x".repeat(BOOKING_NOTE_MAX_LENGTH)).ok, true);
    assert.equal(
      parseNoteBody("x".repeat(BOOKING_NOTE_MAX_LENGTH + 1)).ok,
      false,
    );
  });
});

describe("parsePriceOverride", () => {
  it("reads ringgit into sen with the reason", () => {
    assert.deepEqual(
      parsePriceOverride({
        amount: "RM 1,250.50",
        reason: " Agreed by phone ",
      }),
      { ok: true, value: { totalSen: 125050, reason: "Agreed by phone" } },
    );
  });

  it("is no override when both fields are blank", () => {
    assert.deepEqual(parsePriceOverride({ amount: "", reason: "  " }), {
      ok: true,
      value: null,
    });
  });

  it("needs both the amount and the reason", () => {
    assert.equal(parsePriceOverride({ amount: "300", reason: "" }).ok, false);
    assert.equal(parsePriceOverride({ amount: "", reason: "Deal" }).ok, false);
    assert.equal(
      parsePriceOverride({ amount: "-5", reason: "Deal" }).ok,
      false,
    );
    assert.equal(
      parsePriceOverride({ amount: "12.345", reason: "Deal" }).ok,
      false,
    );
  });

  it("allows a free trip and refuses a long reason", () => {
    assert.equal(
      checkPriceOverride({ totalSen: 0, reason: "Goodwill" }).ok,
      true,
    );
    assert.equal(
      checkPriceOverride({ totalSen: 100, reason: "x".repeat(201) }).ok,
      false,
    );
  });
});
