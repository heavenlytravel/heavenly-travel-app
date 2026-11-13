import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  amendSummaryOf,
  chargedSenOf,
  customerChangesOf,
  revisionDetailsOf,
  revisionSnapshotOf,
  revisionText,
  snapshotOf,
  type RevisionSnapshot,
  type SnapshotSource,
  type SnapshotTrip,
} from "./revision-rules";
import {
  directionsHref,
  itemQuoteSen,
  routePlaces,
  stopPaySuggestion,
  stopsOf,
} from "./stops";
import type { Place } from "./place";
import { priceTrip } from "./pricing";

const place = (label: string, lat = 6.3, lng = 99.8): Place => ({
  placeId: label,
  label,
  address: `${label}, Langkawi`,
  lat,
  lng,
  state: null,
  district: null,
  locality: null,
});

/** A receipt of RM500: 200 km at RM2.50. */
const RECEIPT = priceTrip({
  trip: { mode: "oneway", distanceKm: 200 },
  rates: { perKmSen: 250 },
  route: { fromZone: "A", toZone: "C", rateSen: 50000 },
});

function source(over: Partial<SnapshotSource> = {}): SnapshotSource {
  return {
    status: "confirmed",
    items: [
      {
        id: "i1",
        position: 1,
        status: "confirmed",
        startsAt: new Date("2026-11-10T02:00:00Z"),
        priceTotalSen: 35000,
        priceBreakdown: RECEIPT,
        priceOverrideReason: "Phone deal",
        tripDetails: {
          vehicleClassCategory: "car-with-driver",
          vehicleClassName: "Sedan",
          vehicleModelName: null,
          mode: "oneway",
          pickupPlace: place("A"),
          stops: [],
          dropoffPlace: place("C"),
          hours: null,
          distanceKm: 20,
          passengers: 2,
          guideLanguage: null,
        },
      },
    ],
    charges: [],
    ...over,
  };
}

describe("stops", () => {
  it("adds a stop's quote to the trip's receipt", () => {
    const stops = [
      { place: place("B"), waitMinutes: 15, quoteAddSen: 10000, extraKm: 6 },
    ];
    assert.equal(
      itemQuoteSen({
        priceBreakdown: RECEIPT,
        priceTotalSen: 1,
        tripDetails: { stops },
      }),
      60000,
    );
    assert.equal(stopsOf([{ junk: true }, ...stops]).length, 1);
    assert.deepEqual(stopsOf(null), []);
  });

  it("suggests a driver's stop pay from the location's rates, or none", () => {
    assert.equal(
      stopPaySuggestion({ extraKm: 6, payPerKmSen: 150, stopFeeSen: 3000 }),
      3900,
    );
    assert.equal(
      stopPaySuggestion({ extraKm: null, payPerKmSen: 150, stopFeeSen: 3000 }),
      3000,
    );
    assert.equal(
      stopPaySuggestion({ extraKm: 6, payPerKmSen: null, stopFeeSen: null }),
      null,
    );
  });

  it("routes through the stops in order, for the driver's map", () => {
    const places = routePlaces({
      pickup: place("A", 1, 2),
      stops: [place("B", 3, 4)],
      dropoff: place("C", 5, 6),
    });
    assert.deepEqual(
      places.map((p) => p.label),
      ["A", "B", "C"],
    );
    const href = directionsHref(places)!;
    assert.match(href, /origin=1%2C2/);
    assert.match(href, /destination=5%2C6/);
    assert.match(href, /waypoints=3%2C4/);
    assert.equal(directionsHref([place("A")]), null);
  });
});

describe("revision snapshots", () => {
  it("keeps the trips, the quote beside the agreed price, and the charges", () => {
    const snapshot = snapshotOf(
      source({
        charges: [{ itemId: "i1", label: "Parking", amountSen: 1500 }],
      }),
      () => "Car with Driver",
    );
    assert.equal(snapshot.trips[0]!.pickup, "A");
    assert.equal(snapshot.trips[0]!.quotedSen, 50000);
    assert.equal(snapshot.trips[0]!.chargedSen, 35000);
    assert.deepEqual(snapshot.charges, [
      { label: "Parking", amountSen: 1500, position: 1 },
    ]);
    assert.equal(snapshot.chargedSen, 36500);
    assert.equal(snapshot.quotedSen, 51500);
    assert.deepEqual(revisionSnapshotOf(snapshot), snapshot);
    assert.equal(revisionSnapshotOf({}), null);
  });

  it("charges a cancelled booking its fees alone", () => {
    const cancelled = source();
    cancelled.items[0]!.status = "cancelled";
    cancelled.charges = [
      { itemId: null, label: "Cancellation fee", amountSen: 5000 },
    ];
    assert.equal(chargedSenOf(cancelled), 5000);
  });
});

