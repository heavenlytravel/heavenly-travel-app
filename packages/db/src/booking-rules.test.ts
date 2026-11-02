import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cancellationDeadline,
  classAvailability,
  fitsPassengers,
  isWithinHorizon,
  largestGroup,
  latestPickup,
  localDateTimeInputs,
  localDayRange,
  pickupInstant,
  unavailableReason,
} from "./booking-rules";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const now = new Date("2026-09-23T04:00:00Z");
const after = (ms: number) => new Date(now.getTime() + ms);

describe("booking horizon", () => {
  it("accepts a pickup up to 12 months ahead, the last instant included", () => {
    assert.equal(isWithinHorizon(after(300 * DAY), now), true);
    assert.equal(isWithinHorizon(after(365 * DAY), now), true);
    assert.equal(latestPickup(now).getTime(), now.getTime() + 365 * DAY);
  });

  it("rejects a pickup beyond it", () => {
    assert.equal(isWithinHorizon(after(365 * DAY + 1), now), false);
    assert.equal(isWithinHorizon(after(366 * DAY), now), false);
  });
});

describe("classAvailability", () => {
  const coach = { minLeadHours: 24 };

  it("is available with enough notice for a one-way trip", () => {
    assert.deepEqual(
      classAvailability(coach, { startsAt: after(48 * HOUR) }, now),
      { ok: true },
    );
  });

  it("needs the notice, the exact edge included", () => {
    assert.deepEqual(
      classAvailability(coach, { startsAt: after(24 * HOUR) }, now),
      { ok: true },
    );
    assert.deepEqual(
      classAvailability(coach, { startsAt: after(24 * HOUR - 1) }, now),
      { ok: false, reason: "too-soon", minLeadHours: 24 },
    );
  });

  it("refuses a pickup already in the past", () => {
    assert.equal(
      classAvailability(coach, { startsAt: after(-HOUR) }, now).ok,
      false,
    );
  });

  it("holds no notice against an admin, past pickups too", () => {
    for (const startsAt of [after(HOUR), after(-48 * HOUR)]) {
      assert.deepEqual(classAvailability(coach, { startsAt }, now, "admin"), {
        ok: true,
      });
    }
  });

  it("says why in the options page's words", () => {
    assert.equal(unavailableReason({ ok: true }), null);
    assert.equal(
      unavailableReason({ ok: false, reason: "not-on-route" }),
      "Not offered on this trip",
    );
  });
});

describe("fitsPassengers", () => {
  const minibus = { maxPassengers: 24 };

  it("fits any group up to the maximum, however small", () => {
    assert.equal(fitsPassengers(minibus, 1), true);
    assert.equal(fitsPassengers(minibus, 24), true);
  });

  it("refuses a larger group and anything that is not a head count", () => {
    assert.equal(fitsPassengers(minibus, 25), false);
    assert.equal(fitsPassengers(minibus, 0), false);
    assert.equal(fitsPassengers(minibus, 2.5), false);
  });

  it("fits any group for an admin, but still only a head count", () => {
    assert.equal(fitsPassengers(minibus, 40, "admin"), true);
    assert.equal(fitsPassengers(minibus, 0, "admin"), false);
    assert.equal(fitsPassengers(minibus, 2.5, "admin"), false);
  });
});

describe("largestGroup", () => {
  it("is the largest maximum among the classes", () => {
    assert.equal(
      largestGroup([
        { maxPassengers: 3 },
        { maxPassengers: 10 },
        { maxPassengers: 6 },
      ]),
      10,
    );
  });

  it("is 0 when there is no class", () => {
    assert.equal(largestGroup([]), 0);
  });
});

describe("cancellationDeadline", () => {
  it("is the class's cutoff before pickup", () => {
    const startsAt = after(72 * HOUR);
    assert.equal(
      cancellationDeadline(startsAt, 24).getTime(),
      startsAt.getTime() - 24 * HOUR,
    );
    assert.equal(
      cancellationDeadline(startsAt, 48).getTime(),
      startsAt.getTime() - 48 * HOUR,
    );
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

describe("localDayRange", () => {
  it("bounds the Malaysian calendar day, not the UTC one", () => {
    // 23:30 in Kuala Lumpur on 3 Oct is 15:30 UTC the same day.
    const { start, end } = localDayRange(new Date("2026-10-03T15:30:00Z"));
    assert.equal(start.toISOString(), "2026-10-02T16:00:00.000Z");
    assert.equal(end.toISOString(), "2026-10-03T16:00:00.000Z");
  });

  it("puts an instant just after local midnight in the new day", () => {
    // 00:10 in Kuala Lumpur on 4 Oct is 16:10 UTC on 3 Oct.
    const { start } = localDayRange(new Date("2026-10-03T16:10:00Z"));
    assert.equal(start.toISOString(), "2026-10-03T16:00:00.000Z");
  });
});

describe("localDateTimeInputs", () => {
  it("is the inverse of pickupInstant", () => {
    const instant = pickupInstant("2026-10-03", "09:30")!;
    assert.deepEqual(localDateTimeInputs(instant), {
      date: "2026-10-03",
      time: "09:30",
    });
    assert.deepEqual(localDateTimeInputs(new Date("2026-10-03T17:15:00Z")), {
      date: "2026-10-04",
      time: "01:15",
    });
  });
});
