import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NO_BANK } from "./bank-input";
import {
  supplyRefusalOf,
  suppliesIt,
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
        invoicePeriod: "month",
        ...NO_BANK,
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
      ...NO_BANK,
      services: ["driver", "spa"],
      locations: [{ id: "loc2" }, { id: "loc1" }],
      invoicePeriod: "fortnight",
    });
    assert.deepEqual(fields.locationIds, ["loc1", "loc2"]);
    assert.deepEqual(fields.services, ["driver"]);
    assert.equal(fields.invoicePeriod, "month");
  });
});

describe("suppliesIt", () => {
  const vendor = (services: string[], isOurs = false) => ({ isOurs, services });

  it("lets a vendor add only what it ticked", () => {
    const coach = { kind: "vehicle", category: "coach-charter" } as const;
    assert.equal(suppliesIt(vendor(["car-with-driver"]), coach), false);
    assert.equal(suppliesIt(vendor(["coach-charter"]), coach), true);
    assert.equal(suppliesIt(vendor(["driver"]), { kind: "driver" }), true);
    assert.equal(
      suppliesIt(vendor(["coach-charter"]), { kind: "driver" }),
      true,
    );
    assert.equal(suppliesIt(vendor(["driver"]), { kind: "guide" }), false);
    assert.equal(suppliesIt(vendor(["agent"]), { kind: "driver" }), false);
  });

  it("lets ours add anything", () => {
    assert.equal(suppliesIt(vendor([], true), { kind: "guide" }), true);
  });

  it("names the services to tick", () => {
    assert.match(
      supplyRefusalOf("Lim Transport", { kind: "guide" }),
      /Lim Transport does not offer tour guides. Tick Tour guide/,
    );
  });
});

describe("checkReviewNote", () => {
  it("needs a reason", () => {
    assert.equal(checkReviewNote("").ok, false);
    assert.equal(checkReviewNote("No SSM certificate").ok, true);
  });
});
