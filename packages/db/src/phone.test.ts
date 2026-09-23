import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isValidPhone, normalizePhone } from "./phone";

describe("phone", () => {
  it("keeps digits and a leading plus only", () => {
    assert.equal(normalizePhone(" +60 12-345 6789 "), "+60123456789");
    assert.equal(normalizePhone("(012) 345.6789"), "0123456789");
    assert.equal(normalizePhone("012+345"), "012345");
  });

  it("accepts dialable lengths", () => {
    assert.equal(isValidPhone("+60123456789"), true);
    assert.equal(isValidPhone("0123456789"), true);
    assert.equal(isValidPhone("1234567"), false);
    assert.equal(isValidPhone("1234567890123456"), false);
    assert.equal(isValidPhone(""), false);
    assert.equal(isValidPhone("+"), false);
  });
});
