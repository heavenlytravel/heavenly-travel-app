import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cacheTagsOf, locationTag } from "./cache-tags";

describe("cache tags", () => {
  it("names a location by its slug", () => {
    assert.equal(locationTag("langkawi"), "location:langkawi");
  });

  it("reads a short list of tags", () => {
    assert.deepEqual(cacheTagsOf(["top-choices", "location:langkawi"]), [
      "top-choices",
      "location:langkawi",
    ]);
  });

  it("refuses anything else", () => {
    assert.equal(cacheTagsOf("top-choices"), null);
    assert.equal(cacheTagsOf([]), null);
    assert.equal(cacheTagsOf(["top-choices", 3]), null);
    assert.equal(cacheTagsOf([""]), null);
    assert.equal(cacheTagsOf(["x".repeat(257)]), null);
    assert.equal(
      cacheTagsOf(Array.from({ length: 21 }, (_, i) => `tag-${i}`)),
      null,
    );
  });
});
