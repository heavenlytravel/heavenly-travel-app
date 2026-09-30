import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkVehicleClassFields,
  parseVehicleClassFields,
} from "./vehicle-class-input";

const FORM: Record<string, string> = {
  name: "Executive sedan",
  description: "Up to 3 passengers and 2 large bags.",
  category: "car-with-driver",
  sortOrder: "1",
  minPassengers: "1",
  maxPassengers: "3",
  luggage: "2 large bags",
  baseFare: "30",
  perKm: "1.80",
  hourlyRate: "60.00",
  minimumFare: "60",
  minLeadHours: "4",
  cancellationCutoffHours: "24",
  minHourlyHours: "3",
  isActive: "on",
};

/** The error the form would show, or null when the values pass. */
function errorOf(values: Record<string, string>) {
  const result = parseVehicleClassFields({ ...FORM, ...values });
  return result.ok ? null : result.error;
}

describe("parseVehicleClassFields", () => {
  it("reads the form with money in ringgit into sen", () => {
    const result = parseVehicleClassFields(FORM);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.value, {
      name: "Executive sedan",
      description: "Up to 3 passengers and 2 large bags.",
      category: "car-with-driver",
      sortOrder: 1,
      minPassengers: 1,
      maxPassengers: 3,
      luggage: "2 large bags",
      baseFareSen: 3000,
      perKmSen: 180,
      hourlyRateSen: 6000,
      minimumFareSen: 6000,
      minLeadHours: 4,
      cancellationCutoffHours: 24,
      minHourlyHours: 3,
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
    assert.match(errorOf({ name: " " }) ?? "", /name/);
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

  it("refuses money that is negative or not ringgit", () => {
    assert.match(errorOf({ baseFare: "-1" }) ?? "", /base fare/);
    assert.match(errorOf({ perKm: "1.234" }) ?? "", /per km/);
    assert.match(errorOf({ hourlyRate: "" }) ?? "", /per hour/);
    assert.match(errorOf({ minimumFare: "abc" }) ?? "", /minimum fare/);
    assert.equal(errorOf({ minimumFare: "0" }), null);
  });

  it("allows a minimum fare below the base fare", () => {
    assert.equal(errorOf({ baseFare: "50", minimumFare: "10" }), null);
  });

  it("keeps the hours whole and the minimum hire inside the global range", () => {
    assert.match(errorOf({ minLeadHours: "-1" }) ?? "", /Notice needed/);
    assert.match(errorOf({ cancellationCutoffHours: "1.5" }) ?? "", /Cancel/);
    assert.match(errorOf({ minHourlyHours: "2" }) ?? "", /between 3 and 12/);
    assert.match(errorOf({ minHourlyHours: "13" }) ?? "", /between 3 and 12/);
    assert.equal(
      errorOf({ minLeadHours: "0", cancellationCutoffHours: "0" }),
      null,
    );
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
