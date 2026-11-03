import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { languagesOf, parseGuideFields } from "./guide-input";

describe("languagesOf", () => {
  it("splits on commas, trims, and keeps each once whatever its case", () => {
    assert.deepEqual(
      languagesOf(" English, mandarin ,English,, Bahasa  Melayu"),
      ["English", "mandarin", "Bahasa Melayu"],
    );
    assert.deepEqual(languagesOf(""), []);
  });
});

describe("parseGuideFields", () => {
  const values = {
    vendorId: "v1",
    name: "Siti",
    phone: "012-345 6789",
    locationId: "l1",
    languages: "English, Mandarin",
    isActive: "on",
    notes: "",
    motacExpiresOn: "2027-01-31",
  };

  it("reads a guide", () => {
    const parsed = parseGuideFields(values);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.deepEqual(parsed.value.languages, ["English", "Mandarin"]);
    assert.equal(parsed.value.motacExpiresOn, "2027-01-31");
    assert.equal(parsed.value.isActive, true);
  });

  it("asks for a language", () => {
    const parsed = parseGuideFields({ ...values, languages: " , " });
    assert.equal(parsed.ok, false);
    if (parsed.ok) return;
    assert.equal(parsed.field, "languages");
  });
});
