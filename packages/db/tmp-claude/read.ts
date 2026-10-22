import { db } from "../src/client";
const loc = await db.location.findUnique({
  where: { slug: "langkawi" },
  include: {
    zones: { select: { id: true, name: true, sortOrder: true }, orderBy: { sortOrder: "asc" } },
    offerings: { select: { id: true, isActive: true, vehicleClass: { select: { id: true, name: true, slug: true, category: true, isActive: true } } } },
    zoneRates: true,
  },
});
console.log(JSON.stringify({ id: loc?.id, state: loc?.state, dropoffRule: loc?.dropoffRule, odd: [loc?.oddHoursFromMinute, loc?.oddHoursToMinute, loc?.oddHoursPercent, loc?.oddHoursFlatSen], zones: loc?.zones, offerings: loc?.offerings, rates: loc?.zoneRates.length }, null, 1));
console.log(JSON.stringify(await db.vehicleClass.findMany({ select: { id: true, name: true, slug: true, category: true, isActive: true } })));
