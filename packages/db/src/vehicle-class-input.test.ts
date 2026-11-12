import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkVehicleClassFields,
  classNameOf,
  classSlugOf,
  parseVehicleClassFields,
  seatsLabel,
} from "./vehicle-class-input";

const FORM: Record<string, string> = {
  type: "Sedan",
  tier: " Executive ",
  description: "Up to 3 passengers and 2 large bags.",
  category: "car-with-driver",
  minPassengers: "1",
  maxPassengers: "3",
  luggage: "2 large bags",
  imageUrls: '["https://abc123.ufs.sh/f/key-1"]',
  isActive: "on",
};

/** The error the form would show, or null when the values pass. */
function errorOf(values: Record<string, string>) {
  const result = parseVehicleClassFields({ ...FORM, ...values });
  return result.ok ? null : result.error;
}

describe("classNameOf and classSlugOf", () => {
  it("puts the tier first, and the type alone without one", () => {
    assert.equal(
      classNameOf({ type: "Sedan", tier: "Deluxe" }),
      "Deluxe - Sedan",
    );
    assert.equal(classNameOf({ type: " Truck ", tier: "" }), "Truck");
    assert.equal(
      classSlugOf({ type: "Coach", tier: "44 Seater  Standard" }),
      "44-seater-standard-coach",
    );
  });
});

describe("parseVehicleClassFields", () => {
  it("reads the form", () => {
    const result = parseVehicleClassFields(FORM);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.value, {
      type: "Sedan",
      tier: "Executive",
      description: "Up to 3 passengers and 2 large bags.",
      category: "car-with-driver",
      minPassengers: 1,
      maxPassengers: 3,
      luggage: "2 large bags",
      imageUrls: ["https://abc123.ufs.sh/f/key-1"],
      isActive: true,
    });
  });

  it("reads an unticked checkbox as off", () => {
    const values = { ...FORM };
    delete values.isActive;
    const result = parseVehicleClassFields(values);
    assert.equal(result.ok && result.value.isActive, false);
  });

  it("needs the text fields and a category", () => {
    assert.match(errorOf({ type: " " }) ?? "", /type/);
    assert.equal(errorOf({ tier: "" }), null);
    assert.match(errorOf({ type: "--" }) ?? "", /letter or digit/);
    assert.match(errorOf({ tier: "x".repeat(41) }) ?? "", /at most 40/);
    assert.match(errorOf({ description: "" }) ?? "", /description/);
    assert.match(errorOf({ luggage: "" }) ?? "", /luggage/);
    assert.match(errorOf({ category: "boat" }) ?? "", /category/);
  });

  it("keeps seats whole, from 1, and to at least from", () => {
    assert.match(errorOf({ minPassengers: "0" }) ?? "", /Seats/);
    assert.match(errorOf({ maxPassengers: "2.5" }) ?? "", /Seats/);
    assert.match(
      errorOf({ minPassengers: "5", maxPassengers: "3" }) ?? "",
      /at least/,
    );
    assert.equal(errorOf({ minPassengers: "3", maxPassengers: "3" }), null);
  });

  it("reads no pictures as none and takes pictures on UploadThing only", () => {
    const result = parseVehicleClassFields({ ...FORM, imageUrls: "" });
    assert.deepEqual(result.ok && result.value.imageUrls, []);
    assert.match(
      errorOf({ imageUrls: '["https://example.com/sedan.jpg"]' }) ?? "",
      /picture/,
    );
    assert.match(errorOf({ imageUrls: "not json" }) ?? "", /picture/);
    const many = JSON.stringify(
      Array.from({ length: 13 }, (_, i) => `https://abc123.ufs.sh/f/key-${i}`),
    );
    assert.match(errorOf({ imageUrls: many }) ?? "", /at most 12/);
  });
});

describe("checkVehicleClassFields", () => {
  it("checks only the fields it is given", () => {
    assert.deepEqual(checkVehicleClassFields({}), { ok: true });
    assert.deepEqual(checkVehicleClassFields({ isActive: false }), {
      ok: true,
    });
    assert.equal(checkVehicleClassFields({ maxPassengers: 0 }).ok, false);
  });
});

describe("seatsLabel", () => {
  it("names the most a class seats, and the least when it is more than one", () => {
    assert.equal(
      seatsLabel({ minPassengers: 1, maxPassengers: 6 }),
      "Up to 6 passengers",
    );
    assert.equal(
      seatsLabel({ minPassengers: 15, maxPassengers: 44 }),
      "15 to 44 passengers",
    );
  });
});
