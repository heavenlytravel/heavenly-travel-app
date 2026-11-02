import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  priceBreakdownOf,
  priceTrip,
  startingPriceSen,
  withModelChoice,
  type TripRates,
} from "./pricing";
import type { HourlyCharge } from "./hourly-input";

const rates: TripRates = { perKmSen: 250 };

/** A 4-hour package from Kuah Town, no extra hours. */
const kuah4: HourlyCharge = {
  zone: "Kuah Town",
  packageHours: 4,
  includedHours: 4,
  packageSen: 18_000,
  extraHours: 0,
  extraHourSen: 0,
  extraSen: 0,
};

const route = {
  fromZone: "Langkawi Airport",
  toZone: "Cenang",
  rateSen: 4_500,
};

describe("priceTrip", () => {
  it("refuses a one-way trip with no route: nothing is metered", () => {
    assert.throws(
      () => priceTrip({ trip: { mode: "oneway", distanceKm: 50 }, rates }),
      RangeError,
    );
  });

  it("adds the extra road past a zone's edge when the trip is longer than the grid trip", () => {
    const price = priceTrip({
      trip: { mode: "oneway", distanceKm: 10.65 },
      rates,
      route,
      zoneTrip: {
        pickup: { zone: "Langkawi Airport", nearest: false, extraKm: 0 },
        dropoff: { zone: "Cenang", nearest: true, extraKm: 0.776 },
        gridTripKm: 8.8,
        tripKm: 9.57,
      },
    });
    // 0.776 km, rounded up to 1 km.
    assert.equal(price.zoneTrip?.chargedKm, 1);
    assert.equal(price.zoneTrip?.extraSen, 250);
    assert.equal(price.zoneTrip?.perKmSen, 250);
    assert.equal(price.subtotalSen, 4_500 + 250);
    assert.equal(price.distanceKm, 10.65);
  });

  it("charges only the road past the location's free extra road", () => {
    const price = priceTrip({
      trip: { mode: "oneway", distanceKm: 20 },
      rates,
      route,
      freeExtraKm: 3,
      zoneTrip: {
        pickup: { zone: "Langkawi Airport", nearest: false, extraKm: 0 },
        dropoff: { zone: "Cenang", nearest: true, extraKm: 5 },
        gridTripKm: 10,
        tripKm: 15,
      },
    });
    assert.equal(price.zoneTrip?.freeKm, 3);
    assert.equal(price.zoneTrip?.chargedKm, 2);
    assert.equal(price.subtotalSen, 4_500 + 500);
  });

  it("adds nothing for an address reached before the zone", () => {
    const price = priceTrip({
      trip: { mode: "oneway", distanceKm: 12 },
      rates,
      route,
      zoneTrip: {
        pickup: { zone: "Langkawi Airport", nearest: false, extraKm: 0 },
        dropoff: { zone: "Cenang", nearest: true, extraKm: 0.62 },
        gridTripKm: 12.4,
        tripKm: 11.78,
      },
    });
    assert.equal(price.zoneTrip?.extraSen, 0);
    assert.equal(price.subtotalSen, 4_500);
  });

  it("prices an hourly hire as its package plus the extra hours", () => {
    const hourly: HourlyCharge = {
      zone: "Port cruise",
      packageHours: 4,
      includedHours: 5,
      packageSen: 23_000,
      extraHours: 2,
      extraHourSen: 3_500,
      extraSen: 7_000,
    };
    const price = priceTrip({
      trip: { mode: "hourly", hours: 7 },
      rates,
      hourly,
    });
    assert.equal(price.subtotalSen, 30_000);
    assert.equal(price.totalSen, 30_000);
    assert.equal(price.hours, 7);
    assert.deepEqual(price.hourly, { ...hourly, road: null });
    assert.equal(price.distanceKm, null);
    assert.deepEqual(
      priceBreakdownOf(JSON.parse(JSON.stringify(price))),
      price,
    );
  });

  it("adds a pickup's road to its nearest zone past the free km, rounded up", () => {
    const price = priceTrip({
      trip: { mode: "hourly", hours: 4 },
      rates,
      hourly: kuah4,
      hourlyRoadKm: 5.2,
      freeExtraKm: 3,
    });
    // 2.2 km past the free 3, rounded up to 3 km at RM 2.50.
    assert.deepEqual(price.hourly?.road, {
      extraKm: 5.2,
      freeKm: 3,
      chargedKm: 3,
      perKmSen: 250,
      extraSen: 750,
    });
    assert.equal(price.subtotalSen, 18_000 + 750);
    const within = priceTrip({
      trip: { mode: "hourly", hours: 4 },
      rates,
      hourly: kuah4,
      hourlyRoadKm: 2,
      freeExtraKm: 3,
    });
    assert.equal(within.hourly?.road?.extraSen, 0);
    assert.equal(within.subtotalSen, 18_000);
  });

  it("refuses an hourly hire whose hours are not the package's plus the extra", () => {
    assert.throws(
      () =>
        priceTrip({
          trip: { mode: "hourly", hours: 5 },
          rates,
          hourly: kuah4,
        }),
      RangeError,
    );
    assert.throws(
      () => priceTrip({ trip: { mode: "hourly", hours: 4 }, rates }),
      RangeError,
    );
  });

  it("prices a one-way trip on a route at the route's rate, whatever the distance", () => {
    const price = priceTrip({
      trip: { mode: "oneway", distanceKm: 80 },
      rates,
      route,
    });
    assert.equal(price.subtotalSen, 4_500);
    assert.equal(price.totalSen, 4_500);
    assert.deepEqual(price.route, route);
    assert.equal(price.zoneTrip, null);
    assert.equal(price.distanceKm, 80);
  });

  it("adds the odd-hours surcharge after the subtotal and rounds to sen", () => {
    const price = priceTrip({
      trip: { mode: "hourly", hours: 4 },
      rates,
      hourly: kuah4,
      surcharge: { percent: 50, flatSen: null },
    });
    assert.equal(price.subtotalSen, 18_000);
    assert.deepEqual(price.surcharge, { percent: 50, amountSen: 9_000 });
    assert.equal(price.totalSen, 27_000);
  });

  it("adds the weekend surcharge beside the odd-hours one, each on the subtotal", () => {
    const price = priceTrip({
      trip: { mode: "hourly", hours: 4 },
      rates,
      hourly: kuah4,
      surcharge: { percent: 50, flatSen: null },
      weekend: { charge: { percent: 20, flatSen: null }, reason: "holiday" },
    });
    assert.deepEqual(price.weekend, {
      reason: "holiday",
      percent: 20,
      amountSen: 3_600,
    });
    assert.equal(price.totalSen, 18_000 + 9_000 + 3_600);
    assert.deepEqual(
      priceBreakdownOf(JSON.parse(JSON.stringify(price))),
      price,
    );
  });

  it("adds the surcharge to a route's rate too", () => {
    const price = priceTrip({
      trip: { mode: "oneway", distanceKm: 10 },
      rates,
      route,
      surcharge: { percent: 33, flatSen: null },
    });
    assert.equal(price.totalSen, 4_500 + Math.round(4_500 * 0.33));
  });

  it("adds a flat surcharge as it is, with no percentage", () => {
    const price = priceTrip({
      trip: { mode: "oneway", distanceKm: 10 },
      rates,
      route,
      surcharge: { percent: null, flatSen: 3_000 },
    });
    assert.deepEqual(price.surcharge, { percent: null, amountSen: 3_000 });
    assert.equal(price.totalSen, 4_500 + 3_000);
    assert.deepEqual(
      priceBreakdownOf(JSON.parse(JSON.stringify(price))),
      price,
    );
  });

  it("records no surcharge at zero percent", () => {
    const price = priceTrip({
      trip: { mode: "hourly", hours: 4 },
      rates,
      hourly: kuah4,
      surcharge: { percent: 0, flatSen: null },
    });
    assert.equal(price.surcharge, null);
    assert.equal(price.totalSen, 18_000);
  });

  it("copies the rates it used into the breakdown", () => {
    const price = priceTrip({
      trip: { mode: "hourly", hours: 4 },
      rates: { ...rates, extra: true } as TripRates,
      hourly: kuah4,
    });
    assert.deepEqual(price.rates, rates);
  });

  it("rejects impossible inputs", () => {
    assert.throws(() =>
      priceTrip({ trip: { mode: "oneway", distanceKm: -1 }, rates }),
    );
    assert.throws(() =>
      priceTrip({ trip: { mode: "hourly", hours: 0 }, rates }),
    );
    assert.throws(() =>
      priceTrip({
        trip: { mode: "hourly", hours: 4 },
        rates,
        route,
        hourly: kuah4,
      }),
    );
    assert.throws(() =>
      priceTrip({
        trip: { mode: "hourly", hours: 3 },
        rates,
        surcharge: { percent: -5, flatSen: null },
      }),
    );
  });
});

