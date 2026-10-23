import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { priceTrip, withModelChoice } from "./pricing";
import {
  itemHeading,
  itemSummary,
  priceRows,
  tripDetailRows,
} from "./trip-view";

const item = (vehicleClassCategory: string, vehicleClassName = "Minibus") => ({
  tripDetails: { vehicleClassCategory, vehicleClassName },
});

describe("itemHeading", () => {
  it("names the category the booking snapshot carries", () => {
    assert.equal(itemHeading(item("car-with-driver")), "Car with driver");
    assert.equal(itemHeading(item("coach-charter")), "Coach charter");
  });

  it("falls back to the product for an unknown or missing category", () => {
    assert.equal(itemHeading(item("helicopter")), "Transportation");
    assert.equal(itemHeading({ tripDetails: null }), "Transportation");
  });
});

describe("itemSummary", () => {
  it("puts the class after the heading", () => {
    assert.equal(
      itemSummary(item("car-with-driver", "Executive sedan")),
      "Car with driver, Executive sedan",
    );
    assert.equal(itemSummary(item("coach-charter")), "Coach charter, Minibus");
  });

  it("is the heading alone when the item has no trip details", () => {
    assert.equal(itemSummary({ tripDetails: null }), "Transportation");
  });
});

describe("tripDetailRows", () => {
  it("puts the model under the vehicle, only when one is chosen", () => {
    const details = {
      vehicleClassName: "MPV VIP",
      passengers: 4,
      childSeats: 0,
      flightNumber: null,
      notes: null,
    };
    assert.deepEqual(tripDetailRows(details), [
      ["Vehicle", "MPV VIP"],
      ["Passengers", "4"],
    ]);
    assert.deepEqual(
      tripDetailRows({ ...details, vehicleModelName: "Toyota Alphard" }).slice(
        0,
        2,
      ),
      [
        ["Vehicle", "MPV VIP"],
        ["Model", "Toyota Alphard"],
      ],
    );
  });
});

describe("priceRows", () => {
  const hourly = priceTrip({
    trip: { mode: "hourly", hours: 4 },
    rates: { perKmSen: 0, hourlyRateSen: 5000 },
  });

  it("shows the cell and the extra road past a zone's edge", () => {
    const price = priceTrip({
      trip: { mode: "oneway", distanceKm: 10.65 },
      rates: { perKmSen: 250, hourlyRateSen: 5000 },
      route: { fromZone: "Airport", toZone: "Pantai Kok", rateSen: 5000 },
      zoneTrip: {
        pickup: { zone: "Airport", nearest: false, extraKm: 0 },
        dropoff: { zone: "Pantai Kok", nearest: true, extraKm: 0.776 },
        gridTripKm: 8.8,
        tripKm: 9.57,
      },
    });
    assert.deepEqual(priceRows(price), [
      ["Airport to Pantai Kok", "RM 50.00"],
      ["Extra road, 0.78 km × RM 2.50", "RM 1.94"],
    ]);
  });

  it("names a cell within one zone, and shows no extra road when the trip was not longer", () => {
    const price = priceTrip({
      trip: { mode: "oneway", distanceKm: 3 },
      rates: { perKmSen: 250, hourlyRateSen: 5000 },
      route: { fromZone: "Kuah Town", toZone: "Kuah Town", rateSen: 2500 },
    });
    assert.deepEqual(priceRows(price), [["Within Kuah Town", "RM 25.00"]]);
  });

  it("shows an old metered receipt as it was priced", () => {
    assert.deepEqual(
      priceRows({
        ...hourly,
        mode: "oneway",
        hours: null,
        distanceKm: 10,
        rates: {
          baseFareSen: 3000,
          perKmSen: 200,
          hourlyRateSen: 5000,
          minimumFareSen: 6000,
        },
        subtotalSen: 6000,
        totalSen: 6000,
      }),
      [
        ["Base fare", "RM 30.00"],
        ["RM 2.00 per km × 10.0 km", "RM 20.00"],
        ["Minimum fare applies", "RM 60.00"],
      ],
    );
  });

  it("ends with the model chosen and what choosing it added", () => {
    assert.deepEqual(
      priceRows(
        withModelChoice(hourly, "Toyota Alphard", {
          percent: 10,
          flatSen: null,
        }),
      ).at(-1),
      ["Toyota Alphard, chosen, +10%", "RM 20.00"],
    );
    assert.deepEqual(
      priceRows(
        withModelChoice(hourly, "Toyota Alphard", {
          percent: null,
          flatSen: 3000,
        }),
      ).at(-1),
      ["Toyota Alphard, chosen", "RM 30.00"],
    );
  });

  it("has no model row when any model would do", () => {
    assert.equal(priceRows(hourly).length, 1);
  });
});
