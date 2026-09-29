import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { itemHeading } from "./trip-view";

const item = (vehicleClassCategory: string) => ({
  tripDetails: { vehicleClassCategory },
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
