// Usage: pnpm --filter @repo/db db:import-zones <slug> [--dry-run]
//        pnpm --filter @repo/db db:import-zones:prod <slug> [--dry-run]
//
// Adds the zones and the rate grid in data/zones/<slug>.json, as
// db:export-zones wrote them from another database, to the location with
// the slug: zones drawn and priced on the development database go to
// production so.
//
// - A zone the location already has, by name, is left as it is, its shape
//   too. The others are added after the location's own, in the file's
//   order, as the console adds them.
// - A zone added may not overlap any zone there, the location's or another
//   location's: trim or delete the zones in its way in the console first.
//   The file's zones come from one database, so they never overlap one
//   another.
// - Each class is found by slug and must be one the location offers. A
//   route out of the location ends at the other location's zone by name.
// - Each cell of the grid the file names takes the file's price. A cell it
//   does not name is left alone, so nothing is deleted.
//
// Everything is checked before anything is written; on any problem
// nothing is, and each problem is named. With --dry-run it reads the
// database and prints every change it would make, writing nothing: run it
// so first against production. The zones and the grid are logged as the
// system's. The customer site's pages catch up within the hour. Running it
// again changes nothing.
import { SYSTEM_ACTOR } from "../src/activity-actions";
import { db } from "../src/client";
import { formatMyr } from "../src/money";
import {
  dropoffRuleOf,
  parseZoneFields,
  ZONE_LIMITS,
  type ZoneFields,
} from "../src/rates-input";
import { checkOverlaps, createZone, setZoneRates } from "../src/zones";
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

/** Stops the script on a refusal, naming what was refused. */
function must<T extends { ok: true } | { ok: false; error: string }>(
  what: string,
  result: T,
): asserts result is Extract<T, { ok: true }> {
  if (!result.ok) throw new Error(`${what}: ${result.error}`);
}

/** A cell of the grid by names, the same for the file and the database. */
function cellKey(cell: {
  from: string;
  to: string;
  toLocation?: string;
  vehicleClass: string;
}) {
  return [cell.from, cell.toLocation ?? "", cell.to, cell.vehicleClass].join(
    "|",
  );
}

if (DRY_RUN) console.log("Dry run: nothing is written.");

const location = await db.location.findUnique({
  where: { slug },
  include: {
    zones: { orderBy: { sortOrder: "asc" } },
    offerings: { include: { vehicleClass: true } },
    zoneRates: {
      include: {
        fromZone: { select: { name: true } },
        toZone: {
          select: { name: true, location: { select: { slug: true } } },
        },
        vehicleClass: { select: { slug: true } },
      },
    },
  },
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
const ownNames = [
  ...location.zones.map((zone) => zone.name),
  ...zones.map((zone) => zone.name),
];
const twice = ownNames.filter((name, i) => ownNames.indexOf(name) !== i);
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

const classes = new Map(
  location.offerings.map(({ vehicleClass }) => [
    vehicleClass.slug,
    vehicleClass,
  ]),
);
const elsewhere = await db.zone.findMany({
  where: {
    location: {
      slug: {
        in: [...new Set(file.rates.flatMap((rate) => rate.toLocation ?? []))],
      },
    },
  },
  select: { id: true, name: true, location: { select: { slug: true } } },
});
const farZone = new Map(
  elsewhere.map((zone) => [`${zone.location.slug}|${zone.name}`, zone]),
);
const stored = new Map(
  location.zoneRates.map((rate) => [
    cellKey({
      from: rate.fromZone.name,
      to: rate.toZone.name,
      toLocation:
        rate.toZone.location.slug === slug
          ? undefined
          : rate.toZone.location.slug,
      vehicleClass: rate.vehicleClass.slug,
    }),
    rate.priceSen,
  ]),
);
const keptInside = dropoffRuleOf(location) === "zones";
for (const rate of file.rates) {
  for (const name of [rate.from, ...(rate.toLocation ? [] : [rate.to])]) {
    if (!ownNames.includes(name)) {
      problems.push(
        `A route names ${name}, which is neither in the file nor one of ${location.name}'s zones.`,
      );
    }
  }
  if (rate.toLocation && !farZone.has(`${rate.toLocation}|${rate.to}`)) {
    problems.push(
      `A route ends at ${rate.to} of ${rate.toLocation}, which has no zone so named.`,
    );
  }
  if (rate.toLocation && keptInside && !stored.has(cellKey(rate))) {
    problems.push(
      `${location.name} keeps drop-offs inside it, so its routes cannot end at another location's zone. Change its drop-off rule first.`,
    );
  }
  if (!classes.has(rate.vehicleClass)) {
    problems.push(
      `${location.name} does not offer the class ${rate.vehicleClass}. Add it on its Vehicle classes tab first.`,
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

const ids = new Map(location.zones.map((zone) => [zone.name, zone.id]));
for (const zone of added) {
  if (!DRY_RUN) {
    const created = await createZone(SYSTEM_ACTOR, location.id, zone);
    must(zone.name, created);
    ids.set(zone.name, created.id);
  }
  report(`${zone.name}: added.`);
}

const changed = file.rates.filter(
  (rate) => stored.get(cellKey(rate)) !== rate.priceSen,
);
for (const rate of changed) {
  const was = stored.get(cellKey(rate));
  report(
    `${rate.from} to ${rate.to}${rate.toLocation ? ` (${rate.toLocation})` : ""}, ${classes.get(rate.vehicleClass)!.name}: set to ${formatMyr(rate.priceSen)}${was === undefined ? "" : `, was ${formatMyr(was)}`}.`,
  );
}
if (!DRY_RUN && changed.length > 0) {
  const priced = await setZoneRates(
    SYSTEM_ACTOR,
    location.id,
    changed.map((rate) => ({
      fromZoneId: ids.get(rate.from)!,
      toZoneId: rate.toLocation
        ? farZone.get(`${rate.toLocation}|${rate.to}`)!.id
        : ids.get(rate.to)!,
      vehicleClassId: classes.get(rate.vehicleClass)!.id,
      priceSen: rate.priceSen,
    })),
  );
  must("The grid", priced);
}

await db.$disconnect();
console.log(
  DRY_RUN
    ? `Dry run done: ${added.length} zones and ${changed.length} cells of the grid to add or change. Run it again without --dry-run to make these changes.`
    : `${location.name}: ${added.length} zones added, ${changed.length} cells of the grid set. The customer site catches up within the hour.`,
);
