import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { driverFieldsOf, parseDriverFields } from "./driver-input";

const FORM: Record<string, string> = {
  name: " Ali bin Abu ",
  phone: "+60 12-345 6789",
  locationId: "loc1",
  isActive: "on",
  notes: "",
  licenceExpiresOn: "2028-01-31",
  psvExpiresOn: "",
};

function errorOf(values: Record<string, string>, classes = ["vc1"]) {
  const result = parseDriverFields({ ...FORM, ...values }, classes);
  return result.ok ? null : result.error;
}

describe("parseDriverFields", () => {
  it("reads the form: the phone as kept, the classes once each and sorted", () => {
    const result = parseDriverFields(FORM, ["vc2", "vc1", "vc2", ""]);
    assert.deepEqual(result, {
      ok: true,
      value: {
        name: "Ali bin Abu",
        phone: "+60123456789",
        locationId: "loc1",
        vehicleClassIds: ["vc1", "vc2"],
        isActive: true,
        notes: "",
        licenceExpiresOn: "2028-01-31",
        psvExpiresOn: null,
      },
    });
  });

  it("needs a name, a phone that dials, a location and a class", () => {
    assert.match(errorOf({ name: "" }) ?? "", /name/);
    assert.match(errorOf({ phone: "12" }) ?? "", /phone/);
    assert.match(errorOf({ locationId: "" }) ?? "", /based/);
    assert.match(errorOf({}, []) ?? "", /class/);
  });

  it("refuses a licence date that is not a day", () => {
    assert.match(
      errorOf({ psvExpiresOn: "31/01/2028" }) ?? "",
      /psv licence expiry/,
    );
  });
});

describe("driverFieldsOf", () => {
  it("reads a stored driver's classes by id, sorted, and its dates as days", () => {
    const fields = driverFieldsOf({
      name: "Ali",
      phone: "+60123456789",
      locationId: "loc1",
      vehicleClasses: [{ id: "vc2" }, { id: "vc1" }],
      isActive: true,
      notes: "",
      licenceExpiresOn: new Date("2028-01-31T00:00:00Z"),
      psvExpiresOn: null,
    });
    assert.deepEqual(fields.vehicleClassIds, ["vc1", "vc2"]);
    assert.equal(fields.licenceExpiresOn, "2028-01-31");
    assert.equal(fields.psvExpiresOn, null);
  });
});
