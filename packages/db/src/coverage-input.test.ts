import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkMultiplier,
  formatMultiplier,
  multiplierEffect,
  parseMultiplier,
} from "./coverage-input";

describe("parseMultiplier", () => {
  it("reads a multiplier with at most two decimals", () => {
    assert.deepEqual(parseMultiplier({ multiplier: "1.2" }), {
      ok: true,
      value: 1.2,
    });
    assert.equal(parseMultiplier({ multiplier: "0.5" }).ok, true);
    assert.equal(parseMultiplier({ multiplier: "3" }).ok, true);
  });

  it("keeps it between 0.5 and 3", () => {
    for (const multiplier of ["", "0.49", "3.01", "-1", "abc"]) {
      const result = parseMultiplier({ multiplier });
      assert.equal(result.ok, false, multiplier);
      assert.match(!result.ok ? result.error : "", /between 0.5 and 3/);
    }
    const result = checkMultiplier(1.005);
    assert.equal(result.ok, false);
    assert.match(!result.ok ? result.error : "", /two decimals/);
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
