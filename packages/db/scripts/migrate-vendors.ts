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

  // In SQL, so the script runs the same on the schema that makes the
  // vendor required, from main after the deploy, where the client cannot
  // ask for a null vendor.
  const unowned = await tx.$queryRaw<{ locationId: string }[]>`
    SELECT "locationId" FROM "Vehicle" WHERE "vendorId" IS NULL
    UNION
    SELECT "locationId" FROM "Driver" WHERE "vendorId" IS NULL`;
  const locationIds = unowned.map((r) => r.locationId);
  if (locationIds.length > 0) {
    await tx.vendor.update({
      where: { id: ours.id },
      data: { locations: { connect: locationIds.map((id) => ({ id })) } },
    });
  }
  const vehicles = await tx.$executeRaw`
    UPDATE "Vehicle" SET "vendorId" = ${ours.id} WHERE "vendorId" IS NULL`;
  const drivers = await tx.$executeRaw`
    UPDATE "Driver" SET "vendorId" = ${ours.id} WHERE "vendorId" IS NULL`;
  return {
    ours,
    made,
    vehicles,
    drivers,
    locations: locationIds.length,
  };
});

await db.$disconnect();
console.log(
  `${summary.made ? "Made" : "Found"} ${summary.ours.name} as ours. Gave it ${summary.vehicles} vehicles and ${summary.drivers} drivers without a vendor, and ${summary.locations} locations they are based at.`,
);
