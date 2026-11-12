import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { movedRow, pickedAfter } from "./list-move";

describe("movedRow", () => {
  it("moves a row one place, and not past either end", () => {
    assert.deepEqual(movedRow(["a", "b", "c"], 1, -1), ["b", "a", "c"]);
    assert.deepEqual(movedRow(["a", "b", "c"], 1, 1), ["a", "c", "b"]);
    assert.equal(movedRow(["a", "b"], 0, -1), null);
    assert.equal(movedRow(["a", "b"], 1, 1), null);
    assert.equal(movedRow(["a"], 3, 1), null);
  });
});

describe("pickedAfter", () => {
  const ids = ["a", "b", "c"];

  it("adds at the end, until the cap", () => {
    assert.deepEqual(pickedAfter(["a"], "b", "add", 3), ["a", "b"]);
    assert.deepEqual(pickedAfter(ids, "a", "add", 3), ids);
    assert.equal(pickedAfter(ids, "d", "add", 3), "full");
  });

  it("takes one off, and leaves the list alone when it was not on", () => {
    assert.deepEqual(pickedAfter(ids, "b", "remove", 3), ["a", "c"]);
    assert.deepEqual(pickedAfter(ids, "d", "remove", 3), ids);
  });

  it("moves one up or down, staying put at either end", () => {
    assert.deepEqual(pickedAfter(ids, "b", "up", 3), ["b", "a", "c"]);
    assert.deepEqual(pickedAfter(ids, "b", "down", 3), ["a", "c", "b"]);
    assert.deepEqual(pickedAfter(ids, "a", "up", 3), ids);
    assert.deepEqual(pickedAfter(ids, "c", "down", 3), ids);
  });

  it("says a row to move is gone when it is not picked", () => {
    assert.equal(pickedAfter(ids, "d", "up", 3), "gone");
  });
});
