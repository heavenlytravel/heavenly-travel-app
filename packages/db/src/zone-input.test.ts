import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkZoneFields,
  formatMultiplier,
  multiplierEffect,
  parseZoneDistrictFields,
  parseZoneFields,
} from "./zone-input";

describe("parseZoneFields", () => {
  it("reads a name and a multiplier with two decimals", () => {
    assert.deepEqual(
      parseZoneFields({ name: " Klang Valley ", multiplier: "1.2" }),
      {
        ok: true,
        value: { name: "Klang Valley", multiplier: 1.2 },
      },
    );
    assert.equal(
      parseZoneFields({ name: "Penang", multiplier: "0.5" }).ok,
      true,
    );
    assert.equal(parseZoneFields({ name: "Penang", multiplier: "3" }).ok, true);
  });

  it("refuses a blank name", () => {
    const result = parseZoneFields({ name: "  ", multiplier: "1" });
    assert.equal(result.ok, false);
    assert.match(!result.ok ? result.error : "", /name/);
  });

  it("keeps the multiplier between 0.5 and 3 with at most two decimals", () => {
    for (const multiplier of ["", "0.49", "3.01", "-1", "abc"]) {
      const result = parseZoneFields({ name: "Penang", multiplier });
      assert.equal(result.ok, false, multiplier);
      assert.match(!result.ok ? result.error : "", /between 0.5 and 3/);
    }
    const result = parseZoneFields({ name: "Penang", multiplier: "1.005" });
    assert.equal(result.ok, false);
    assert.match(!result.ok ? result.error : "", /two decimals/);
  });

  it("checks only the fields it is given", () => {
    assert.deepEqual(checkZoneFields({}), { ok: true });
    assert.deepEqual(checkZoneFields({ multiplier: 1.5 }), { ok: true });
    assert.equal(checkZoneFields({ name: "" }).ok, false);
  });
});

describe("parseZoneDistrictFields", () => {
  it("needs both the town and the state", () => {
    assert.deepEqual(
      parseZoneDistrictFields({
        district: " Seri Kembangan ",
        state: "Selangor",
      }),
      { ok: true, value: { district: "Seri Kembangan", state: "Selangor" } },
    );
    assert.equal(
      parseZoneDistrictFields({ district: "", state: "Selangor" }).ok,
      false,
    );
    assert.equal(
      parseZoneDistrictFields({ district: "Kuah", state: "" }).ok,
      false,
    );
  });
});

describe("the multiplier's text", () => {
  it("shows the factor and its effect", () => {
    assert.equal(formatMultiplier(1), "×1.00");
    assert.equal(formatMultiplier(1.2), "×1.20");
    assert.equal(multiplierEffect(1.2), "A RM 100 trip becomes RM 120.00");
    assert.equal(multiplierEffect(0.75), "A RM 100 trip becomes RM 75.00");
  });
});
