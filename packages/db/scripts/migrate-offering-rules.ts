// Usage: pnpm --filter @repo/db db:migrate-offering-rules
//
// Run once per database after the schema push of
// docs/261018-location-work-and-class-catalogue.md, and after
// db:migrate-locations where that has not run yet, before the follow-up that
// drops the rule columns of `VehicleClass`. Each offering takes the three
// rules its class held: the notice, the cancellation cutoff and the minimum
// hours, so every location sells each class under the rules it had.
//
// An offering not copied yet holds the push's default of 0 minimum hours,
// which no saved offering can hold (the hourly floor is 3 hours), so running
// it again changes nothing.
import { db } from "../src/client";

const offerings = await db.locationVehicleClass.findMany({
  where: { minHourlyHours: 0 },
  select: {
    id: true,
    location: { select: { name: true } },
    vehicleClass: {
      select: {
        name: true,
        minLeadHours: true,
        cancellationCutoffHours: true,
        minHourlyHours: true,
      },
    },
  },
});

for (const { id, location, vehicleClass } of offerings) {
  const { minLeadHours, cancellationCutoffHours, minHourlyHours } =
    vehicleClass;
  await db.locationVehicleClass.update({
    where: { id },
    data: { minLeadHours, cancellationCutoffHours, minHourlyHours },
  });
  console.log(
    `${location.name}, ${vehicleClass.name}: notice ${minLeadHours} h, cancel up to ${cancellationCutoffHours} h, minimum ${minHourlyHours} h.`,
  );
}

await db.$disconnect();
console.log(`${offerings.length} offerings given their class's rules.`);
