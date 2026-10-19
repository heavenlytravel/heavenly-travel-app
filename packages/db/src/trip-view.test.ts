import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  itemHeading,
  itemSummary,
  modelPreference,
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

describe("modelPreference", () => {
  it("reads the model preferred and whether a similar one will do", () => {
    assert.equal(
      modelPreference({
        vehicleModelName: "Toyota Alphard",
        similarModelOk: true,
      }),
      "Toyota Alphard, or a similar vehicle",
    );
    assert.equal(
      modelPreference({
        vehicleModelName: "Toyota Alphard",
        similarModelOk: false,
      }),
      "Toyota Alphard only: we ask before sending another",
    );
    assert.equal(modelPreference({ vehicleModelName: null }), null);
  });
});

describe("tripDetailRows", () => {
  it("puts the model under the vehicle, only when one is preferred", () => {
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
        ["Model", "Toyota Alphard, or a similar vehicle"],
      ],
    );
  });
});
