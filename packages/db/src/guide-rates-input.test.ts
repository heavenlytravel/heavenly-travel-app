import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  guideOffers,
  guideOfferIssue,
  guideOffersOnAll,
  guidePriceSen,
  parseGuideRates,
  requestableLanguages,
  type GuideRateRow,
} from "./guide-rates-input";

const row = (over: Partial<GuideRateRow>): GuideRateRow => ({
  language: "English",
  isActive: true,
  oneWaySen: 12000,
  hours4Sen: 20000,
  hours8Sen: 25000,
  hours12Sen: null,
  extraHourSen: null,
  ...over,
});

describe("guidePriceSen", () => {
  it("prices one-way and a hire, with each extra hour", () => {
    const english = row({ extraHourSen: 3000 });
    assert.equal(guidePriceSen(english, { mode: "oneway" }), 12000);
    assert.equal(
      guidePriceSen(english, {
        mode: "hourly",
        packageHours: 8,
        extraHours: 2,
      }),
      31000,
    );
  });

  it("is null when a price the trip needs is not set", () => {
    const english = row({});
    const hire = { mode: "hourly", packageHours: 12, extraHours: 0 } as const;
    assert.equal(guidePriceSen(english, hire), null);
    assert.equal(
      guidePriceSen(english, { ...hire, packageHours: 4, extraHours: 1 }),
      null,
    );
  });
});

describe("guideOffers", () => {
  it("sells the active, priced languages, in the order Ops set", () => {
    const rows = [
      row({ language: "Mandarin", oneWaySen: 15000 }),
      row({ language: "Arabic", oneWaySen: null }),
      row({ language: "Malay", isActive: false }),
      row({ language: "English" }),
    ];
    assert.deepEqual(guideOffers(rows, { mode: "oneway" }), [
      { language: "Mandarin", amountSen: 15000 },
      { language: "English", amountSen: 12000 },
    ]);
  });

  it("keeps the languages every trip sells, at their sum", () => {
    assert.deepEqual(
      guideOffersOnAll([
        [
          { language: "English", amountSen: 12000 },
          { language: "Malay", amountSen: 8000 },
        ],
        [{ language: "English", amountSen: 20000 }],
      ]),
      [{ language: "English", amountSen: 32000 }],
    );
    assert.deepEqual(guideOffersOnAll([]), []);
  });
});

describe("parseGuideRates", () => {
  it("reads the rows, drops empty ones off sale, and refuses a bad price", () => {
    const parsed = parseGuideRates([
      { language: "Malay", isActive: true, oneWaySen: "80", hours4Sen: "" },
      { language: "Thai", isActive: false, oneWaySen: "" },
    ]);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.deepEqual(parsed.value, [
      {
        language: "Malay",
        isActive: true,
        oneWaySen: 8000,
        hours4Sen: null,
        hours8Sen: null,
        hours12Sen: null,
        extraHourSen: null,
      },
    ]);
    assert.equal(
      parseGuideRates([{ language: "Malay", isActive: true, oneWaySen: "x" }])
        .ok,
      false,
    );
    assert.equal(
      parseGuideRates([{ language: "Elvish", isActive: true }]).ok,
      false,
    );
  });
});

describe("requestableLanguages and guideOfferIssue", () => {
  const offers = [{ language: "English", amountSen: 12000 }];

  it("offers every language not on sale to ask for", () => {
    const asked = requestableLanguages(offers);
    assert.equal(asked.includes("English"), false);
    assert.equal(asked.includes("Korean"), true);
  });

  it("says when the language chosen is no longer on sale", () => {
    assert.equal(guideOfferIssue("English", offers), null);
    assert.equal(guideOfferIssue(null, []), null);
    assert.match(guideOfferIssue("Malay", offers) ?? "", /Malay/);
  });
});
