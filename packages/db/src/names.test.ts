import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sentenceCase, titleCase } from "./names";

describe("sentenceCase", () => {
  it("capitalises the first word only", () => {
    assert.equal(sentenceCase("tour guide"), "Tour guide");
    assert.equal(sentenceCase("the KLIA2 surcharge"), "The KLIA2 surcharge");
  });
});

describe("titleCase", () => {
  it("capitalises every word but the small ones inside", () => {
    assert.equal(
      titleCase("more popular places in Langkawi"),
      "More Popular Places in Langkawi",
    );
    assert.equal(titleCase("car with driver"), "Car with Driver");
    assert.equal(titleCase("terms and conditions"), "Terms and Conditions");
  });

  it("capitalises a small word that opens or closes the title", () => {
    assert.equal(titleCase("the class"), "The Class");
    assert.equal(titleCase("billed to"), "Billed To");
    assert.equal(titleCase("sign in"), "Sign In");
  });

  it("keeps a word that has a capital or a digit of its own", () => {
    assert.equal(titleCase("add KLIA2 transfer"), "Add KLIA2 Transfer");
    assert.equal(titleCase("delete 3 images"), "Delete 3 Images");
    assert.equal(titleCase("iPhone app"), "iPhone App");
  });

  it("gives a hyphenated word one capital", () => {
    assert.equal(titleCase("pick-up date and time"), "Pick-up Date and Time");
  });
});
