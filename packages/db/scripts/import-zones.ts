// Usage: pnpm --filter @repo/db db:import-zones <slug> [--dry-run]
//        pnpm --filter @repo/db db:import-zones:prod <slug> [--dry-run]
//
// Adds the zones in data/zones/<slug>.json, as db:export-zones wrote them
// from another database, to the location with the slug: zones drawn on the
// development database go to production so. Rates are not copied.
//
// - A zone the location already has, by name, is left as it is, its shape
//   too. The others are added after the location's own, in the file's
//   order, as the console adds them.
// - A zone added may not overlap any zone there, the location's or another
//   location's: trim or delete the zones in its way in the console first.
//   The file's zones come from one database, so they never overlap one
//   another.
//
// Everything is checked before anything is written; on any problem
// nothing is, and each problem is named. With --dry-run it reads the
// database and prints every change it would make, writing nothing: run it
// so first against production. The zones are logged as the system's. The
// customer site's pages catch up within the hour. Running it again changes
// nothing.
import { SYSTEM_ACTOR } from "../src/activity-actions";
import { db } from "../src/client";
import {
  parseZoneFields,
  ZONE_LIMITS,
  type ZoneFields,
} from "../src/rates-input";
import { checkOverlaps, createZone } from "../src/zones";
import { readZonesFile } from "./zones-file";

const DRY_RUN = process.argv.includes("--dry-run");
const slug = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
if (!slug) {
  console.error("Usage: db:import-zones <slug> [--dry-run]");
  process.exit(1);
}
const file = readZonesFile(slug);

/** Prints a change, as made or as it would be. */
function report(change: string) {
  console.log(DRY_RUN ? `Would: ${change}` : change);
}

/** Names what stops the import, and stops it before anything is written. */
function stop(problems: readonly string[]): never {
  console.error(
    `Nothing was written:\n${[...new Set(problems)].map((problem) => `- ${problem}`).join("\n")}`,
  );
  process.exit(1);
}

if (DRY_RUN) console.log("Dry run: nothing is written.");

const location = await db.location.findUnique({
  where: { slug },
  include: { zones: { orderBy: { sortOrder: "asc" } } },
});
if (!location) {
  stop([`No location has the slug ${slug}. Add it in the console first.`]);
}

const problems: string[] = [];

const zones: ZoneFields[] = [];
for (const zone of file.zones) {
  const parsed = parseZoneFields(zone);
  if (parsed.ok) zones.push(parsed.value);
  else problems.push(`The zone ${zone.name}: ${parsed.error}`);
}
const names = [
  ...location.zones.map((zone) => zone.name),
  ...zones.map((zone) => zone.name),
];
const twice = names.filter((name, i) => names.indexOf(name) !== i);
const there = new Map(location.zones.map((zone) => [zone.name, zone]));
for (const name of new Set(twice)) {
  // A zone already there is matched by name; one there twice cannot be.
  if (location.zones.filter((zone) => zone.name === name).length > 1) {
    problems.push(
      `${location.name} has more than one zone named ${name}. Rename them in the console first.`,
    );
  } else if (!there.has(name)) {
    problems.push(`The file has more than one zone named ${name}.`);
  }
}

const added = zones.filter((zone) => !there.has(zone.name));
if (location.zones.length + added.length > ZONE_LIMITS.zones) {
  problems.push(
    `${location.name} would have ${location.zones.length + added.length} zones; a location keeps at most ${ZONE_LIMITS.zones}.`,
  );
}
for (const zone of added) {
  const { zones: inTheWay } = await checkOverlaps(location.id, zone.shape);
  if (inTheWay.length > 0) {
    problems.push(
      `${zone.name} overlaps ${inTheWay.map((other) => other.label).join(", ")}. Trim or delete what is in its way in the console first.`,
    );
  }
}
if (problems.length > 0) stop(problems);

for (const zone of zones) {
  const same = there.get(zone.name);
  if (!same) continue;
  console.log(
    JSON.stringify(same.shape) === JSON.stringify(zone.shape)
      ? `${zone.name}: already there, left as it is.`
      : `${zone.name}: already there with another shape, left as it is.`,
  );
}

for (const zone of added) {
  if (!DRY_RUN) {
    const created = await createZone(SYSTEM_ACTOR, location.id, zone);
    if (!created.ok) throw new Error(`${zone.name}: ${created.error}`);
  }
  report(`${zone.name}: added.`);
}

await db.$disconnect();
console.log(
  DRY_RUN
    ? `Dry run done: ${added.length} zones to add. Run it again without --dry-run to add them.`
    : `${location.name}: ${added.length} zones added. The customer site catches up within the hour.`,
);
