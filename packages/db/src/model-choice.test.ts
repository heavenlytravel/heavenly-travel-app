import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choosableModel, modelChoiceQuote } from "./model-choice";

const PERCENT = { percent: 10, flatSen: null };
const FLAT = { percent: null, flatSen: 5000 };

describe("modelChoiceQuote", () => {
  it("charges a share of the subtotal, or an amount of its own", () => {
    assert.deepEqual(modelChoiceQuote(PERCENT, 3, 30_000), {
      charge: PERCENT,
      amountSen: 3000,
    });
    assert.deepEqual(modelChoiceQuote(FLAT, 2, 30_000), {
      charge: FLAT,
      amountSen: 5000,
    });
  });

  it("offers no choice without a charge or of fewer than two models", () => {
    assert.equal(modelChoiceQuote(null, 3, 30_000), null);
    assert.equal(modelChoiceQuote(PERCENT, 1, 30_000), null);
    assert.equal(modelChoiceQuote(PERCENT, 0, 30_000), null);
  });
});

describe("choosableModel", () => {
  const models = [
    { id: "alphard", name: "Toyota Alphard" },
    { id: "vellfire", name: "Toyota Vellfire" },
  ];

  it("names the model chosen where choosing is offered", () => {
    assert.equal(choosableModel(models, true, "vellfire"), models[1]);
  });

  it("is none where choosing is not offered", () => {
    assert.equal(choosableModel(models, false, "vellfire"), null);
  });

  it("is none for no choice, or a model no longer in the list", () => {
    assert.equal(choosableModel(models, true, null), null);
    assert.equal(choosableModel(models, true, ""), null);
    assert.equal(choosableModel(models, true, "hiace"), null);
  });
});
