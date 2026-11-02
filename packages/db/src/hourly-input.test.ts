import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cheapestPackageSen,
  hourlyAreaOf,
  hourlyChargeOf,
  hourlyChoiceLabel,
  hourlyChoiceOfHours,
  parseHourlyList,
  type HourlyList,
} from "./hourly-input";

// Langkawi's sheet, 2026-11-02: Sedan and Bus.
const list: HourlyList = {
  areas: [
    {
      name: "Kuah Town / Beach / Pantai Kok",
      zoneIds: ["kuah", "beach", "pantai-kok"],
      packages: [
        { hours: 4, includedHours: 4, prices: { sedan: 14_000, bus: 57_000 } },
        { hours: 8, includedHours: 8, prices: { sedan: 25_000, bus: 95_000 } },
      ],
    },
    {
      name: "Port cruise",
      zoneIds: ["port"],
      packages: [{ hours: 4, includedHours: 5, prices: { sedan: 23_000 } }],
    },
  ],
  extras: [
    { packageHours: 4, vehicleClassId: "sedan", priceSen: 3_500 },
    { packageHours: 8, vehicleClassId: "sedan", priceSen: 3_000 },
  ],
};

const kuah = list.areas[0]!;
const port = list.areas[1]!;

describe("hourlyAreaOf", () => {
  it("finds the area a zone is in, or none", () => {
    assert.equal(hourlyAreaOf(list, "beach"), kuah);
    assert.equal(hourlyAreaOf(list, "datai"), null);
  });
});

describe("hourlyChargeOf", () => {
  it("prices a package with the extra hours at that package's rate", () => {
    assert.deepEqual(
      hourlyChargeOf(list, kuah, { packageHours: 4, extraHours: 3 }, "sedan"),
      {
        area: "Kuah Town / Beach / Pantai Kok",
        packageHours: 4,
        includedHours: 4,
        packageSen: 14_000,
        extraHours: 3,
        extraHourSen: 3_500,
        extraSen: 10_500,
      },
    );
    assert.equal(
      hourlyChargeOf(list, kuah, { packageHours: 8, extraHours: 1 }, "sedan")
        ?.extraHourSen,
      3_000,
    );
  });

  it("covers the area's own hours, the port cruise's 4-hour package 5", () => {
    const charge = hourlyChargeOf(
      list,
      port,
      { packageHours: 4, extraHours: 2 },
      "sedan",
    );
    assert.equal(charge?.includedHours, 5);
    assert.equal(charge?.extraSen, 7_000);
  });

  it("has no price for a package the area does not sell, or a class it does not price", () => {
    assert.equal(
      hourlyChargeOf(list, kuah, { packageHours: 12, extraHours: 0 }, "sedan"),
      null,
    );
    assert.equal(
      hourlyChargeOf(list, port, { packageHours: 4, extraHours: 0 }, "bus"),
      null,
    );
  });

  it("needs an extra hour rate only when extra hours are asked", () => {
    assert.equal(
      hourlyChargeOf(list, kuah, { packageHours: 4, extraHours: 0 }, "bus")
        ?.packageSen,
      57_000,
    );
    assert.equal(
      hourlyChargeOf(list, kuah, { packageHours: 4, extraHours: 1 }, "bus"),
      null,
    );
  });
});

describe("cheapestPackageSen", () => {
  it("is a class's cheapest package from any area, or null", () => {
    assert.equal(cheapestPackageSen(list, "sedan"), 14_000);
    assert.equal(cheapestPackageSen(list, "mpv"), null);
  });
});

describe("hourlyChoiceOfHours", () => {
  it("reads a stored hire as the biggest package it fills and the rest", () => {
    assert.deepEqual(hourlyChoiceOfHours(7), {
      packageHours: 4,
      extraHours: 3,
    });
    assert.deepEqual(hourlyChoiceOfHours(8), {
      packageHours: 8,
      extraHours: 0,
    });
    assert.deepEqual(hourlyChoiceOfHours(3), {
      packageHours: 4,
      extraHours: 0,
    });
    assert.deepEqual(hourlyChoiceOfHours(24), {
      packageHours: 12,
      extraHours: 12,
    });
  });
});

describe("hourlyChoiceLabel", () => {
  it("names the package and the extra hours", () => {
    assert.equal(
      hourlyChoiceLabel({ packageHours: 8, extraHours: 0 }),
      "8-hour package",
    );
    assert.equal(
      hourlyChoiceLabel({ packageHours: 4, extraHours: 1 }),
      "4-hour package + 1 extra hour",
    );
  });
});

describe("parseHourlyList", () => {
  const posted = {
    areas: [
      {
        name: " Port cruise ",
        zoneIds: ["port"],
        packages: [
          {
            hours: 4,
            includedHours: 5,
            prices: [
              { vehicleClassId: "sedan", price: "230" },
              { vehicleClassId: "bus", price: "" },
            ],
          },
        ],
      },
    ],
    extras: [{ packageHours: 4, vehicleClassId: "sedan", price: "RM 35" }],
  };

  it("reads prices in ringgit, empty as none", () => {
    assert.deepEqual(parseHourlyList(posted), {
      ok: true,
      value: {
        areas: [
          {
            name: "Port cruise",
            zoneIds: ["port"],
            packages: [
              {
                hours: 4,
                includedHours: 5,
                prices: [
                  { vehicleClassId: "sedan", priceSen: 23_000 },
                  { vehicleClassId: "bus", priceSen: null },
                ],
              },
            ],
          },
        ],
        extras: [{ packageHours: 4, vehicleClassId: "sedan", priceSen: 3_500 }],
      },
    });
  });

  it("refuses a zone in two areas, a nameless area and a bad price", () => {
    const twice = {
      ...posted,
      areas: [posted.areas[0], { ...posted.areas[0], name: "Datai" }],
    };
    assert.equal(parseHourlyList(twice).ok, false);
    assert.equal(
      parseHourlyList({
        ...posted,
        areas: [{ ...posted.areas[0], name: " " }],
      }).ok,
      false,
    );
    assert.equal(
      parseHourlyList({
        ...posted,
        extras: [{ packageHours: 4, vehicleClassId: "sedan", price: "abc" }],
      }).ok,
      false,
    );
  });

  it("refuses a package that is not one there is, and hours it cannot cover", () => {
    const withPackage = (row: object) => ({
      ...posted,
      areas: [{ ...posted.areas[0], packages: [row] }],
    });
    assert.equal(
      parseHourlyList(withPackage({ hours: 6, includedHours: 6, prices: [] }))
        .ok,
      false,
    );
    assert.equal(
      parseHourlyList(withPackage({ hours: 4, includedHours: 0, prices: [] }))
        .ok,
      false,
    );
  });
});
