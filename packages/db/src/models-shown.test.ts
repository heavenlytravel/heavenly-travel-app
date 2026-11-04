import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shownModel } from "./models-shown";

describe("shownModel", () => {
  it("names a model by brand and name", () => {
    assert.deepEqual(
      shownModel({ id: "m1", brand: "Toyota", name: "Alphard" }),
      { id: "m1", name: "Toyota Alphard" },
    );
  });
});
