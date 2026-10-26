import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { suggestionStateOf } from "./states";

describe("the state a suggestion names", () => {
  it("is the last part of its second line", () => {
    assert.equal(suggestionStateOf("Langkawi, Kedah"), "Kedah");
    assert.equal(
      suggestionStateOf("Jalan Burma, George Town, Penang"),
      "Penang",
    );
    assert.equal(suggestionStateOf("07000 Langkawi, Kedah"), "Kedah");
  });

  it("reads the other names Google gives a state as the boundary data's", () => {
    assert.equal(suggestionStateOf("Butterworth, Pulau Pinang"), "Penang");
    assert.equal(suggestionStateOf("Ayer Keroh, Malacca"), "Melaka");
    assert.equal(
      suggestionStateOf("Bukit Bintang, Federal Territory of Kuala Lumpur"),
      "Kuala Lumpur",
    );
    assert.equal(suggestionStateOf("11900 Pulau Pinang, Malaysia"), "Penang");
  });

  it("is none where the line names no state", () => {
    assert.equal(suggestionStateOf("Langkawi"), null);
    assert.equal(suggestionStateOf("Pantai Cenang"), null);
    assert.equal(suggestionStateOf(""), null);
    assert.equal(suggestionStateOf("Malaysia"), null);
  });
});
