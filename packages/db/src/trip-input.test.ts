import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hiddenSearchFields,
  tripItemField,
  tripItemIndexes,
  tripItemParams,
  tripSearchOf,
  parsePassengers,
  parseTripOptions,
  parseTripSearch,
  toParams,
  tripSearchParams,
} from "./trip-input";

const oneway = "mode=oneway&pickup=p1&dropoff=p2&date=2026-10-03&time=09:30";
const hourly = "mode=hourly&pickup=p1&hours=4&date=2026-10-03&time=09:30";

describe("parseTripSearch", () => {
  it("reads a one-way search and drops the hours", () => {
    assert.deepEqual(parseTripSearch(`${oneway}&hours=4`), {
      mode: "oneway",
      pickupId: "p1",
      dropoffId: "p2",
      date: "2026-10-03",
      time: "09:30",
      hours: null,
    });
  });

  it("reads an hourly search and drops the drop-off", () => {
    assert.deepEqual(parseTripSearch(`${hourly}&dropoff=p2`), {
      mode: "hourly",
      pickupId: "p1",
      dropoffId: null,
      date: "2026-10-03",
      time: "09:30",
      hours: 4,
    });
  });

  it("refuses a search with a part missing or out of range", () => {
    assert.equal(
      parseTripSearch("mode=oneway&pickup=p1&date=2026-10-03"),
      null,
    );
    assert.equal(parseTripSearch(hourly.replace("hours=4", "hours=2")), null);
    assert.equal(parseTripSearch(hourly.replace("hours=4", "hours=13")), null);
    assert.equal(parseTripSearch(oneway.replace("09:30", "9:30")), null);
    assert.equal(parseTripSearch(oneway.replace("oneway", "return")), null);
  });

  it("reads the same names from a posted form", () => {
    const form = new FormData();
    form.set("mode", "hourly");
    form.set("pickup", "local:petaling");
    form.set("hours", "5");
    form.set("date", "2026-10-03");
    form.set("time", "08:00");
    assert.deepEqual(parseTripSearch(form), {
      mode: "hourly",
      pickupId: "local:petaling",
      dropoffId: null,
      date: "2026-10-03",
      time: "08:00",
      hours: 5,
    });
  });

  it("round-trips through tripSearchParams", () => {
    const search = parseTripSearch(hourly)!;
    assert.deepEqual(parseTripSearch(tripSearchParams(search)), search);
    assert.deepEqual(
      hiddenSearchFields(search).map(([name]) => name),
      ["mode", "pickup", "date", "time", "hours"],
    );
  });
});

describe("parseTripOptions", () => {
  it("reads the choices and normalises the flight number", () => {
    assert.deepEqual(
      parseTripOptions(
        "car-with-driver",
        "class=vc1&passengers=3&childSeats=1&flight=mh+123&notes=+Two+bags+",
      ),
      {
        vehicleClassId: "vc1",
        passengers: 3,
        childSeats: 1,
        flightNumber: "MH 123",
        notes: "Two bags",
      },
    );
  });

  it("drops child seats for a coach", () => {
    const options = parseTripOptions(
      "coach-charter",
      "class=vc4&passengers=20&childSeats=2",
    );
    assert.equal(options?.childSeats, 0);
  });

  it("needs a class and a passenger count", () => {
    assert.equal(parseTripOptions("car-with-driver", "passengers=2"), null);
    assert.equal(parseTripOptions("car-with-driver", "class=vc1"), null);
    assert.equal(
      parseTripOptions("car-with-driver", "class=vc1&passengers=0"),
      null,
    );
  });
});

describe("toParams and parsePassengers", () => {
  it("takes the first of a repeated search param", () => {
    const params = toParams({ passengers: ["4", "9"], mode: undefined });
    assert.equal(params.get("passengers"), "4");
    assert.equal(params.has("mode"), false);
    assert.equal(parsePassengers(params), 4);
  });

  it("returns null for a count outside the range", () => {
    assert.equal(parsePassengers("passengers=1000"), null);
    assert.equal(parsePassengers("passengers=two"), null);
    assert.equal(parsePassengers(""), null);
  });
});

describe("tripSearchOf", () => {
  const klia = {
    placeId: "p1",
    label: "KLIA",
    address: "KLIA",
    lat: 2.7,
    lng: 101.7,
    state: null,
    district: null,
    locality: null,
  };
  const startsAt = new Date("2026-10-03T01:30:00Z");

  it("turns a stored one-way trip back into its search", () => {
    assert.deepEqual(
      tripSearchOf({
        mode: "oneway",
        pickup: klia,
        dropoff: { ...klia, placeId: "p2" },
        startsAt,
        hours: null,
        distanceKm: 55.2,
      }),
      {
        mode: "oneway",
        pickupId: "p1",
        dropoffId: "p2",
        date: "2026-10-03",
        time: "09:30",
        hours: null,
      },
    );
  });

  it("keeps the hours of an hourly trip and drops the drop-off", () => {
    const search = tripSearchOf({
      mode: "hourly",
      pickup: klia,
      dropoff: null,
      startsAt,
      hours: 4,
      distanceKm: null,
    });
    assert.equal(search.hours, 4);
    assert.equal(search.dropoffId, null);
    assert.notEqual(parseTripSearch(tripSearchParams(search)), null);
  });
});

describe("several items in one form", () => {
  const form = new FormData();
  form.set(tripItemField(0, "mode"), "oneway");
  form.set(tripItemField(0, "pickup"), "p1");
  form.set(tripItemField(2, "mode"), "hourly");
  form.set(tripItemField(2, "pickup"), "p3");
  form.set("name", "Nurul");

  it("names an item's field with its index", () => {
    assert.equal(tripItemField(1, "pickup"), "item1.pickup");
  });

  it("finds the items a form carries, in order", () => {
    assert.deepEqual(tripItemIndexes(form), [0, 2]);
    assert.deepEqual(tripItemIndexes("name=Nurul"), []);
  });

  it("reads one item's fields under their plain names", () => {
    const item = tripItemParams(form, 2);
    assert.equal(item.get("mode"), "hourly");
    assert.equal(item.get("pickup"), "p3");
    assert.equal(item.get("name"), null);
    assert.equal(tripItemParams(form, 1).size, 0);
  });
});
