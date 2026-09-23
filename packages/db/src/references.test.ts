import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  generateReference,
  isReference,
  normalizeReference,
} from "./references";

describe("references", () => {
  it("generates HT- plus six unambiguous characters", () => {
    for (let i = 0; i < 200; i++) {
      const ref = generateReference();
      assert.match(ref, /^HT-[A-HJ-NP-Z2-9]{6}$/);
      assert.equal(isReference(ref), true);
    }
  });

  it("does not repeat itself in a small sample", () => {
    const refs = new Set(Array.from({ length: 500 }, generateReference));
    assert.ok(refs.size > 495);
  });

  it("rejects strings that could not have been issued", () => {
    assert.equal(isReference("HT-7K3QZ"), false);
    assert.equal(isReference("HT-7K3QZ0"), false);
    assert.equal(isReference("ht-7k3qzm"), false);
    assert.equal(isReference(null), false);
  });

  it("normalises what a person typed", () => {
    assert.equal(normalizeReference(" ht-7k3qzm "), "HT-7K3QZM");
    assert.equal(normalizeReference("7k3qzm"), "HT-7K3QZM");
  });
});
