import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  phoneDigitsOf,
  plateTermOf,
  SEARCH_MAX_LENGTH,
  searchTermOf,
} from "./search";

describe("searchTermOf", () => {
  it("squashes and trims what was typed", () => {
    assert.equal(searchTermOf("  Aina   binti  Ali "), "Aina binti Ali");
  });

  it("reads nothing as no search", () => {
    assert.equal(searchTermOf("   "), null);
    assert.equal(searchTermOf(undefined), null);
    assert.equal(searchTermOf(["a"]), null);
  });

  it("stops at the limit", () => {
    assert.equal(searchTermOf("x".repeat(100))?.length, SEARCH_MAX_LENGTH);
  });
});

describe("phoneDigitsOf", () => {
  it("drops the country code or the trunk 0", () => {
    assert.equal(phoneDigitsOf("012-345 6789"), "123456789");
    assert.equal(phoneDigitsOf("+60 12 345 6789"), "123456789");
    assert.equal(phoneDigitsOf("345 67"), "34567");
  });

  it("is null for too few digits or none", () => {
    assert.equal(phoneDigitsOf("Aina"), null);
    assert.equal(phoneDigitsOf("012"), null);
  });
});

describe("plateTermOf", () => {
  it("reads a plate as it is kept", () => {
    assert.equal(plateTermOf("vle 12"), "VLE12");
    assert.equal(plateTermOf("-"), null);
  });
});