describe("withModelChoice", () => {
  const surcharged = priceTrip({
    trip: { mode: "oneway", distanceKm: 10 },
    rates,
    route,
    surcharge: { percent: 50, flatSen: null },
  });

  it("works a percentage on the price before the surcharge", () => {
    const price = withModelChoice(surcharged, "Toyota Alphard", {
      percent: 20,
      flatSen: null,
    });
    assert.deepEqual(price.model, {
      name: "Toyota Alphard",
      percent: 20,
      amountSen: 900,
    });
    assert.equal(price.subtotalSen, 4_500);
    assert.equal(price.totalSen, 4_500 + 2_250 + 900);
  });

  it("adds a flat amount as it is, and replaces a model already there", () => {
    const once = withModelChoice(surcharged, "Toyota Vellfire", {
      percent: null,
      flatSen: 5_000,
    });
    const again = withModelChoice(once, "Toyota Alphard", {
      percent: null,
      flatSen: 3_000,
    });
    assert.equal(again.model?.name, "Toyota Alphard");
    assert.equal(again.totalSen, surcharged.totalSen + 3_000);
  });

  it("rejects a negative charge", () => {
    assert.throws(
      () =>
        withModelChoice(surcharged, "Toyota Alphard", {
          percent: null,
          flatSen: -1,
        }),
      RangeError,
    );
  });
});

