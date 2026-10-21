import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkOddHours,
  closedRing,
  dropoffAllowed,
  dropoffRuleOf,
  isDropoffRule,
  isInOddHours,
  isZoneDistrict,
  minuteOfDay,
  oddHoursOf,
  parseOddHoursFields,
  parseRateCells,
  parseZoneFields,
  timeOfMinute,
} from "./rates-input";

const triangle = [
  [99.8, 6.3],
  [99.9, 6.3],
  [99.85, 6.4],
] as [number, number][];

describe("parseZoneFields", () => {
  it("reads a drawn polygon and closes its ring", () => {
    const parsed = parseZoneFields({ name: "Town", shape: triangle });
    assert.ok(parsed.ok);
    assert.equal(parsed.value.name, "Town");
    assert.equal(parsed.value.shape.length, 4);
    assert.deepEqual(parsed.value.shape[3], triangle[0]);
    assert.equal(parsed.value.drawnFrom, null);
  });

  it("keeps a ring that is already closed as it is", () => {
    assert.equal(closedRing([...triangle, triangle[0]!]).length, 4);
  });

  it("keeps the place and radius of a circle", () => {
    const parsed = parseZoneFields({
      name: "Airport",
      shape: [...triangle, triangle[0]],
      drawnFrom: { placeId: "p1", label: "Langkawi Airport", radiusM: 1500 },
    });
    assert.ok(parsed.ok);
    assert.deepEqual(parsed.value.drawnFrom, {
      placeId: "p1",
      label: "Langkawi Airport",
      radiusM: 1500,
    });
  });

  it("keeps a district's polygons as they are, each ring closed", () => {
    const parsed = parseZoneFields({
      name: "Langkawi",
      shape: [[triangle], [[...triangle, triangle[0]]]],
      drawnFrom: { districtCode: "langkawi", label: "Langkawi" },
    });
    assert.ok(parsed.ok);
    assert.deepEqual(parsed.value.drawnFrom, {
      districtCode: "langkawi",
      label: "Langkawi",
    });
    assert.deepEqual(parsed.value.shape, [
      [[...triangle, triangle[0]]],
      [[...triangle, triangle[0]]],
    ]);
  });

  it("keeps the district a reshaped boundary started from, apart from a district as it is", () => {
    const parsed = parseZoneFields({
      name: "Langkawi, Kuah side",
      shape: [[triangle], [triangle]],
      drawnFrom: { reshapedFrom: "langkawi", label: "Langkawi" },
    });
    assert.ok(parsed.ok);
    assert.deepEqual(parsed.value.drawnFrom, {
      reshapedFrom: "langkawi",
      label: "Langkawi",
    });
    assert.equal(isZoneDistrict(parsed.value.drawnFrom), false);
  });

  it("keeps the mukims a district zone is made of, each once, as it is or reshaped", () => {
    const parsed = parseZoneFields({
      name: "Kuah and Kedawang",
      shape: [[triangle]],
      drawnFrom: {
        districtCode: "langkawi",
        mukimCodes: [
          "langkawi:bandar-kuah",
          "langkawi:mukim-kedawang",
          "langkawi:bandar-kuah",
        ],
        label: "Langkawi",
      },
    });
    assert.ok(parsed.ok);
    assert.deepEqual(parsed.value.drawnFrom, {
      districtCode: "langkawi",
      mukimCodes: ["langkawi:bandar-kuah", "langkawi:mukim-kedawang"],
      label: "Langkawi",
    });
    const reshaped = parseZoneFields({
      name: "Kuah side",
      shape: [[triangle]],
      drawnFrom: {
        reshapedFrom: "langkawi",
        mukimCodes: ["langkawi:bandar-kuah"],
        label: "Langkawi",
      },
    });
    assert.ok(reshaped.ok);
    assert.deepEqual(reshaped.value.drawnFrom, {
      reshapedFrom: "langkawi",
      mukimCodes: ["langkawi:bandar-kuah"],
      label: "Langkawi",
    });
  });

  it("refuses a district zone of no mukims, and mukims that are not codes", () => {
    const zone = (mukimCodes: unknown) =>
      parseZoneFields({
        name: "Kuah",
        shape: [[triangle]],
        drawnFrom: { districtCode: "langkawi", mukimCodes, label: "Langkawi" },
      });
    assert.equal(zone([]).ok, false);
    assert.equal(zone([7]).ok, false);
    assert.equal(zone("langkawi:bandar-kuah").ok, false);
  });

  it("refuses a missing name, a shape that is not a ring and a radius out of range", () => {
    assert.equal(parseZoneFields({ name: "", shape: triangle }).ok, false);
    assert.equal(parseZoneFields({ name: "Town", shape: [[1, 2]] }).ok, false);
    assert.equal(
      parseZoneFields({
        name: "Airport",
        shape: triangle,
        drawnFrom: { placeId: "p1", label: "A", radiusM: 10 },
      }).ok,
      false,
    );
  });
});

describe("drop-off rule", () => {
  it("reads a row's rule, the loosest for a value it does not know", () => {
    assert.equal(dropoffRuleOf({ dropoffRule: "grid" }), "grid");
    assert.equal(dropoffRuleOf({ dropoffRule: "zones" }), "zones");
    assert.equal(dropoffRuleOf({ dropoffRule: "" }), "anywhere");
    assert.equal(isDropoffRule("within"), false);
  });

  it("allows a drop-off outside every zone only under the loosest rule", () => {
    assert.equal(dropoffAllowed("anywhere", false), true);
    assert.equal(dropoffAllowed("zones", false), false);
    assert.equal(dropoffAllowed("grid", false), false);
    assert.equal(dropoffAllowed("zones", true), true);
    assert.equal(dropoffAllowed("grid", true), true);
  });
});

