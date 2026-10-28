import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  boardColumnOf,
  defaultRespondBy,
  estimateDriveMinutes,
  firstClash,
  jobsClash,
  owesAfterCancel,
  timingWarnings,
  tripAssigned,
  tripWindow,
  type Job,
} from "./fulfilment-rules";

const at = (iso: string) => new Date(iso);
const HOUR = 60 * 60 * 1000;

/** A one-way job: 8:00 local is 00:00Z. */
function job(over: Partial<Job> = {}): Job {
  return {
    reference: "HT-AAAAAA",
    startsAt: at("2026-11-03T00:00:00Z"),
    endsAt: null,
    driveMinutes: 45,
    distanceKm: 30,
    pickup: { label: "Airport", at: [99.73, 6.33] },
    dropoff: { label: "Datai", at: [99.68, 6.43] },
    ...over,
  };
}

describe("tripWindow", () => {
  it("ends an hourly hire at its booked end, known", () => {
    const end = at("2026-11-03T04:00:00Z");
    assert.deepEqual(tripWindow(job({ endsAt: end })), {
      start: at("2026-11-03T00:00:00Z"),
      end,
      estimated: false,
    });
  });

  it("ends a one-way trip after Google's drive, or an estimate from its distance", () => {
    assert.equal(
      tripWindow(job()).end.toISOString(),
      "2026-11-03T00:45:00.000Z",
    );
    const old = tripWindow(job({ driveMinutes: null, distanceKm: 50 }));
    assert.equal(old.end.getTime() - old.start.getTime(), 60 * 60 * 1000);
    assert.equal(old.estimated, true);
  });

  it("estimates whole minutes, rounded up", () => {
    assert.equal(estimateDriveMinutes(1), 2);
    assert.equal(estimateDriveMinutes(0), 0);
  });
});

describe("jobsClash", () => {
  it("refuses the same start", () => {
    assert.equal(jobsClash(job(), job({ reference: "HT-B" })), "same-time");
  });

  it("refuses a start during an hourly hire, either way round", () => {
    const hire = job({ endsAt: at("2026-11-03T04:00:00Z") });
    const later = job({ startsAt: at("2026-11-03T02:00:00Z") });
    assert.equal(jobsClash(hire, later), "during-hire");
    assert.equal(jobsClash(later, hire), "during-hire");
  });

  it("never refuses on an estimate: a one-way trip has no known end", () => {
    const soon = job({ startsAt: at("2026-11-03T00:10:00Z") });
    assert.equal(jobsClash(job(), soon), null);
  });

  it("finds the first clash among the jobs held", () => {
    const held = [job({ startsAt: at("2026-11-04T00:00:00Z") }), job()];
    assert.equal(firstClash([job()], held)?.kind, "same-time");
    assert.equal(firstClash([job()], held.slice(0, 1)), null);
  });
});

describe("timingWarnings", () => {
  const next = job({
    reference: "HT-NEXT",
    startsAt: at("2026-11-03T01:00:00Z"),
    pickup: { label: "Cenang", at: [99.73, 6.29] },
  });

  it("warns when the drive and the buffer reach past the next pickup", () => {
    const warnings = timingWarnings([next], [job()], {
      bufferMinutes: 15,
      drive: () => ({ minutes: 60, about: true }),
      who: "Ali",
    });
    assert.equal(warnings.length, 1);
    assert.match(warnings[0]!, /Ali finishes HT-AAAAAA at Datai about/);
    assert.match(warnings[0]!, /Cenang is about 60 min away/);
  });

  it("says nothing when there is time", () => {
    const warnings = timingWarnings([next], [job()], {
      bufferMinutes: 0,
      drive: () => ({ minutes: 10, about: false }),
    });
    assert.deepEqual(warnings, []);
  });

  it("leaves two jobs held alone: only a pair with one asked is this choice's", () => {
    const warnings = timingWarnings([], [job(), next], {
      bufferMinutes: 15,
      drive: () => ({ minutes: 60, about: true }),
    });
    assert.deepEqual(warnings, []);
  });
});

describe("tripAssigned and boardColumnOf", () => {
  const accepted = at("2026-11-01T00:00:00Z");
  const vehicle = {
    role: "vehicle",
    vehicleId: "v1",
    driverId: null,
    vendorAcceptedAt: accepted,
    driverAcceptedAt: null,
  };
  const driver = {
    role: "driver",
    vehicleId: null,
    driverId: "d1",
    vendorAcceptedAt: accepted,
    driverAcceptedAt: accepted,
  };

  it("needs a vehicle and a driver, each accepted, the driver by themself too", () => {
    assert.equal(tripAssigned([vehicle, driver]), true);
    assert.equal(tripAssigned([vehicle]), false);
    assert.equal(
      tripAssigned([vehicle, { ...driver, driverAcceptedAt: null }]),
      false,
    );
    assert.equal(
      tripAssigned([{ ...vehicle, vehicleId: null }, driver]),
      false,
    );
  });

  it("puts a trip in its column", () => {
    const base = { status: "confirmed", reported: false };
    assert.equal(boardColumnOf({ ...base, parts: [] }), "to-assign");
    assert.equal(boardColumnOf({ ...base, parts: [vehicle] }), "waiting");
    assert.equal(
      boardColumnOf({ ...base, status: "assigned", parts: [vehicle, driver] }),
      "assigned",
    );
    assert.equal(
      boardColumnOf({ status: "assigned", reported: true, parts: [] }),
      "on-the-road",
    );
    assert.equal(
      boardColumnOf({ status: "completed", reported: true, parts: [] }),
      "done",
    );
  });
});

describe("defaultRespondBy", () => {
  const now = at("2026-11-01T00:00:00Z");

  it("gives two hours", () => {
    const pickup = at("2026-11-05T00:00:00Z");
    assert.equal(
      defaultRespondBy(pickup, now).getTime(),
      now.getTime() + 2 * HOUR,
    );
  });

  it("never later than an hour before the pickup, nor before now", () => {
    assert.equal(
      defaultRespondBy(at("2026-11-01T02:30:00Z"), now).toISOString(),
      "2026-11-01T01:30:00.000Z",
    );
    assert.equal(
      defaultRespondBy(at("2026-11-01T00:30:00Z"), now).getTime(),
      now.getTime(),
    );
  });
});

describe("owesAfterCancel", () => {
  const trip = {
    startsAt: at("2026-11-03T00:00:00Z"),
    cancellationCutoffHours: 24,
  };

  it("owes nothing before the free-cancellation deadline, and the cost after", () => {
    assert.equal(owesAfterCancel(trip, at("2026-11-01T23:00:00Z")), false);
    assert.equal(owesAfterCancel(trip, at("2026-11-02T00:00:00Z")), true);
  });
});
