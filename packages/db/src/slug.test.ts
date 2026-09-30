import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { slugify } from "./slug";

describe("slugify", () => {
  it("makes a kebab-case slug from a name", () => {
    assert.equal(slugify("Klang Valley"), "klang-valley");
    assert.equal(slugify("  Executive  sedan! "), "executive-sedan");
    assert.equal(slugify("Ta'zim / Café"), "ta-zim-cafe");
    assert.equal(slugify("44-seater coach"), "44-seater-coach");
  });

  it("is empty when nothing in the name can be a slug", () => {
    assert.equal(slugify("***"), "");
    assert.equal(slugify(""), "");
  });
});
