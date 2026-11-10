// Usage: pnpm --filter @repo/db db:set-vendor-service [-- --dry-run]
//
// Run once per database right before the merge that makes a vendor offer
// exactly one thing (docs/261028-fulfilment-vendors-and-connect.md, "A
// vendor offers exactly one thing"), after db:set-billing, which moves the
// agents out: a vendor still offering "agent" is left for it, and listed.
// Each vendor's old ticks become its one service:
//
// - a vehicle and a driver (car with driver or coach charter, which ran
//   both, or self-drive with driver only): vehicle and driver;
// - self-drive alone: vehicle only; driver only alone: driver only;
// - otherwise tour guide, then attraction, then accommodation.
//
// A vendor whose other ticks lose (a tour guide beside transport, say) is
// listed for staff to review, as is one with none, which is left empty
// for staff to choose on its page. A vendor with one service already is
// skipped, so it changes nothing the second time. With --dry-run it prints
// what it would do and writes nothing.
import { logActivity } from "../src/activity";
import { SYSTEM_ACTOR } from "../src/activity-actions";
import { db } from "../src/client";
import {
  isVendorService,
  VENDOR_SERVICE_LABELS,
  VENDOR_SERVICES,
  type VendorService,
} from "../src/vendor-input";

const DRY_RUN = process.argv.includes("--dry-run");
const say = (line: string) => console.log(DRY_RUN ? `[dry run] ${line}` : line);

/** The ticks that ran a vehicle, and those that ran a driver. */
const VEHICLE = [
  "car-with-driver",
  "coach-charter",
  "self-drive",
  "vehicle",
  "vehicle-driver",
];
const DRIVER = ["car-with-driver", "coach-charter", "driver", "vehicle-driver"];

/** The one service the old ticks become, and the ticks that lose. */
function serviceOf(ticks: readonly string[]): {
  service: VendorService | null;
  dropped: string[];
} {
  const vehicle = ticks.some((t) => VEHICLE.includes(t));
  const driver = ticks.some((t) => DRIVER.includes(t));
  const transport: VendorService | null =
    vehicle && driver
      ? "vehicle-driver"
      : vehicle
        ? "vehicle"
        : driver
          ? "driver"
          : null;
  const service =
    transport ??
    VENDOR_SERVICES.find((s) => ticks.includes(s) && !VEHICLE.includes(s)) ??
    null;
  const kept: string[] = transport
    ? [...VEHICLE, ...DRIVER]
    : service
      ? [service]
      : [];
  return { service, dropped: ticks.filter((t) => !kept.includes(t)) };
}

const vendors = await db.vendor.findMany({
  orderBy: { name: "asc" },
  select: { id: true, name: true, services: true },
});
const review: string[] = [];
let changed = 0;
for (const vendor of vendors) {
  const ticks = vendor.services;
  if (ticks.length === 1 && isVendorService(ticks[0])) continue;
  if (ticks.includes("agent")) {
    review.push(
      `${vendor.name}: still offers "agent"; run db:set-billing first.`,
    );
    continue;
  }
  const { service, dropped } = serviceOf(ticks);
  if (!service) {
    review.push(
      `${vendor.name}: nothing it offers maps (${ticks.join(", ") || "none"}); left empty for staff to choose.`,
    );
    continue;
  }
  if (dropped.length > 0) {
    review.push(
      `${vendor.name}: ${VENDOR_SERVICE_LABELS[service]}, so ${dropped.join(", ")} went.`,
    );
  }
  say(
    `${vendor.name}: ${ticks.join(", ")} -> ${VENDOR_SERVICE_LABELS[service]}.`,
  );
  changed += 1;
  if (!DRY_RUN) {
    await db.$transaction(async (tx) => {
      await tx.vendor.update({
        where: { id: vendor.id },
        data: { services: [service] },
      });
      await logActivity(tx, SYSTEM_ACTOR, {
        action: "vendor.updated",
        entityId: vendor.id,
        before: { services: ticks },
        after: { services: [service] },
      });
    });
  }
}

await db.$disconnect();
say(`${changed} of ${vendors.length} vendors given their one service.`);
if (review.length > 0) {
  console.log(`For staff to review on each vendor's page:`);
  for (const line of review) console.log(`  ${line}`);
}
