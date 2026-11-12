import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assignStateOf,
  candidateOption,
  isOtherClass,
  driverClassWarning,
  vehicleDriverWarning,
  type ClassRule,
  defaultRespondBy,
  estimateDriveMinutes,
  firstClash,
  isUrgentTrip,
  rolesToAsk,
  jobsClash,
  owesAfterCancel,
  partWaitingOf,
  timingWarnings,
  tripAssigned,
  tripWindow,
  untilPickup,
  type Job,
} from "./fulfilment-rules";

const at = (iso: string) => new Date(iso);
const HOUR = 60 * 60 * 1000;

/** A one-way job: 08:00 local is 00:00Z. */
function job(over: Partial<Job> = {}): Job {
  return {
    bookingLabel: "HTB-0001",
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
    assert.equal(jobsClash(job(), job({ bookingLabel: "HT-B" })), "same-time");
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
    bookingLabel: "HT-NEXT",
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
    assert.match(warnings[0]!, /Ali finishes HTB-0001 at Datai about/);
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

describe("tripAssigned and assignStateOf", () => {
  const accepted = at("2026-11-01T00:00:00Z");
  const vehicle = {
    role: "vehicle",
    vehicleId: "v1",
    driverId: null,
    guideId: null,
    vendorAcceptedAt: accepted,
    driverAcceptedAt: null,
  };
  const driver = {
    role: "driver",
    vehicleId: null,
    driverId: "d1",
    guideId: null,
    vendorAcceptedAt: accepted,
    driverAcceptedAt: accepted,
  };
  const guide = {
    role: "guide",
    vehicleId: null,
    driverId: null,
    guideId: "g1",
    vendorAcceptedAt: accepted,
    driverAcceptedAt: null,
  };

  it("needs a vehicle and a driver, each accepted, the driver by themself too", () => {
    assert.equal(tripAssigned([vehicle, driver], false), true);
    assert.equal(tripAssigned([vehicle], false), false);
    assert.equal(
      tripAssigned([vehicle, { ...driver, driverAcceptedAt: null }], false),
      false,
    );
    assert.equal(
      tripAssigned([{ ...vehicle, vehicleId: null }, driver], false),
      false,
    );
  });

  it("needs a guide too on a trip with one, named and accepted by the vendor alone", () => {
    assert.equal(tripAssigned([vehicle, driver], true), false);
    assert.equal(tripAssigned([vehicle, driver, guide], true), true);
    assert.equal(
      tripAssigned([vehicle, driver, { ...guide, guideId: null }], true),
      false,
    );
    assert.equal(
      tripAssigned(
        [vehicle, driver, { ...guide, vendorAcceptedAt: null }],
        true,
      ),
      false,
    );
  });

  it("puts a trip in its column", () => {
    const base = { status: "confirmed", reported: false, withGuide: false };
    assert.equal(assignStateOf({ ...base, parts: [] }), "to-assign");
    // Half asked is still to assign: the driver has no one asked.
    assert.equal(assignStateOf({ ...base, parts: [vehicle] }), "to-assign");
    assert.equal(
      assignStateOf({
        ...base,
        parts: [vehicle, { ...driver, driverAcceptedAt: null }],
      }),
      "waiting",
    );
    // With a guide booked, the guide is asked too before it waits.
    assert.equal(
      assignStateOf({
        ...base,
        withGuide: true,
        parts: [vehicle, { ...driver, driverAcceptedAt: null }],
      }),
      "to-assign",
    );
    assert.equal(
      assignStateOf({ ...base, status: "assigned", parts: [vehicle, driver] }),
      "assigned",
    );
    assert.equal(
      assignStateOf({
        status: "assigned",
        reported: true,
        parts: [],
        withGuide: false,
      }),
      "on-the-road",
    );
    assert.equal(
      assignStateOf({
        status: "completed",
        reported: true,
        parts: [],
        withGuide: false,
      }),
      "done",
    );
    // A no-show its driver may still take back: they are still at the pickup.
    assert.equal(
      assignStateOf({
        status: "completed",
        reported: true,
        parts: [],
        withGuide: false,
        noShowOpen: true,
      }),
      "on-the-road",
    );
  });
});

describe("isUrgentTrip", () => {
  const now = at("2026-11-05T00:00:00Z");
  const soon = at("2026-11-05T02:00:00Z");
  const later = at("2026-11-07T00:00:00Z");

  it("is urgent within the day while still to assign or waiting", () => {
    assert.equal(
      isUrgentTrip({ startsAt: soon, state: "to-assign" }, now),
      true,
    );
    assert.equal(isUrgentTrip({ startsAt: soon, state: "waiting" }, now), true);
    assert.equal(
      isUrgentTrip({ startsAt: now, state: "to-assign" }, now),
      true,
    );
  });

  it("is not once assigned, or with days to go", () => {
    assert.equal(
      isUrgentTrip({ startsAt: soon, state: "assigned" }, now),
      false,
    );
    assert.equal(
      isUrgentTrip({ startsAt: later, state: "to-assign" }, now),
      false,
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

  it("never later than an hour before the pickup, nor sooner than half an hour", () => {
    assert.equal(
      defaultRespondBy(at("2026-11-01T02:30:00Z"), now).toISOString(),
      "2026-11-01T01:30:00.000Z",
    );
    assert.equal(
      defaultRespondBy(at("2026-11-01T00:30:00Z"), now).getTime(),
      now.getTime() + HOUR / 2,
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

describe("rolesToAsk", () => {
  it("asks nothing of a trip not yet confirmed", () => {
    assert.deepEqual(
      rolesToAsk({ status: "received", parts: [], withGuide: true }),
      [],
    );
  });

  it("asks each role the trip has no part for", () => {
    assert.deepEqual(
      rolesToAsk({ status: "confirmed", parts: [], withGuide: false }),
      ["vehicle", "driver"],
    );
    assert.deepEqual(
      rolesToAsk({
        status: "confirmed",
        parts: [{ role: "vehicle" }],
        withGuide: false,
      }),
      ["driver"],
    );
    assert.deepEqual(
      rolesToAsk({
        status: "assigned",
        parts: [{ role: "vehicle" }, { role: "driver" }],
        withGuide: false,
      }),
      [],
    );
  });

  it("asks a guide only of a trip that goes with one", () => {
    assert.deepEqual(
      rolesToAsk({
        status: "assigned",
        parts: [{ role: "vehicle" }, { role: "driver" }],
        withGuide: true,
      }),
      ["guide"],
    );
  });
});

describe("partWaitingOf", () => {
  const part = {
    role: "driver",
    vehicleId: null,
    driverId: null,
    guideId: null,
    vendorAcceptedAt: null,
    driverAcceptedAt: null,
  };
  const now = at("2026-11-03T00:00:00Z");

  it("waits for the vendor first, Operation when it is ours", () => {
    assert.equal(partWaitingOf(part, false), "vendor");
    assert.equal(partWaitingOf(part, true), "ours");
  });

  it("then for the record named, then the driver's own yes", () => {
    const accepted = { ...part, vendorAcceptedAt: now };
    assert.equal(partWaitingOf(accepted, false), "name");
    assert.equal(
      partWaitingOf({ ...accepted, driverId: "d" }, false),
      "driver",
    );
    assert.equal(
      partWaitingOf(
        { ...accepted, driverId: "d", driverAcceptedAt: now },
        false,
      ),
      null,
    );
  });

  it("asks no driver's yes of a vehicle", () => {
    const vehicle = {
      ...part,
      role: "vehicle",
      vehicleId: "v",
      vendorAcceptedAt: now,
    };
    assert.equal(partWaitingOf(vehicle, false), null);
  });

  it("asks a guide named, and no one's yes but the vendor's", () => {
    const guide = { ...part, role: "guide", vendorAcceptedAt: now };
    assert.equal(partWaitingOf(guide, false), "name");
    assert.equal(partWaitingOf({ ...guide, guideId: "g" }, false), null);
  });
});

describe("untilPickup", () => {
  const now = at("2026-11-03T00:00:00Z");
  const later = (ms: number) => new Date(now.getTime() + ms);

  it("says minutes, hours up to two days, then days, soon within the day", () => {
    assert.deepEqual(untilPickup(later(40 * 60 * 1000), now), {
      label: "in 40 min",
      soon: true,
    });
    assert.deepEqual(untilPickup(later(3 * HOUR), now), {
      label: "in 3 h",
      soon: true,
    });
    assert.deepEqual(untilPickup(later(30 * HOUR), now), {
      label: "in 30 h",
      soon: false,
    });
    assert.deepEqual(untilPickup(later(47 * HOUR), now), {
      label: "in 47 h",
      soon: false,
    });
    assert.deepEqual(untilPickup(later(72 * HOUR), now), {
      label: "in 3 days",
      soon: false,
    });
  });

  it("says Started once the pickup is past", () => {
    assert.deepEqual(untilPickup(later(-60 * 1000), now), {
      label: "Started",
      soon: true,
    });
  });
});

describe("the class given: booked, or another with a reason", () => {
  const sedan = { id: "sedan", name: "Sedan" };
  const mpv = { id: "mpv", name: "MPV" };
  const rule = (over: Partial<ClassRule> = {}): ClassRule => ({
    booked: sedan,
    vehicle: null,
    driver: null,
    ...over,
  });

  it("tells another class than booked, up or down", () => {
    assert.equal(isOtherClass(sedan, mpv), true);
    assert.equal(isOtherClass(mpv, sedan), true);
    assert.equal(isOtherClass(sedan, sedan), false);
    assert.equal(isOtherClass(null, mpv), false);
  });

  it("warns, never refuses, when the driver named does not drive the vehicle", () => {
    const named = rule({
      driver: { name: "Ali bin Abu", classIds: ["sedan"] },
    });
    assert.equal(vehicleDriverWarning(named, mpv), "Ali does not drive MPV");
    assert.equal(vehicleDriverWarning(named, sedan), null);
    assert.equal(vehicleDriverWarning(rule(), mpv), null);
  });

  it("checks the driver against the vehicle named, else the class booked", () => {
    const named = rule({ vehicle: mpv });
    assert.equal(driverClassWarning(named, ["mpv"]), null);
    assert.equal(driverClassWarning(named, ["sedan"]), "Does not drive MPV");
    assert.equal(driverClassWarning(rule(), ["mpv"]), "Does not drive Sedan");
    assert.equal(driverClassWarning(rule({ booked: null }), []), null);
  });

  it("labels the option, a reason it cannot first", () => {
    const candidate = {
      id: "v1",
      name: "VLE1234 · Toyota Innova",
      trips: {
        a: { reasons: [] },
        b: { reasons: ["Road tax expired"] },
      },
    };
    assert.deepEqual(candidateOption(candidate, ["a"]), {
      value: "v1",
      label: "VLE1234 · Toyota Innova",
      disabled: false,
    });
    assert.deepEqual(candidateOption(candidate, ["a", "b"]), {
      value: "v1",
      label: "VLE1234 · Toyota Innova · Road tax expired",
      disabled: true,
    });
  });
});
