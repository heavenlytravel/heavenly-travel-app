import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decodePolyline } from "./polyline";

describe("decodePolyline", () => {
  it("decodes Google's example into [lng, lat]", () => {
    assert.deepEqual(decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@"), [
      [-120.2, 38.5],
      [-120.95, 40.7],
      [-126.453, 43.252],
    ]);
  });

  it("is empty for an empty line, and refuses one cut off", () => {
    assert.deepEqual(decodePolyline(""), []);
    assert.throws(() => decodePolyline("_p~iF~ps|"), RangeError);
  });
});
