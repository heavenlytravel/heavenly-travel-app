import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkModelName,
  modelName,
  modelsLine,
  sameName,
} from "./vehicle-model-input";

describe("the words around a model", () => {
  it("names a model by its brand and name", () => {
    assert.equal(
      modelName({ brand: "Toyota", name: "Alphard" }),
      "Toyota Alphard",
    );
    // A model named before brands were kept.
    assert.equal(
      modelName({ brand: "", name: "Toyota Alphard" }),
      "Toyota Alphard",
    );
  });

  it("takes a brand typed in other letters or spaces as the same", () => {
    assert.equal(sameName(" toyota ", "Toyota"), true);
    assert.equal(sameName("Land  Cruiser", "land cruiser"), true);
    assert.equal(sameName("Vios", "City"), false);
  });

  it("lists a class's models as a card names them", () => {
    assert.equal(modelsLine([]), "");
    assert.equal(modelsLine(["Toyota Vios"]), "Toyota Vios");
    assert.equal(
      modelsLine(["Toyota Vellfire", "Toyota Alphard", "Lexus LM"]),
      "Toyota Vellfire, Toyota Alphard or Lexus LM",
    );
  });
});

describe("checkModelName", () => {
  it("needs a brand and a model, each short", () => {
    assert.equal(checkModelName({ brand: "Toyota", name: "Alphard" }).ok, true);
    assert.equal(checkModelName({ brand: "" }).ok, false);
    assert.equal(checkModelName({ name: "" }).ok, false);
    assert.equal(checkModelName({ brand: "x".repeat(41) }).ok, false);
  });
});
