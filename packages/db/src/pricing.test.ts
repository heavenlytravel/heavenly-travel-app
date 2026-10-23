import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  priceBreakdownOf,
  priceTrip,
  startingPriceSen,
  withModelChoice,
  type TripRates,
} from "./pricing";

const rates: TripRates = {
  perKmSen: 250,
  hourlyRateSen: 6_000,
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
    assert.equal(price.zoneTrip?.extraSen, 194);
    assert.equal(price.zoneTrip?.perKmSen, 250);
    assert.equal(price.subtotalSen, 4_500 + 194);
    assert.equal(price.distanceKm, 10.65);
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

  it("prices an hourly hire as rate times hours, with no minimum fare", () => {
    const price = priceTrip({ trip: { mode: "hourly", hours: 4 }, rates });
    assert.equal(price.totalSen, 24_000);
    assert.equal(price.hours, 4);
    assert.equal(price.distanceKm, null);
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
      trip: { mode: "hourly", hours: 3 },
      rates,
      surcharge: { percent: 50, flatSen: null },
    });
    assert.equal(price.subtotalSen, 18_000);
    assert.deepEqual(price.surcharge, { percent: 50, amountSen: 9_000 });
    assert.equal(price.totalSen, 27_000);
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
      trip: { mode: "hourly", hours: 3 },
      rates,
      surcharge: { percent: 0, flatSen: null },
    });
    assert.equal(price.surcharge, null);
    assert.equal(price.totalSen, 18_000);
  });

  it("copies the rates it used into the breakdown", () => {
    const price = priceTrip({
      trip: { mode: "hourly", hours: 3 },
      rates: { ...rates, extra: true } as TripRates,
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
      priceTrip({ trip: { mode: "hourly", hours: 3 }, rates, route }),
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
      rates: { ...rates, baseFareSen: 3_000, minimumFareSen: 6_000 },
      multiplier: 1.2,
      distanceKm: null,
      hours: 3,
      subtotalSen: 18_000,
      totalSen: 21_600,
    };
    assert.deepEqual(priceBreakdownOf(old), {
      ...old,
      route: null,
      zoneTrip: null,
      surcharge: null,
      model: null,
    });
  });

  it("is null for anything that is not a receipt", () => {
    assert.equal(priceBreakdownOf(null), null);
    assert.equal(priceBreakdownOf({ mode: "oneway" }), null);
  });
});

describe("startingPriceSen", () => {
  it("is the cheapest cell on the grid when the shortest hire costs more", () => {
    assert.equal(
      startingPriceSen({ ...rates, minHourlyHours: 4 }, 4_500),
      4_500,
    );
  });

  it("is the shortest hourly hire when that costs less, or when the grid prices nothing", () => {
    assert.equal(
      startingPriceSen({ ...rates, minHourlyHours: 4 }, 30_000),
      24_000,
    );
    assert.equal(
      startingPriceSen({ ...rates, minHourlyHours: 4 }, null),
      24_000,
    );
  });
});
