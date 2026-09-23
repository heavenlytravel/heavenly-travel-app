import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BOOKING_RULES,
  cancellationDeadline,
  checkHours,
  checkPickupWindow,
  HOURLY_OPTIONS,
  isBeforeCancellationCutoff,
  pickupInstant,
  pickupWindow,
  rulesFor,
} from "./booking-rules";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const now = new Date("2026-09-23T04:00:00Z");
const after = (ms: number) => new Date(now.getTime() + ms);

describe("rulesFor", () => {
  it("uses the global defaults when the zone leaves them empty", () => {
    assert.deepEqual(rulesFor(null), {
      minLeadHours: BOOKING_RULES.minLeadHours,
      maxHorizonDays: BOOKING_RULES.maxHorizonDays,
    });
    assert.deepEqual(rulesFor({ minLeadHours: null, maxHorizonDays: null }), {
      minLeadHours: BOOKING_RULES.minLeadHours,
      maxHorizonDays: BOOKING_RULES.maxHorizonDays,
    });
  });

  it("lets a zone override either rule on its own", () => {
    assert.deepEqual(rulesFor({ minLeadHours: 12, maxHorizonDays: null }), {
      minLeadHours: 12,
      maxHorizonDays: BOOKING_RULES.maxHorizonDays,
    });
  });
});

describe("checkPickupWindow", () => {
  it("accepts a pickup inside the window", () => {
    assert.deepEqual(checkPickupWindow(after(5 * HOUR), null, now), {
      ok: true,
    });
    assert.deepEqual(checkPickupWindow(after(300 * DAY), null, now), {
      ok: true,
    });
  });

  it("rejects a pickup sooner than the lead time", () => {
    assert.deepEqual(checkPickupWindow(after(3 * HOUR), null, now), {
      ok: false,
      reason: "too-soon",
    });
  });

  it("rejects a pickup beyond the horizon", () => {
    assert.deepEqual(checkPickupWindow(after(366 * DAY), null, now), {
      ok: false,
      reason: "too-far",
    });
  });

  it("honours zone overrides", () => {
    const zone = { minLeadHours: 24, maxHorizonDays: 30 };
    assert.equal(checkPickupWindow(after(5 * HOUR), zone, now).ok, false);
    assert.equal(checkPickupWindow(after(25 * HOUR), zone, now).ok, true);
    assert.equal(checkPickupWindow(after(31 * DAY), zone, now).ok, false);
  });

  it("exposes the window bounds for forms", () => {
    const { earliest, latest } = pickupWindow(null, now);
    assert.equal(earliest.getTime(), now.getTime() + 4 * HOUR);
    assert.equal(latest.getTime(), now.getTime() + 365 * DAY);
  });
});

describe("checkHours", () => {
  it("accepts whole hours from the minimum to the maximum", () => {
    assert.deepEqual(checkHours(3), { ok: true });
    assert.deepEqual(checkHours(12), { ok: true });
  });

  it("rejects too few, too many and fractional hours", () => {
    assert.deepEqual(checkHours(2), { ok: false, reason: "too-few" });
    assert.deepEqual(checkHours(13), { ok: false, reason: "too-many" });
    assert.deepEqual(checkHours(3.5), { ok: false, reason: "not-whole" });
  });

  it("offers exactly the accepted hours as options", () => {
    assert.deepEqual(HOURLY_OPTIONS, [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    assert.ok(HOURLY_OPTIONS.every((h) => checkHours(h).ok));
  });
});

describe("cancellation cutoff", () => {
  it("is 24 hours before pickup", () => {
    const startsAt = after(48 * HOUR);
    assert.equal(
      cancellationDeadline(startsAt).getTime(),
      startsAt.getTime() - 24 * HOUR,
    );
  });

  it("allows a cancel before the cutoff and refuses one inside it", () => {
    assert.equal(isBeforeCancellationCutoff(after(25 * HOUR), now), true);
    assert.equal(isBeforeCancellationCutoff(after(24 * HOUR), now), false);
    assert.equal(isBeforeCancellationCutoff(after(1 * HOUR), now), false);
  });
});

describe("pickupInstant", () => {
  it("reads a date and time as Malaysian local time", () => {
    const instant = pickupInstant("2026-10-12", "09:30");
    assert.equal(instant?.toISOString(), "2026-10-12T01:30:00.000Z");
  });

  it("keeps a midnight pickup on the chosen local date", () => {
    const instant = pickupInstant("2026-10-12", "00:00");
    assert.equal(instant?.toISOString(), "2026-10-11T16:00:00.000Z");
  });

  it("rejects malformed and impossible values", () => {
    assert.equal(pickupInstant("", "09:30"), null);
    assert.equal(pickupInstant("2026-10-12", ""), null);
    assert.equal(pickupInstant("12/10/2026", "09:30"), null);
    assert.equal(pickupInstant("2026-02-31", "09:30"), null);
    assert.equal(pickupInstant("2026-10-12", "24:00"), null);
    assert.equal(pickupInstant("2026-10-12", "09:60"), null);
  });
});
