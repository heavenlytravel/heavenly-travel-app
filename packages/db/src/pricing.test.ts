import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { priceTrip, type TripRates } from "./pricing";

const rates: TripRates = {
  baseFareSen: 3_000,
  perKmSen: 180,
  hourlyRateSen: 6_000,
  minimumFareSen: 6_000,
};

describe("priceTrip", () => {
  it("prices a one-way trip as base fare plus distance", () => {
    const price = priceTrip({
      trip: { mode: "oneway", distanceKm: 50 },
      rates,
      multiplier: 1,
    });
    assert.equal(price.subtotalSen, 3_000 + 180 * 50);
    assert.equal(price.totalSen, 12_000);
    assert.equal(price.distanceKm, 50);
    assert.equal(price.hours, null);
  });

  it("applies the minimum fare to short one-way trips", () => {
    const price = priceTrip({
      trip: { mode: "oneway", distanceKm: 2 },
      rates,
      multiplier: 1,
    });
    assert.equal(price.totalSen, rates.minimumFareSen);
  });

  it("rounds fractional kilometres to whole sen before the minimum", () => {
    const price = priceTrip({
      trip: { mode: "oneway", distanceKm: 33.333 },
      rates,
      multiplier: 1,
    });
    assert.equal(price.subtotalSen, 3_000 + Math.round(180 * 33.333));
    assert.ok(Number.isInteger(price.totalSen));
  });

  it("prices an hourly hire as rate times hours, with no minimum fare", () => {
    const price = priceTrip({
      trip: { mode: "hourly", hours: 4 },
      rates,
      multiplier: 1,
    });
    assert.equal(price.totalSen, 24_000);
    assert.equal(price.hours, 4);
    assert.equal(price.distanceKm, null);
  });

  it("applies the zone multiplier after the subtotal and rounds to sen", () => {
    const price = priceTrip({
      trip: { mode: "hourly", hours: 3 },
      rates,
      multiplier: 1.15,
    });
    assert.equal(price.subtotalSen, 18_000);
    assert.equal(price.totalSen, 20_700);
  });

  it("copies the rates it used into the breakdown", () => {
    const price = priceTrip({
      trip: { mode: "hourly", hours: 3 },
      rates: { ...rates, extra: true } as TripRates,
      multiplier: 1,
    });
    assert.deepEqual(price.rates, rates);
  });

  it("rejects impossible inputs", () => {
    assert.throws(() =>
      priceTrip({
        trip: { mode: "oneway", distanceKm: -1 },
        rates,
        multiplier: 1,
      }),
    );
    assert.throws(() =>
      priceTrip({
        trip: { mode: "hourly", hours: 0 },
        rates,
        multiplier: 1,
      }),
    );
    assert.throws(() =>
      priceTrip({
        trip: { mode: "hourly", hours: 3 },
        rates,
        multiplier: 0,
      }),
    );
  });
});
