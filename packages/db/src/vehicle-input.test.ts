import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizePlate,
  parseVehicleFields,
  vehicleDocumentsDue,
  vehicleFieldsOf,
} from "./vehicle-input";

const NOW = new Date("2026-10-19T04:00:00Z");

const PHOTO = "https://abc123.ufs.sh/f/key-1";

const FORM: Record<string, string> = {
  plate: "vle 1234",
  vehicleClassId: "vc1",
  brand: " Toyota ",
  model: "Alphard  Executive",
  locationId: "loc1",
  colour: "Black",
  year: "2023",
  isActive: "on",
  notes: " Leather seats ",
  roadTaxExpiresOn: "2027-03-12",
  insuranceExpiresOn: "2027-03-12",
  inspectionExpiresOn: "",
  permitExpiresOn: "2026-12-31",
  photos: JSON.stringify([{ url: PHOTO, caption: " Front " }]),
};

function errorOf(values: Record<string, string>) {
  const result = parseVehicleFields({ ...FORM, ...values }, NOW);
  return result.ok ? null : result.error;
}

describe("normalizePlate", () => {
  it("keeps capitals and digits only", () => {
    assert.equal(normalizePlate(" vle 1234 "), "VLE1234");
    assert.equal(normalizePlate("W-XY 88 a"), "WXY88A");
  });
});

describe("parseVehicleFields", () => {
  it("reads the form, its dates as days and its photos in order", () => {
    const result = parseVehicleFields(FORM, NOW);
    assert.deepEqual(result, {
      ok: true,
      value: {
        plate: "VLE1234",
        vehicleClassId: "vc1",
        brand: "Toyota",
        model: "Alphard Executive",
        locationId: "loc1",
        colour: "Black",
        year: 2023,
        isActive: true,
        notes: "Leather seats",
        roadTaxExpiresOn: "2027-03-12",
        insuranceExpiresOn: "2027-03-12",
        inspectionExpiresOn: null,
        permitExpiresOn: "2026-12-31",
        photos: [{ url: PHOTO, caption: "Front" }],
      },
    });
  });

  it("refuses photos that are not a list of uploads", () => {
    assert.match(errorOf({ photos: "{not json" }) ?? "", /photos/);
    assert.match(
      errorOf({
        photos: JSON.stringify([{ url: "https://example.com/a.jpg" }]),
      }) ?? "",
      /photo/,
    );
  });

  it("takes an empty year as none", () => {
    const result = parseVehicleFields({ ...FORM, year: "" }, NOW);
    assert.equal(result.ok && result.value.year, null);
  });

  it("needs a plate, a class, a brand, a model, a location and a colour", () => {
    assert.match(errorOf({ plate: " - " }) ?? "", /plate/);
    assert.match(errorOf({ vehicleClassId: "" }) ?? "", /class/);
    assert.match(errorOf({ brand: " " }) ?? "", /brand/);
    assert.match(errorOf({ model: "" }) ?? "", /model/);
    assert.match(errorOf({ locationId: "" }) ?? "", /based/);
    assert.match(errorOf({ colour: "" }) ?? "", /colour/);
  });

  it("keeps the year between 1980 and next year", () => {
    assert.match(errorOf({ year: "1979" }) ?? "", /1980 to 2027/);
    assert.match(errorOf({ year: "2028" }) ?? "", /1980 to 2027/);
    assert.equal(errorOf({ year: "2027" }), null);
  });

  it("refuses a date that is not a day", () => {
    assert.match(
      errorOf({ insuranceExpiresOn: "2027-02-30" }) ?? "",
      /insurance expiry/,
    );
  });
});

describe("a stored vehicle", () => {
  const stored = {
    plate: "VLE1234",
    vehicleModel: { vehicleClassId: "vc1", brand: "Toyota", name: "Alphard" },
    locationId: "loc1",
    colour: "Black",
    year: 2023,
    isActive: true,
    notes: "",
    roadTaxExpiresOn: new Date("2026-11-01T00:00:00Z"),
    insuranceExpiresOn: new Date("2026-10-10T00:00:00Z"),
    inspectionExpiresOn: null,
    permitExpiresOn: new Date("2027-06-01T00:00:00Z"),
  };

  it("reads its model by class, brand and name, and its dates as days", () => {
    const fields = vehicleFieldsOf(stored);
    assert.deepEqual(
      [fields.vehicleClassId, fields.brand, fields.model],
      ["vc1", "Toyota", "Alphard"],
    );
    assert.equal(fields.roadTaxExpiresOn, "2026-11-01");
    assert.equal(fields.inspectionExpiresOn, null);
  });

  it("names its documents due, soonest first", () => {
    assert.deepEqual(
      vehicleDocumentsDue(stored, NOW).map((d) => [d.label, d.state]),
      [
        ["Insurance", "expired"],
        ["Road tax", "due"],
      ],
    );
  });
});
