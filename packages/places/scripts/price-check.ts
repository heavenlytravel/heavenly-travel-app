// Usage: pnpm --filter @repo/places price:check [trip name ...]
//
// The live check of nearest-zone pricing: prices the named trips of
// packages/db/data/price-check.json with the website's own quote, the
// zones and the grid read from the database and the roads from Google, and
// prints a table, each trip's zones, distances and fare against what is
// expected. Exits 1 on any difference. Reads only: nothing is written, so
// it is safe during official testing. Needs GOOGLE_MAPS_SERVER_KEY
// (apps/web/.env.local) and DATABASE_URL (packages/db/.env); the package
// script loads both. Ops adds a row whenever a price is questioned; the
// same rows are Try a trip's examples. It lives here, beside
// check-coverage, because it needs Google's router, which @repo/db does
// not depend on. See docs/261023-nearest-zone-pricing.md, "Testing".
//
// The db modules are imported by path: the package entry carries
// `server-only`, which throws outside React, as the scripts in packages/db do.
import { localDateTimeInputs, pickupInstant } from "../../db/src/booking-rules";
import { isTripCategory } from "../../db/src/booking-status";
import { db } from "../../db/src/client";
import { formatMyr } from "../../db/src/money";
import { pinPlace } from "../../db/src/place";
import { PRICE_CHECKS, type PriceCheckEnd } from "../../db/src/price-check";
import { quoteTrip } from "../../db/src/transportation";
import { emptyTrace } from "../../db/src/zone-quote";
import { googleProvider } from "../src/google";
import { routingOf } from "../src/trip-request";

const DAY_MS = 24 * 60 * 60 * 1000;

const key = process.env.GOOGLE_MAPS_SERVER_KEY;
if (!key) {
  console.error(
    "GOOGLE_MAPS_SERVER_KEY is not set: the check needs Google's roads.",
  );
  process.exit(1);
}
const provider = googleProvider(key);
const routing = routingOf(provider);

const wanted = process.argv.slice(2);
const checks = wanted.length
  ? PRICE_CHECKS.filter((check) => wanted.includes(check.name))
  : PRICE_CHECKS;

const placeOf = (end: PriceCheckEnd) =>
  "placeId" in end ? provider.resolvePlace(end.placeId) : pinPlace(end);

// Tomorrow at 10:00, clear of any odd-hours window people set.
const startsAt = pickupInstant(
  localDateTimeInputs(new Date(Date.now() + DAY_MS)).date,
  "10:00",
)!;

type Row = {
  trip: string;
  zones: string;
  gridTrip: string;
  tripKm: string;
  fare: string;
  expected: string;
  calls: number;
  ok: boolean;
};
const rows: Row[] = [];
let calls = 0;

for (const check of checks) {
  const [location, vehicleClass, pickup, dropoff] = await Promise.all([
    db.location.findUnique({
      where: { slug: check.location },
      select: { id: true },
    }),
    db.vehicleClass.findUnique({
      where: { slug: check.class },
      select: { id: true, category: true },
    }),
    placeOf(check.pickup),
    placeOf(check.dropoff),
  ]);
  const row: Row = {
    trip: check.name,
    zones: "",
    gridTrip: "",
    tripKm: "",
    fare: "",
    expected:
      check.expected === null
        ? "-"
        : "totalSen" in check.expected
          ? formatMyr(check.expected.totalSen)
          : check.expected.refused,
    calls: 0,
    ok: true,
  };
  rows.push(row);
  if (!location || !vehicleClass || !isTripCategory(vehicleClass.category)) {
    row.fare = `no ${location ? `class ${check.class}` : `location ${check.location}`}`;
    row.ok = false;
    continue;
  }
  if (!pickup || !dropoff) {
    row.fare = "Google did not return a place";
    row.ok = false;
    continue;
  }
  const trace = emptyTrace();
  const quoted = await quoteTrip(
    vehicleClass.category,
    { mode: "oneway", pickup, dropoff, startsAt, hours: null },
    routing,
    { locationId: location.id, trace },
  );
  row.calls = trace.calls;
  calls += trace.calls;
  if (!quoted.ok) {
    row.fare = `${quoted.error.code}${quoted.error.reason ? ` (${quoted.error.reason})` : ""}`;
    row.ok =
      check.expected === null ||
      ("refused" in check.expected &&
        check.expected.refused === quoted.error.code);
    continue;
  }
  const { quote } = quoted;
  const measure = quote.zoneTrip;
  const end = (zone: string, extraKm: number | null) =>
    extraKm === null ? zone : `${zone} +${extraKm.toFixed(2)} km`;
  row.zones = `${end(quote.pickup.zone, quote.pickup.nearest?.extraKm ?? null)} > ${end(quote.dropoff!.zone, quote.dropoff!.nearest?.extraKm ?? null)}`;
  row.gridTrip = measure ? `${measure.gridTripKm.toFixed(2)} km` : "-";
  row.tripKm = measure ? `${measure.tripKm.toFixed(2)} km` : "-";
  const price = quote.classes.find(
    (c) => c.vehicleClass.id === vehicleClass.id,
  )?.price;
  row.fare = price ? formatMyr(price.totalSen) : "not offered";
  row.ok =
    check.expected === null ||
    ("totalSen" in check.expected &&
      price?.totalSen === check.expected.totalSen);
}

console.table(
  rows.map((row) => ({
    Trip: row.trip,
    Zones: row.zones,
    "Grid trip km": row.gridTrip,
    "Trip km": row.tripKm,
    Fare: row.fare,
    Expected: row.expected,
    Calls: row.calls,
    "": row.ok ? "ok" : "DIFFERS",
  })),
);
console.log(
  `${calls} route calls, about US$${(calls * 0.005).toFixed(3)} past Google's free allowance.`,
);
await db.$disconnect();
const differences = rows.filter((row) => !row.ok).length;
if (differences > 0) {
  console.error(`${differences} of ${rows.length} trips differ.`);
  process.exit(1);
}
