import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { itemHeading, itemSummary } from "./trip-view";

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