describe("the customer's change list", () => {
  it("lists every change after the booking, with its difference and the new total", () => {
    const at = (day: number) => new Date(`2026-11-0${day}T02:00:00Z`);
    const changes = customerChangesOf([
      {
        number: 3,
        summary: "Stop at B added",
        chargedSen: 64000,
        createdAt: at(3),
      },
      { number: 1, summary: "Booked", chargedSen: 35000, createdAt: at(1) },
      {
        number: 2,
        summary: "Tour Guide added",
        chargedSen: 55000,
        createdAt: at(2),
      },
    ]);
    assert.deepEqual(
      changes.map((c) => [c.summary, c.differenceSen, c.totalSen]),
      [
        ["Tour Guide added", 20000, 55000],
        ["Stop at B added", 9000, 64000],
      ],
    );
  });

  it("trims what staff type", () => {
    assert.equal(revisionText("  a   b "), "a b");
    assert.equal(revisionText("x".repeat(300)).length, 200);
  });
});

describe("what a revision changed", () => {
  const trip = (patch: Partial<SnapshotTrip> = {}): SnapshotTrip => ({
    position: 1,
    status: "confirmed",
    startsAt: "2026-11-11T05:00:00.000Z",
    heading: "Car with Driver",
    mode: "oneway",
    vehicleClassName: "Standard Van",
    vehicleModelName: null,
    pickup: "KLIA",
    stops: [],
    dropoff: "KL Sentral",
    hours: null,
    distanceKm: 60,
    passengers: 2,
    guideLanguage: null,
    quotedSen: 80000,
    chargedSen: 80000,
    agreedReason: null,
    ...patch,
  });
  const snap = (
    trips: SnapshotTrip[],
    charges: RevisionSnapshot["charges"] = [],
  ): RevisionSnapshot => ({
    status: "confirmed",
    trips,
    charges,
    quotedSen: 0,
    chargedSen: 0,
  });

  it("names each field an amend moved, before and after", () => {
    const details = revisionDetailsOf(
      snap([trip()]),
      snap([
        trip({
          startsAt: "2026-11-12T01:00:00.000Z",
          vehicleClassName: "Premium MPV",
          chargedSen: 120000,
          distanceKm: 61,
        }),
      ]),
    );
    assert.deepEqual(
      details.map((d) => d.label),
      ["Trip 1 · Pick-up Time", "Trip 1 · Vehicle", "Trip 1 · Price"],
    );
    assert.deepEqual(details[1], {
      label: "Trip 1 · Vehicle",
      before: "Standard Van",
      after: "Premium MPV",
    });
    assert.equal(details[2]!.after, "RM 1,200.00");
    assert.equal(
      amendSummaryOf(1, details),
      "Trip 1: pick-up time, vehicle and price changed",
    );
  });

  it("lists a trip added and charges added or taken off", () => {
    const parking = { label: "Parking", amountSen: 5000, position: 1 };
    const details = revisionDetailsOf(
      snap([trip()], [parking]),
      snap(
        [trip(), trip({ position: 2 })],
        [{ label: "Toll", amountSen: 1200, position: null }],
      ),
    );
    assert.deepEqual(
      details.map((d) => d.label),
      ["Trip 2 Added", "Charge Added", "Charge Taken Off"],
    );
    assert.equal(details[2]!.before, "Parking (Trip 1), RM 50.00");
  });

  it("changes nothing at Rev 1, and says so plainly when no field moved", () => {
    assert.deepEqual(revisionDetailsOf(null, snap([trip()])), []);
    assert.equal(amendSummaryOf(1, []), "Trip 1 changed");
  });
});
