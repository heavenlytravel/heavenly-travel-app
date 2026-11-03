import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  guideLanguagesOf,
  languagesMissing,
  parseGuideFields,
} from "./guide-input";

describe("guideLanguagesOf", () => {
  it("keeps the known languages once, in the list's order", () => {
    assert.deepEqual(
      guideLanguagesOf(["Mandarin", "Klingon", "English", "Mandarin", 3]),
      ["English", "Mandarin"],
    );
    assert.deepEqual(guideLanguagesOf([]), []);
  });
});

describe("languagesMissing", () => {
  it("lists what the trip asked that the guide does not speak", () => {
    assert.deepEqual(
      languagesMissing(["English", "Japanese"], ["English", "Mandarin"]),
      ["Japanese"],
    );
    assert.deepEqual(languagesMissing([], ["English"]), []);
  });
});

describe("parseGuideFields", () => {
  const values = {
    vendorId: "v1",
    name: "Siti",
    phone: "012-345 6789",
    locationId: "l1",
    isActive: "on",
    notes: "",
    motacExpiresOn: "2027-01-31",
  };

  it("reads a guide", () => {
    const parsed = parseGuideFields(values, ["Mandarin", "English"]);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.deepEqual(parsed.value.languages, ["English", "Mandarin"]);
    assert.equal(parsed.value.motacExpiresOn, "2027-01-31");
    assert.equal(parsed.value.isActive, true);
  });

  it("asks for a language", () => {
    const parsed = parseGuideFields(values, []);
    assert.equal(parsed.ok, false);
    if (parsed.ok) return;
    assert.equal(parsed.field, "languages");
  });
});