describe("parseRateCells", () => {
  it("reads prices in ringgit and empty cells as cleared", () => {
    const parsed = parseRateCells([
      { fromZoneId: "a", toZoneId: "b", vehicleClassId: "sedan", price: "45" },
      { fromZoneId: "a", toZoneId: "b", vehicleClassId: "mpv", price: "" },
    ]);
    assert.ok(parsed.ok);
    assert.deepEqual(parsed.value, [
      {
        fromZoneId: "a",
        toZoneId: "b",
        vehicleClassId: "sedan",
        priceSen: 4_500,
      },
      { fromZoneId: "a", toZoneId: "b", vehicleClassId: "mpv", priceSen: null },
    ]);
  });

  it("refuses a price that is not money, a route to the same zone and a repeated cell", () => {
    const cell = { fromZoneId: "a", toZoneId: "b", vehicleClassId: "sedan" };
    assert.equal(parseRateCells([{ ...cell, price: "abc" }]).ok, false);
    assert.equal(
      parseRateCells([{ ...cell, toZoneId: "a", price: "1" }]).ok,
      false,
    );
    assert.equal(
      parseRateCells([
        { ...cell, price: "1" },
        { ...cell, price: "2" },
      ]).ok,
      false,
    );
  });
});

describe("odd hours", () => {
  it("reads and writes times of day", () => {
    assert.equal(minuteOfDay("23:00"), 1380);
    assert.equal(minuteOfDay("7:05"), 425);
    assert.equal(minuteOfDay("24:00"), null);
    assert.equal(minuteOfDay("noon"), null);
    assert.equal(timeOfMinute(1380), "23:00");
    assert.equal(timeOfMinute(425), "07:05");
  });

  it("spans midnight when the window ends before it starts", () => {
    const night = {
      fromMinute: 1380,
      toMinute: 420,
      percent: 50,
      flatSen: null,
    };
    assert.equal(isInOddHours(night, 1410), true);
    assert.equal(isInOddHours(night, 60), true);
    assert.equal(isInOddHours(night, 420), false);
    assert.equal(isInOddHours(night, 720), false);
  });

  it("holds a window inside one day too", () => {
    const lunch = {
      fromMinute: 720,
      toMinute: 840,
      percent: 10,
      flatSen: null,
    };
    assert.equal(isInOddHours(lunch, 780), true);
    assert.equal(isInOddHours(lunch, 900), false);
  });

  it("checks the window and the percentage", () => {
    assert.equal(
      checkOddHours({
        fromMinute: 1380,
        toMinute: 420,
        percent: 50,
        flatSen: null,
      }).ok,
      true,
    );
    assert.equal(
      checkOddHours({
        fromMinute: 1380,
        toMinute: 1380,
        percent: 50,
        flatSen: null,
      }).ok,
      false,
    );
    assert.equal(
      checkOddHours({
        fromMinute: 1380,
        toMinute: 420,
        percent: 0,
        flatSen: null,
      }).ok,
      false,
    );
    assert.equal(
      checkOddHours({
        fromMinute: 1380,
        toMinute: 420,
        percent: 250,
        flatSen: null,
      }).ok,
      false,
    );
  });

  it("reads the form: all empty is none, else all three", () => {
    assert.deepEqual(parseOddHoursFields({ from: "", to: "", amount: "" }), {
      ok: true,
      value: null,
    });
    assert.deepEqual(
      parseOddHoursFields({ from: "23:00", to: "07:00", amount: "50" }),
      {
        ok: true,
        value: { fromMinute: 1380, toMinute: 420, percent: 50, flatSen: null },
      },
    );
    assert.equal(
      parseOddHoursFields({ from: "23:00", to: "", amount: "50" }).ok,
      false,
    );
  });

  it("reads a flat amount in ringgit, and checks it", () => {
    assert.deepEqual(
      parseOddHoursFields({
        from: "23:00",
        to: "07:00",
        kind: "flat",
        amount: "RM 30",
      }),
      {
        ok: true,
        value: {
          fromMinute: 1380,
          toMinute: 420,
          percent: null,
          flatSen: 3_000,
        },
      },
    );
    assert.equal(
      parseOddHoursFields({
        from: "23:00",
        to: "07:00",
        kind: "flat",
        amount: "x",
      }).ok,
      false,
    );
    assert.equal(
      checkOddHours({
        fromMinute: 1380,
        toMinute: 420,
        percent: null,
        flatSen: 0,
      }).ok,
      false,
    );
    assert.equal(
      oddHoursOf({
        oddHoursFromMinute: 1380,
        oddHoursToMinute: 420,
        oddHoursPercent: null,
        oddHoursFlatSen: 3_000,
      })?.flatSen,
      3_000,
    );
  });

  it("reads the location's columns", () => {
    assert.equal(
      oddHoursOf({
        oddHoursFromMinute: null,
        oddHoursToMinute: null,
        oddHoursPercent: null,
        oddHoursFlatSen: null,
      }),
      null,
    );
    assert.deepEqual(
      oddHoursOf({
        oddHoursFromMinute: 1380,
        oddHoursToMinute: 420,
        oddHoursPercent: 50,
        oddHoursFlatSen: null,
      }),
      { fromMinute: 1380, toMinute: 420, percent: 50, flatSen: null },
    );
  });
});
