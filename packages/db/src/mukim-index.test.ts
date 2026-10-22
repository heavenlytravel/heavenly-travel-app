import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DISTRICT_DATA } from "./district-index";
import { mukimsByCode, mukimsOf } from "./mukim-index";

describe("mukimsOf", () => {
  it("lists a district's mukims and towns by name, each with its kind", async () => {
    const langkawi = await mukimsOf("langkawi");
    assert.deepEqual(
      langkawi.map((mukim) => mukim.code),
      [
        "langkawi:mukim-ayer-hangat",
        "langkawi:mukim-bohor",
        "langkawi:mukim-kedawang",
        "langkawi:bandar-kuah",
        "langkawi:bandar-padang-lalang",
        "langkawi:bandar-padang-mat-sirat",
        "langkawi:mukim-padang-mat-sirat",
        "langkawi:pekan-telok-datai",
        "langkawi:mukim-ulu-melaka",
      ],
    );
    assert.ok(langkawi.every((mukim) => mukim.districtCode === "langkawi"));
  });

  it("has none for Sabah's districts", async () => {
    assert.deepEqual(await mukimsOf("kota-kinabalu"), []);
  });

  it("files every mukim under a district the boundary data has", async () => {
    const { default: data } = await import("../data/malaysia-mukims.json");
    const codes = new Set(DISTRICT_DATA.districts.map((d) => d.code));
    for (const mukim of data.mukims) {
      assert.ok(codes.has(mukim.districtCode), mukim.code);
      assert.ok(mukim.code.startsWith(`${mukim.districtCode}:`), mukim.code);
      assert.ok(mukim.polygons.length > 0, mukim.code);
    }
  });
});

describe("mukimsByCode", () => {
  it("answers the district's mukims with the codes, in the district's order", async () => {
    const found = await mukimsByCode("langkawi", [
      "langkawi:bandar-kuah",
      "langkawi:mukim-kedawang",
    ]);
    assert.deepEqual(
      found?.map((mukim) => mukim.name),
      ["Kedawang", "Kuah"],
    );
  });

  it("is null for a code of another district or none", async () => {
    assert.equal(
      await mukimsByCode("langkawi", ["kota-setar:bandar-alor-setar"]),
      null,
    );
    assert.equal(await mukimsByCode("langkawi", ["langkawi:nowhere"]), null);
  });
});
