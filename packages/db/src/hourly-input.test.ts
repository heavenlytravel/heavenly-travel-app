import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cheapestPackageSen,
  hourlyChargeOf,
  hourlyChoiceLabel,
  hourlyChoiceOfHours,
  hourlyReceiptOf,
  hourlyRoadCharge,
  parseHourlyList,
  sellsHourly,
  type HourlyList,
} from "./hourly-input";

// Langkawi's sheet, 2026-11-02: Sedan and Bus.
const list: HourlyList = {
  zones: [
    {
      zoneId: "kuah",
      packages: [
        { hours: 4, includedHours: 4, prices: { sedan: 14_000, bus: 57_000 } },
        { hours: 8, includedHours: 8, prices: { sedan: 25_000, bus: 95_000 } },
      ],
    },
    {
      zoneId: "port",
      packages: [{ hours: 4, includedHours: 5, prices: { sedan: 23_000 } }],
    },
  ],
  extras: [
    { packageHours: 4, vehicleClassId: "sedan", priceSen: 3_500 },
    { packageHours: 8, vehicleClassId: "sedan", priceSen: 3_000 },
  ],
};

const kuah = { id: "kuah", name: "Kuah Town" };
const port = { id: "port", name: "Port cruise" };

describe("sellsHourly", () => {
  it("is whether a zone sells any package", () => {
    assert.equal(sellsHourly(list, "kuah"), true);
    assert.equal(sellsHourly(list, "datai"), false);
  });
});

describe("hourlyChargeOf", () => {
  it("prices a package with the extra hours at that package's rate", () => {
    assert.deepEqual(
      hourlyChargeOf(list, kuah, { packageHours: 4, extraHours: 3 }, "sedan"),
      {
        zone: "Kuah Town",
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

  it("covers the zone's own hours, the port cruise's 4-hour package 5", () => {
    const charge = hourlyChargeOf(
      list,
      port,
      { packageHours: 4, extraHours: 2 },
      "sedan",
    );
    assert.equal(charge?.includedHours, 5);
    assert.equal(charge?.extraSen, 7_000);
  });

  it("has no price for a package the zone does not sell, or a class it does not price", () => {
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

describe("hourlyRoadCharge", () => {
  it("charges the whole km past the free km, none within them", () => {
    assert.deepEqual(hourlyRoadCharge(5.2, 250, 3), {
      extraKm: 5.2,
      freeKm: 3,
      chargedKm: 3,
      perKmSen: 250,
      extraSen: 750,
    });
    assert.equal(hourlyRoadCharge(2.9, 250, 3).extraSen, 0);
    assert.equal(hourlyRoadCharge(0.4, 250).chargedKm, 1);
  });
});

describe("hourlyReceiptOf", () => {
  it("reads a receipt with or without its road", () => {
    const charge = {
      zone: "Kuah Town",
      packageHours: 4,
      includedHours: 4,
      packageSen: 14_000,
      extraHours: 0,
      extraHourSen: 0,
      extraSen: 0,
    };
    assert.deepEqual(hourlyReceiptOf(charge), { ...charge, road: null });
    const road = hourlyRoadCharge(5, 250);
    assert.deepEqual(hourlyReceiptOf({ ...charge, road }), {
      ...charge,
      road,
    });
    assert.equal(hourlyReceiptOf({ ...charge, packageHours: 5 }), null);
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
      "8 hours",
    );
    assert.equal(
      hourlyChoiceLabel({ packageHours: 4, extraHours: 1 }),
      "4 hours + 1 extra hour",
    );
  });
});

describe("parseHourlyList", () => {
  const posted = {
    zones: [
      {
        zoneId: "port",
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
        zones: [
          {
            zoneId: "port",
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

  it("refuses a zone twice and a bad price", () => {
    assert.equal(
      parseHourlyList({ ...posted, zones: [posted.zones[0], posted.zones[0]] })
        .ok,
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
      zones: [{ ...posted.zones[0], packages: [row] }],
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
