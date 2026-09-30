import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DISTRICT_DATA, districtCodeAt, districtShape } from "./district-index";

describe("districtCodeAt", () => {
  it("places well-known points", () => {
    assert.equal(districtCodeAt(3.1579, 101.7123), "kuala-lumpur"); // KLCC
    assert.equal(districtCodeAt(2.7456, 101.7072), "sepang"); // klia2
    assert.equal(districtCodeAt(3.0733, 101.6073), "petaling"); // Sunway Pyramid
    assert.equal(districtCodeAt(4.47, 101.377), "cameron-highlands"); // Tanah Rata
    assert.equal(districtCodeAt(5.4141, 100.3288), "timur-laut"); // George Town
  });

  it("gives Putrajaya to Putrajaya although Sepang's shape wraps it", () => {
    assert.equal(districtCodeAt(2.9264, 101.6964), "putrajaya"); // Putrajaya centre
  });

  it("takes the nearest district for a point just off the coast", () => {
    assert.equal(districtCodeAt(6.2993, 99.7209), "langkawi"); // a beach hotel on Pantai Cenang
    assert.equal(districtCodeAt(3.0186, 101.2528), "klang"); // Pulau Ketam jetty
  });

  it("is null far out to sea or abroad", () => {
    assert.equal(districtCodeAt(3.0, 100.5), null); // Straits of Malacca
    assert.equal(districtCodeAt(1.3521, 103.8198), null); // Singapore
  });

  it("has a point inside every district and a state for each", () => {
    const states = new Set(DISTRICT_DATA.states.map((s) => s.code));
    for (const district of DISTRICT_DATA.districts) {
      assert.ok(states.has(district.stateCode), district.name);
      assert.equal(
        districtCodeAt(district.point[1], district.point[0]),
        district.code,
        district.name,
      );
    }
    assert.equal(districtShape("petaling")?.stateCode, "MY-10");
  });
});
