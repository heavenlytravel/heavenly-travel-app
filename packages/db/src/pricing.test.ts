import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  priceBreakdownOf,
  priceTrip,
  startingPriceSen,
  type TripRates,
} from "./pricing";

const rates: TripRates = {
  baseFareSen: 3_000,
  perKmSen: 180,
  hourlyRateSen: 6_000,
  minimumFareSen: 6_000,
};

const route = {
  fromZone: "Langkawi Airport",
  toZone: "Cenang",
  rateSen: 4_500,
};

describe("priceTrip", () => {
  it("prices a one-way trip as base fare plus distance", () => {
    const price = priceTrip({
      trip: { mode: "oneway", distanceKm: 50 },
      rates,
    });
    assert.equal(price.subtotalSen, 3_000 + 180 * 50);
    assert.equal(price.totalSen, 12_000);
    assert.equal(price.distanceKm, 50);
    assert.equal(price.hours, null);
    assert.equal(price.route, null);
    assert.equal(price.surcharge, null);
  });

  it("applies the minimum fare to short one-way trips", () => {
    const price = priceTrip({ trip: { mode: "oneway", distanceKm: 2 }, rates });
    assert.equal(price.totalSen, rates.minimumFareSen);
  });

  it("rounds fractional kilometres to whole sen before the minimum", () => {
    const price = priceTrip({
      trip: { mode: "oneway", distanceKm: 33.333 },
      rates,
    });
    assert.equal(price.subtotalSen, 3_000 + Math.round(180 * 33.333));
    assert.ok(Number.isInteger(price.totalSen));
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
    assert.equal(price.distanceKm, 80);
  });

  it("adds the odd-hours surcharge after the subtotal and rounds to sen", () => {
    const price = priceTrip({
      trip: { mode: "hourly", hours: 3 },
      rates,
      surchargePercent: 50,
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
      surchargePercent: 33,
    });
    assert.equal(price.totalSen, 4_500 + Math.round(4_500 * 0.33));
  });

  it("records no surcharge at zero percent", () => {
    const price = priceTrip({
      trip: { mode: "hourly", hours: 3 },
      rates,
      surchargePercent: 0,
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
        surchargePercent: -5,
      }),
    );
  });
});

describe("priceBreakdownOf", () => {
  it("reads back what priceTrip wrote", () => {
    const price = priceTrip({
      trip: { mode: "oneway", distanceKm: 10 },
      rates,
      route,
      surchargePercent: 50,
    });
    assert.deepEqual(
      priceBreakdownOf(JSON.parse(JSON.stringify(price))),
      price,
    );
  });

  it("reads a receipt from before routes and surcharges, keeping its multiplier", () => {
    const old = {
      mode: "hourly",
      rates,
      multiplier: 1.2,
      distanceKm: null,
      hours: 3,
      subtotalSen: 18_000,
      totalSen: 21_600,
    };
    assert.deepEqual(priceBreakdownOf(old), {
      ...old,
      route: null,
      surcharge: null,
    });
  });

  it("is null for anything that is not a receipt", () => {
    assert.equal(priceBreakdownOf(null), null);
    assert.equal(priceBreakdownOf({ mode: "oneway" }), null);
  });
});

describe("startingPriceSen", () => {
  it("is the minimum one-way fare when the shortest hire costs more", () => {
    assert.equal(startingPriceSen({ ...rates, minHourlyHours: 4 }), 6_000);
  });

  it("is the shortest hourly hire when that costs less", () => {
    assert.equal(
      startingPriceSen({ ...rates, minimumFareSen: 30_000, minHourlyHours: 4 }),
      24_000,
    );
  });
});