describe("priceBreakdownOf", () => {
  it("reads back what priceTrip wrote, a model chosen with it", () => {
    const price = priceTrip({
      trip: { mode: "oneway", distanceKm: 10 },
      rates,
      route,
      surcharge: { percent: 50, flatSen: null },
    });
    assert.deepEqual(
      priceBreakdownOf(JSON.parse(JSON.stringify(price))),
      price,
    );
    const chosen = withModelChoice(price, "Toyota Alphard", {
      percent: null,
      flatSen: 3_000,
    });
    assert.deepEqual(
      priceBreakdownOf(JSON.parse(JSON.stringify(chosen))),
      chosen,
    );
  });

  it("reads a receipt from before routes and surcharges, keeping its multiplier and its metered rates", () => {
    const old = {
      mode: "hourly",
      rates: {
        ...rates,
        hourlyRateSen: 6_000,
        baseFareSen: 3_000,
        minimumFareSen: 6_000,
      },
      multiplier: 1.2,
      distanceKm: null,
      hours: 3,
      subtotalSen: 18_000,
      totalSen: 21_600,
    };
    assert.deepEqual(priceBreakdownOf(old), {
      ...old,
      route: null,
      hourly: null,
      zoneTrip: null,
      surcharge: null,
      weekend: null,
      model: null,
    });
  });

  it("is null for anything that is not a receipt", () => {
    assert.equal(priceBreakdownOf(null), null);
    assert.equal(priceBreakdownOf({ mode: "oneway" }), null);
  });
});

describe("startingPriceSen", () => {
  it("is the cheaper of the grid's cheapest cell and the cheapest package", () => {
    assert.equal(startingPriceSen(4_500, 14_000), 4_500);
    assert.equal(startingPriceSen(30_000, 14_000), 14_000);
  });

  it("is whichever is priced, or null when neither is", () => {
    assert.equal(startingPriceSen(null, 14_000), 14_000);
    assert.equal(startingPriceSen(4_500, null), 4_500);
    assert.equal(startingPriceSen(null, null), null);
  });
});
