import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dateOfDay,
  dayOf,
  documentsDue,
  dueByDate,
  expiryStateOf,
  expiryText,
  formatDay,
  isDay,
  parseDay,
} from "./expiry";

// 19 Oct 2026, 23:30 in Malaysia: still the 19th there, the 19th in UTC too.
const NOW = new Date("2026-10-19T15:30:00Z");
// 20 Oct 2026, 00:30 in Malaysia, but the 19th in UTC.
const PAST_MIDNIGHT = new Date("2026-10-19T16:30:00Z");

describe("days", () => {
  it("round-trips a day through the stored date", () => {
    assert.equal(dayOf(dateOfDay("2027-03-12")), "2027-03-12");
    assert.equal(dayOf(null), null);
    assert.equal(dateOfDay(null), null);
  });

  it("knows a real calendar day", () => {
    assert.equal(isDay("2027-02-28"), true);
    assert.equal(isDay("2027-02-31"), false);
    assert.equal(isDay("12/03/2027"), false);
  });

  it("reads a date input: empty is none", () => {
    assert.deepEqual(parseDay("", "Road tax"), { ok: true, value: null });
    assert.deepEqual(parseDay(" 2027-03-12 ", "Road tax"), {
      ok: true,
      value: "2027-03-12",
    });
    const wrong = parseDay("2027-13-01", "Road tax");
    assert.equal(wrong.ok, false);
    assert.match(wrong.ok ? "" : wrong.error, /road tax expiry/);
  });

  it("formats a day as people read it", () => {
    assert.equal(formatDay("2027-03-12"), "12 Mar 2027");
  });
});

describe("expiryStateOf", () => {
  it("is valid through its day, due within 30 days, expired after", () => {
    assert.equal(expiryStateOf("2026-10-18", NOW), "expired");
    assert.equal(expiryStateOf("2026-10-19", NOW), "due");
    assert.equal(expiryStateOf("2026-11-18", NOW), "due");
    assert.equal(expiryStateOf("2026-11-19", NOW), "valid");
  });

  it("counts the day in Malaysia", () => {
    assert.equal(expiryStateOf("2026-10-19", PAST_MIDNIGHT), "expired");
    assert.equal(dayOf(dueByDate(PAST_MIDNIGHT)), "2026-11-19");
  });
});

describe("documentsDue", () => {
  it("lists the due and the expired, soonest first, and skips the rest", () => {
    const due = documentsDue(
      {
        roadTax: "2026-11-01",
        insurance: "2026-10-01",
        permit: "2027-06-01",
        inspection: null,
      },
      {
        roadTax: "Road tax",
        insurance: "Insurance",
        permit: "Permit",
        inspection: "Inspection",
      },
      NOW,
    );
    assert.deepEqual(due, [
      { label: "Insurance", expiresOn: "2026-10-01", state: "expired" },
      { label: "Road tax", expiresOn: "2026-11-01", state: "due" },
    ]);
  });
});

describe("expiryText", () => {
  it("says how far off a day is", () => {
    assert.equal(expiryText("2026-10-19", NOW), "Expires today");
    assert.equal(expiryText("2026-10-20", NOW), "Expires tomorrow");
    assert.equal(expiryText("2026-10-31", NOW), "Expires in 12 days");
    assert.equal(expiryText("2026-10-18", NOW), "Expired yesterday");
    assert.equal(expiryText("2026-10-16", NOW), "Expired 3 days ago");
  });
});
