import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NO_BANK } from "./bank-input";
import {
  supplyRefusalOf,
  suppliesIt,
  checkReviewNote,
  parseVendorFields,
  serviceChangeRefusalOf,
  vendorAddsOf,
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
  services = ["vehicle-driver"],
  locations = ["loc1"],
) {
  const result = parseVendorFields({ ...FORM, ...values }, services, locations);
  return result.ok ? null : result.error;
}

describe("parseVendorFields", () => {
  it("reads the form: the email lowercase, the one service, the locations once each and sorted", () => {
    const result = parseVendorFields(
      FORM,
      ["vehicle", "spa"],
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
        services: ["vehicle"],
        locationIds: ["loc1", "loc2"],
        ...NO_BANK,
      },
    });
  });

  it("drops a service it does not know, an old one or agent included", () => {
    const result = parseVendorFields(
      FORM,
      ["agent", "coach-charter", "tour-guide"],
      ["loc1"],
    );
    assert.ok(result.ok);
    assert.deepEqual(result.value.services, ["tour-guide"]);
  });

  it("takes exactly one service", () => {
    assert.match(errorOf({}, ["vehicle", "driver"]) ?? "", /what it offers/);
  });

  it("needs a name, a kind, a contact who can be called and written to, a service and a location", () => {
    assert.match(errorOf({ name: "" }) ?? "", /name/);
    assert.match(errorOf({ kind: "partner" }) ?? "", /company or individual/);
    assert.match(errorOf({ contactName: "" }) ?? "", /speaks to/);
    assert.match(errorOf({ contactPhone: "12" }) ?? "", /phone/);
    assert.match(errorOf({ contactEmail: "ops@" }) ?? "", /email/);
    assert.match(errorOf({}, []) ?? "", /what it offers/);
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
    });
    assert.deepEqual(fields.locationIds, ["loc1", "loc2"]);
    assert.deepEqual(fields.services, ["driver"]);
  });
});

describe("suppliesIt", () => {
  const vendor = (services: string[], isOurs = false) => ({ isOurs, services });

  it("supplies vehicles with vehicle only or vehicle and driver, of any class", () => {
    assert.equal(suppliesIt(vendor(["vehicle"]), "vehicle"), true);
    assert.equal(suppliesIt(vendor(["vehicle-driver"]), "vehicle"), true);
    assert.equal(suppliesIt(vendor(["driver"]), "vehicle"), false);
    assert.equal(suppliesIt(vendor(["tour-guide"]), "vehicle"), false);
  });

  it("supplies drivers with driver only or vehicle and driver", () => {
    assert.equal(suppliesIt(vendor(["driver"]), "driver"), true);
    assert.equal(suppliesIt(vendor(["vehicle-driver"]), "driver"), true);
    assert.equal(suppliesIt(vendor(["vehicle"]), "driver"), false);
  });

  it("supplies guides with tour guide alone, and nothing with the rest", () => {
    assert.equal(suppliesIt(vendor(["tour-guide"]), "guide"), true);
    assert.equal(suppliesIt(vendor(["vehicle-driver"]), "guide"), false);
    for (const supply of ["vehicle", "driver", "guide"] as const) {
      assert.equal(suppliesIt(vendor(["attraction"]), supply), false);
      assert.equal(suppliesIt(vendor(["accommodation"]), supply), false);
      assert.equal(suppliesIt(vendor(["car-with-driver"]), supply), false);
    }
  });

  it("adds what it offers", () => {
    assert.deepEqual(vendorAddsOf(vendor(["vehicle"])), {
      vehicles: true,
      drivers: false,
      guides: false,
    });
  });

  it("lets ours add anything", () => {
    assert.equal(suppliesIt(vendor([], true), "guide"), true);
  });

  it("names what it would have to offer", () => {
    assert.match(
      supplyRefusalOf("Lim Transport", "driver"),
      /Lim Transport does not offer drivers. Change what it offers to Driver only or Vehicle and driver/,
    );
  });
});

describe("checkReviewNote", () => {
  it("needs a reason", () => {
    assert.equal(checkReviewNote("").ok, false);
    assert.equal(checkReviewNote("No SSM certificate").ok, true);
  });
});

describe("serviceChangeRefusalOf", () => {
  const theirs = { isOurs: false };
  const has = (vehicle: number, driver: number, guide: number) => ({
    vehicle,
    driver,
    guide,
  });

  it("refuses dropping drivers while it has some, naming how many", () => {
    assert.equal(
      serviceChangeRefusalOf(theirs, "vehicle", has(3, 2, 0)),
      "Remove its 2 drivers first: Vehicle only does not cover drivers.",
    );
    assert.equal(
      serviceChangeRefusalOf(theirs, "driver", has(1, 4, 0)),
      "Remove its 1 vehicle first: Driver only does not cover vehicles.",
    );
  });

  it("names everything left over", () => {
    assert.equal(
      serviceChangeRefusalOf(theirs, "attraction", has(3, 2, 1)),
      "Remove its 3 vehicles, 2 drivers and 1 tour guide first: Attraction does not cover vehicles, drivers or tour guides.",
    );
  });

  it("lets a change go ahead when the new choice covers what it has", () => {
    assert.equal(serviceChangeRefusalOf(theirs, "vehicle", has(3, 0, 0)), null);
    assert.equal(
      serviceChangeRefusalOf(theirs, "vehicle-driver", has(3, 2, 0)),
      null,
    );
    assert.equal(
      serviceChangeRefusalOf(theirs, "tour-guide", has(0, 0, 0)),
      null,
    );
  });

  it("never refuses ours", () => {
    assert.equal(
      serviceChangeRefusalOf({ isOurs: true }, "vehicle", has(3, 2, 1)),
      null,
    );
  });
});
