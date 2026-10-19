import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkOfferingFields, parseOfferingFields } from "./offering-input";

const FORM: Record<string, string> = {
  baseFare: "30",
  perKm: "1.80",
  hourlyRate: "60.00",
  minimumFare: "60",
  minLeadHours: "4",
  cancellationCutoffHours: "24",
  minHourlyHours: "3",
  isActive: "on",
};

/** The error the form would show, or null when the values pass. */
function errorOf(values: Record<string, string>) {
  const result = parseOfferingFields({ ...FORM, ...values });
  return result.ok ? null : result.error;
}

describe("parseOfferingFields", () => {
  it("reads money in ringgit into sen, the rules in hours and the checkbox", () => {
    assert.deepEqual(parseOfferingFields(FORM), {
      ok: true,
      value: {
        baseFareSen: 3000,
        perKmSen: 180,
        hourlyRateSen: 6000,
        minimumFareSen: 6000,
        minLeadHours: 4,
        cancellationCutoffHours: 24,
        minHourlyHours: 3,
        modelChoicePercent: null,
        modelChoiceFlatSen: null,
        isActive: true,
      },
    });
    const values = { ...FORM };
    delete values.isActive;
    const off = parseOfferingFields(values);
    assert.equal(off.ok && off.value.isActive, false);
  });

  it("refuses money that is negative or not ringgit", () => {
    assert.match(errorOf({ baseFare: "-1" }) ?? "", /base fare/);
    assert.match(errorOf({ perKm: "1.234" }) ?? "", /per km/);
    assert.match(errorOf({ hourlyRate: "" }) ?? "", /per hour/);
    assert.match(errorOf({ minimumFare: "abc" }) ?? "", /minimum fare/);
    assert.equal(errorOf({ minimumFare: "0" }), null);
  });

  it("keeps the hours whole and the minimum hire inside the global range", () => {
    assert.match(errorOf({ minLeadHours: "-1" }) ?? "", /Notice needed/);
    assert.match(errorOf({ cancellationCutoffHours: "1.5" }) ?? "", /Cancel/);
    assert.match(errorOf({ minLeadHours: "" }) ?? "", /Notice needed/);
    assert.match(errorOf({ minHourlyHours: "2" }) ?? "", /between 3 and 12/);
    assert.match(errorOf({ minHourlyHours: "13" }) ?? "", /between 3 and 12/);
    assert.equal(
      errorOf({ minLeadHours: "0", cancellationCutoffHours: "0" }),
      null,
    );
  });

  it("allows a minimum fare below the base fare", () => {
    assert.equal(errorOf({ baseFare: "50", minimumFare: "10" }), null);
  });

  it("reads the charge to choose a model as a percentage or in ringgit", () => {
    const percent = parseOfferingFields({
      ...FORM,
      modelChoiceKind: "percent",
      modelChoiceAmount: "15",
    });
    assert.deepEqual(
      percent.ok && [
        percent.value.modelChoicePercent,
        percent.value.modelChoiceFlatSen,
      ],
      [15, null],
    );
    const flat = parseOfferingFields({
      ...FORM,
      modelChoiceKind: "flat",
      modelChoiceAmount: "40.50",
    });
    assert.deepEqual(
      flat.ok && [flat.value.modelChoicePercent, flat.value.modelChoiceFlatSen],
      [null, 4050],
    );
  });

  it("keeps the charge to choose a model within its limits", () => {
    assert.match(
      errorOf({ modelChoiceKind: "percent", modelChoiceAmount: "0" }) ?? "",
      /choose a model is a whole percentage/,
    );
    assert.match(
      errorOf({ modelChoiceKind: "flat", modelChoiceAmount: "abc" }) ?? "",
      /choose a model in RM/,
    );
  });
});

describe("checkOfferingFields", () => {
  it("checks only the fields it is given", () => {
    assert.equal(checkOfferingFields({ isActive: false }).ok, true);
    assert.equal(checkOfferingFields({ perKmSen: 1.5 }).ok, false);
  });

  it("refuses a charge to choose a model that is both kinds", () => {
    assert.equal(
      checkOfferingFields({ modelChoicePercent: 10, modelChoiceFlatSen: 500 })
        .ok,
      false,
    );
  });
});
