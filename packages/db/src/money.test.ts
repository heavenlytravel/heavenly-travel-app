import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatMyr, parseRinggit, ringgitInputValue, toSen } from "./money";

describe("parseRinggit", () => {
  it("reads ringgit with up to two decimals as sen", () => {
    assert.equal(parseRinggit("30"), 3000);
    assert.equal(parseRinggit("30.5"), 3050);
    assert.equal(parseRinggit(" 1,234.56 "), 123456);
    assert.equal(parseRinggit("RM 0.10"), 10);
    assert.equal(parseRinggit("0"), 0);
  });

  it("refuses what is not an amount", () => {
    for (const text of ["", "-1", "1.234", "abc", "1e3", "12.", ".5"]) {
      assert.equal(parseRinggit(text), null, JSON.stringify(text));
    }
  });

  it("round-trips through the input value", () => {
    for (const sen of [0, 5, 3000, 123456]) {
      assert.equal(parseRinggit(ringgitInputValue(sen)), sen);
    }
    assert.equal(ringgitInputValue(3000), "30.00");
  });
});

describe("formatMyr and toSen", () => {
  it("formats sen as ringgit", () => {
    assert.equal(formatMyr(123456), "RM 1,234.56");
    assert.equal(toSen(12.345), 1235);
  });
});
