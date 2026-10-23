// Usage: pnpm --filter @repo/db db:export-zones <slug>
//
// Writes the location's zones and its rate grid to data/zones/<slug>.json,
// for db:import-zones to add to another database: zones drawn and priced on
// the development database go to production so. Zones are named, classes
// by slug and a route out of the location by the other location's slug, so
// the file holds no id. Reads the database only.
import { db } from "../src/client";
import { writeZonesFile } from "./zones-file";

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: db:export-zones <slug>");
  process.exit(1);
}

const location = await db.location.findUnique({
  where: { slug },
  include: {
    zones: { orderBy: { sortOrder: "asc" } },
    zoneRates: {
      include: {
        fromZone: { select: { sortOrder: true, name: true } },
        toZone: {
          select: {
            sortOrder: true,
            name: true,
            location: { select: { slug: true } },
          },
        },
        vehicleClass: { select: { sortOrder: true, slug: true } },
      },
    },
  },
});
if (!location) {
  console.error(`No location has the slug ${slug}.`);
  process.exit(1);
}
const names = location.zones.map((zone) => zone.name);
const twice = names.filter((name, i) => names.indexOf(name) !== i);
if (twice.length > 0) {
  console.error(
    `${location.name} has more than one zone named ${[...new Set(twice)].join(", ")}, so its routes cannot be told apart by name. Rename them first.`,
  );
  process.exit(1);
}

// The grid's order: by the zone a route starts at, then the location's own
// zones before routes out of it, then the class.
const rates = [...location.zoneRates].sort(
  (a, b) =>
    a.fromZone.sortOrder - b.fromZone.sortOrder ||
    Number(a.toZone.location.slug !== slug) -
      Number(b.toZone.location.slug !== slug) ||
    a.toZone.location.slug.localeCompare(b.toZone.location.slug) ||
    a.toZone.sortOrder - b.toZone.sortOrder ||
    a.vehicleClass.sortOrder - b.vehicleClass.sortOrder,
);

const path = writeZonesFile({
  location: slug,
  exportedAt: new Date().toISOString(),
  zones: location.zones.map(({ name, shape, drawnFrom }) => ({
    name,
    shape,
    drawnFrom,
  })),
  rates: rates.map((rate) => ({
    from: rate.fromZone.name,
    to: rate.toZone.name,
    ...(rate.toZone.location.slug !== slug
      ? { toLocation: rate.toZone.location.slug }
      : {}),
    vehicleClass: rate.vehicleClass.slug,
    priceSen: rate.priceSen,
  })),
});
await db.$disconnect();
console.log(
  `Wrote ${path}: ${location.name}'s ${location.zones.length} zones and ${rates.length} cells of its grid.`,
);
