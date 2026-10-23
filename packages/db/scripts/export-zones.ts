// Usage: pnpm --filter @repo/db db:export-zones <slug>
//
// Writes the location's zones to data/zones/<slug>.json, for
// db:import-zones to add to another database: zones drawn on the
// development database go to production so. Zones are named, so the file
// holds no id. Reads the database only.
import { db } from "../src/client";
import { writeZonesFile } from "./zones-file";

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: db:export-zones <slug>");
  process.exit(1);
}

const location = await db.location.findUnique({
  where: { slug },
  include: { zones: { orderBy: { sortOrder: "asc" } } },
});
if (!location) {
  console.error(`No location has the slug ${slug}.`);
  process.exit(1);
}
const names = location.zones.map((zone) => zone.name);
const twice = names.filter((name, i) => names.indexOf(name) !== i);
if (twice.length > 0) {
  console.error(
    `${location.name} has more than one zone named ${[...new Set(twice)].join(", ")}, so the import could not tell them apart. Rename them first.`,
  );
  process.exit(1);
}

const path = writeZonesFile({
  location: slug,
  exportedAt: new Date().toISOString(),
  zones: location.zones.map(({ name, shape, drawnFrom }) => ({
    name,
    shape,
    drawnFrom,
  })),
});
await db.$disconnect();
console.log(
  `Wrote ${path}: ${location.name}'s ${location.zones.length} zones.`,
);
