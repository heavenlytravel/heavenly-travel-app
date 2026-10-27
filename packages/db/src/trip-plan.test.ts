import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickupInstant } from "./booking-rules";
import {
  bookingModelChoices,
  classFit,
  classFitNote,
  flightOfTrip,
  isAirportPlace,
  tripClashes,
  type TripClassPrice,
} from "./trip-plan";

const at = (date: string, time: string) => pickupInstant(date, time)!;
const oneway = (date: string, time: string) => ({
  startsAt: at(date, time),
  hours: null,
});
const hire = (date: string, time: string, hours: number) => ({
  startsAt: at(date, time),
  hours,
});

describe("tripClashes", () => {
  it("allows one-way trips close together: a drive has no length here", () => {
    assert.deepEqual(
      tripClashes([
        oneway("2026-11-03", "10:30"),
        oneway("2026-11-03", "11:00"),
      ]),
      [null, null],
    );
  });

  it("refuses two trips at the same moment, marking the later one in the list", () => {
    assert.deepEqual(
      tripClashes([
        oneway("2026-11-03", "11:00"),
        oneway("2026-11-03", "11:00"),
      ]),
      [null, { with: 0, kind: "same-time" }],
    );
  });

  it("refuses a trip that starts during an hourly hire, in any list order", () => {
    assert.deepEqual(
      tripClashes([
        oneway("2026-11-03", "12:00"),
        hire("2026-11-03", "09:00", 8),
      ]),
      [{ with: 1, kind: "during-hire" }, null],
    );
  });

  it("allows a trip at the moment a hire ends", () => {
    assert.deepEqual(
      tripClashes([
        hire("2026-11-03", "09:00", 8),
        oneway("2026-11-03", "17:00"),
      ]),
      [null, null],
    );
  });

  it("follows a hire past midnight into the next day", () => {
    assert.deepEqual(
      tripClashes([
        hire("2026-11-03", "20:00", 6),
        oneway("2026-11-04", "01:00"),
        oneway("2026-11-04", "02:00"),
      ]),
      [null, { with: 0, kind: "during-hire" }, null],
    );
  });

  it("calls a hire and a one-way trip at the same moment the same time", () => {
    assert.deepEqual(
      tripClashes([
        hire("2026-11-03", "09:00", 4),
        oneway("2026-11-03", "09:00"),
      ]),
      [null, { with: 0, kind: "same-time" }],
    );
  });
});

const ok = { ok: true } as const;
const price = (
  id: string,
  totalSen: number | null,
  availability: TripClassPrice["availability"] = ok,
): TripClassPrice => ({ id, totalSen, availability });
const mpv = { id: "mpv", maxPassengers: 6 };

describe("classFit", () => {
  it("adds up the class's price on every trip", () => {
    assert.deepEqual(
      classFit(mpv, [[price("mpv", 12000)], [price("mpv", 30000)]], 4),
      { ok: true, totalSen: 42000 },
    );
  });

  it("refuses a group the class does not seat before anything else", () => {
    assert.deepEqual(classFit(mpv, [[]], 7), { ok: false, reason: "seats" });
  });

  it("names the trip whose location does not sell the class", () => {
    assert.deepEqual(
      classFit(mpv, [[price("mpv", 12000)], [price("sedan", 8000)]], 2),
      { ok: false, reason: "not-offered", trip: 1 },
    );
  });

  it("names the trip whose rules refuse it, with the rule", () => {
    const tooSoon = {
      ok: false,
      reason: "too-soon",
      minLeadHours: 24,
    } as const;
    assert.deepEqual(classFit(mpv, [[price("mpv", 12000, tooSoon)]], 2), {
      ok: false,
      reason: "unavailable",
      trip: 0,
      availability: tooSoon,
    });
  });

  it("treats a trip with no price on the grid as not on the route", () => {
    assert.deepEqual(classFit(mpv, [[price("mpv", null)]], 2), {
      ok: false,
      reason: "unavailable",
      trip: 0,
      availability: { ok: false, reason: "not-on-route" },
    });
  });
});

describe("classFitNote", () => {
  const name = (trip: number) => `trip ${trip + 1}`;
  it("says the rule and the trip", () => {
    assert.equal(
      classFitNote(
        {
          ok: false,
          reason: "unavailable",
          trip: 0,
          availability: { ok: false, reason: "too-soon", minLeadHours: 24 },
        },
        name,
      ),
      "which needs 24 hours notice for trip 1",
    );
    assert.equal(
      classFitNote(
        {
          ok: false,
          reason: "unavailable",
          trip: 1,
          availability: {
            ok: false,
            reason: "too-few-hours",
            minHourlyHours: 4,
          },
        },
        name,
      ),
      "which needs at least 4 hours for trip 2",
    );
    assert.equal(
      classFitNote({ ok: false, reason: "not-offered", trip: 2 }, name),
      "which is not offered for trip 3",
    );
  });
});

describe("bookingModelChoices", () => {
  const models = [
    { id: "alphard", name: "Alphard" },
    { id: "vellfire", name: "Vellfire" },
  ];

  it("offers the models every trip can choose, with the charges added up", () => {
    assert.deepEqual(
      bookingModelChoices(models, [
        { modelChoiceSen: 2000, modelIds: ["alphard", "vellfire"] },
        { modelChoiceSen: 5000, modelIds: ["alphard"] },
      ]),
      [{ model: models[0], chargeSen: 7000 }],
    );
  });

  it("offers none when one trip's location does not let the customer choose", () => {
    assert.deepEqual(
      bookingModelChoices(models, [
        { modelChoiceSen: 2000, modelIds: ["alphard", "vellfire"] },
        { modelChoiceSen: null, modelIds: ["alphard", "vellfire"] },
      ]),
      [],
    );
  });

  it("offers none without trips", () => {
    assert.deepEqual(bookingModelChoices(models, []), []);
  });
});

describe("flights", () => {
  const place = (label: string, address = label) => ({ label, address });
  const flights = { arriving: "MH 1234", departing: "AK 6305" };

  it("knows an airport by its name or its address", () => {
    assert.equal(isAirportPlace(place("Langkawi International Airport")), true);
    assert.equal(isAirportPlace(place("KLIA Terminal 1")), true);
    assert.equal(isAirportPlace(place("klia2")), true);
    assert.equal(
      isAirportPlace(
        place("Gate 3", "Lapangan Terbang Antarabangsa Pulau Pinang"),
      ),
      true,
    );
    assert.equal(isAirportPlace(place("Pelangi Beach Resort")), false);
    assert.equal(isAirportPlace(place("Terminal Bersepadu Selatan")), false);
  });

  it("gives a pick-up at an airport the arriving flight, a drop-off the departing one", () => {
    const airport = place("Langkawi International Airport");
    const hotel = place("Pelangi Beach Resort");
    assert.equal(
      flightOfTrip({ pickup: airport, dropoff: hotel }, flights),
      "MH 1234",
    );
    assert.equal(
      flightOfTrip({ pickup: hotel, dropoff: airport }, flights),
      "AK 6305",
    );
    assert.equal(flightOfTrip({ pickup: hotel, dropoff: null }, flights), null);
  });
});
