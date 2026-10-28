// Usage: pnpm --filter @repo/db db:migrate-vendors
//
// Run on each database after the first schema push of
// docs/261028-fulfilment-vendors-and-connect.md, before the merge, and again
// after the deploy, before the push that makes a vehicle's and a driver's
// vendor required. Makes Heavenly Travel a vendor, ours and active, when no
// vendor is ours yet, and gives it every vehicle and driver without a
// vendor, and every location one of them is based at. Run again, it finds
// ours by the switch and only moves what was added meanwhile, so it changes
// nothing the second time if nothing was.
import { db } from "../src/client";
import { SYSTEM_ACTOR } from "../src/activity-actions";
import { logActivity } from "../src/activity";

const HEAVENLY = {
  name: "Heavenly Travel",
  kind: "company",
  contactName: "Operation",
  contactPhone: "",
  contactEmail: "operation@heavenlytravel.my",
} as const;

const summary = await db.$transaction(async (tx) => {
  let ours = await tx.vendor.findFirst({
    where: { isOurs: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
  const made = !ours;
  if (!ours) {
    ours = await tx.vendor.create({
      data: {
        ...HEAVENLY,
        isOurs: true,
        status: "active",
        services: ["car-with-driver", "coach-charter", "driver"],
      },
      select: { id: true, name: true },
    });
    await logActivity(tx, SYSTEM_ACTOR, {
      action: "vendor.created",
      entityId: ours.id,
      after: { ...HEAVENLY, status: "active", isOurs: true },
    });
  }

  const where = { vendorId: null };
  const [vehicleLocations, driverLocations] = await Promise.all([
    tx.vehicle.findMany({ where, select: { locationId: true } }),
    tx.driver.findMany({ where, select: { locationId: true } }),
  ]);
  const locationIds = [
    ...new Set(
      [...vehicleLocations, ...driverLocations].map((r) => r.locationId),
    ),
  ];
  if (locationIds.length > 0) {
    await tx.vendor.update({
      where: { id: ours.id },
      data: { locations: { connect: locationIds.map((id) => ({ id })) } },
    });
  }
  const vehicles = await tx.vehicle.updateMany({
    where,
    data: { vendorId: ours.id },
  });
  const drivers = await tx.driver.updateMany({
    where,
    data: { vendorId: ours.id },
  });
  return {
    ours,
    made,
    vehicles: vehicles.count,
    drivers: drivers.count,
    locations: locationIds.length,
  };
});

await db.$disconnect();
console.log(
  `${summary.made ? "Made" : "Found"} ${summary.ours.name} as ours. Gave it ${summary.vehicles} vehicles and ${summary.drivers} drivers without a vendor, and ${summary.locations} locations they are based at.`,
);
