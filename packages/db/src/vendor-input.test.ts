import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkReviewNote,
  parseVendorFields,
  vendorFieldsOf,
} from "./vendor-input";

const FORM = {
  name: " Pulau Coach Sdn Bhd ",
  kind: "company",
  registrationNo: " 202301012345 ",
  contactName: "Aminah",
  contactPhone: "012-345 6789",
  contactEmail: " Ops@PulauCoach.my ",
  address: "Kuah, Langkawi",
};

function errorOf(
  values: Record<string, string>,
  services = ["coach-charter"],
  locations = ["loc1"],
) {
  const result = parseVendorFields({ ...FORM, ...values }, services, locations);
  return result.ok ? null : result.error;
}

describe("parseVendorFields", () => {
  it("reads the form: the email lowercase, the services in order, the locations once each and sorted", () => {
    const result = parseVendorFields(
      FORM,
      ["coach-charter", "car-with-driver", "spa"],
      ["loc2", "loc1", "loc2", ""],
    );
    assert.deepEqual(result, {
      ok: true,
      value: {
        name: "Pulau Coach Sdn Bhd",
        kind: "company",
        registrationNo: "202301012345",
        contactName: "Aminah",
        contactPhone: "0123456789",
        contactEmail: "ops@pulaucoach.my",
        address: "Kuah, Langkawi",
        services: ["car-with-driver", "coach-charter"],
        locationIds: ["loc1", "loc2"],
      },
    });
  });

  it("needs a name, a kind, a contact who can be called and written to, a service and a location", () => {
    assert.match(errorOf({ name: "" }) ?? "", /name/);
    assert.match(errorOf({ kind: "partner" }) ?? "", /company or individual/);
    assert.match(errorOf({ contactName: "" }) ?? "", /speaks to/);
    assert.match(errorOf({ contactPhone: "12" }) ?? "", /phone/);
    assert.match(errorOf({ contactEmail: "ops@" }) ?? "", /email/);
    assert.match(errorOf({}, []) ?? "", /offers/);
    assert.match(errorOf({}, ["driver"], []) ?? "", /location/);
  });
});

describe("vendorFieldsOf", () => {
  it("reads a stored vendor's locations by id, sorted, and drops services it does not know", () => {
    const fields = vendorFieldsOf({
      ...FORM,
      services: ["driver", "spa"],
      locations: [{ id: "loc2" }, { id: "loc1" }],
    });
    assert.deepEqual(fields.locationIds, ["loc1", "loc2"]);
    assert.deepEqual(fields.services, ["driver"]);
  });
});

describe("checkReviewNote", () => {
  it("needs a reason", () => {
    assert.equal(checkReviewNote("").ok, false);
    assert.equal(checkReviewNote("No SSM certificate").ok, true);
  });
});
