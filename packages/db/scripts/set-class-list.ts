// Usage: pnpm --filter @repo/db db:set-class-list
//
// Run once per database after the schema push of
// docs/261019-vehicles-and-drivers.md, and after db:migrate-offering-rules
// where that has not run yet. Brings the class catalogue to
// prisma/class-list.ts, Operation's seating table:
//
// - VIP coach becomes Coach VIP, slug coach-vip, keeping its offerings.
// - Each listed class takes the list's name, description, category, order,
//   seats and luggage; its picture and its switch stay. A class the database
//   lacks is created, on in the catalogue and sold nowhere yet.
// - Each listed class gets the list's models it lacks, with no photos.
// - Minibus and Midi coach are deleted with their offerings and zone rates.
//   One that a booking still uses is switched off instead, and named.
//
// The class and model changes are logged as the system's. Running it again
// changes nothing.
import { SYSTEM_ACTOR } from "../src/activity-actions";
import { db } from "../src/client";
import { createVehicleClass, updateVehicleClass } from "../src/vehicle-classes";
import { createVehicleModel } from "../src/vehicle-models";
import { CLASS_LIST } from "../prisma/class-list";

/** The slugs the list renames, old to new. */
const RENAMED: Record<string, string> = { "vip-coach": "coach-vip" };

/** The classes the list drops. */
const DROPPED = ["minibus", "midi-coach"];

/** Stops the script on a refusal, naming what was refused. */
function must<T extends { ok: true } | { ok: false; error: string }>(
  what: string,
  result: T,
): asserts result is Extract<T, { ok: true }> {
  if (!result.ok) throw new Error(`${what}: ${result.error}`);
}

for (const [from, to] of Object.entries(RENAMED)) {
  const [old, taken] = await Promise.all([
    db.vehicleClass.findUnique({ where: { slug: from } }),
    db.vehicleClass.findUnique({ where: { slug: to } }),
  ]);
  if (old && !taken) {
    await db.vehicleClass.update({ where: { id: old.id }, data: { slug: to } });
    console.log(`${old.name}: slug ${from} is now ${to}.`);
  }
}

for (const { slug, models, ...fields } of CLASS_LIST) {
  let vehicleClass = await db.vehicleClass.findUnique({ where: { slug } });
  if (vehicleClass) {
    const updated = await updateVehicleClass(
      SYSTEM_ACTOR,
      vehicleClass.id,
      fields,
    );
    must(slug, updated);
  } else {
    const created = await createVehicleClass(SYSTEM_ACTOR, {
      ...fields,
      imageUrl: null,
      isActive: true,
    });
    must(slug, created);
    vehicleClass = await db.vehicleClass.findUniqueOrThrow({
      where: { id: created.id },
    });
    if (vehicleClass.slug !== slug) {
      throw new Error(
        `${fields.name} was given the slug ${vehicleClass.slug}.`,
      );
    }
    console.log(
      `${fields.name}: created. Sell it at each location with its rates.`,
    );
  }

  const existing = new Set(
    (
      await db.vehicleModel.findMany({
        where: { vehicleClassId: vehicleClass.id },
        select: { name: true },
      })
    ).map((model) => model.name),
  );
  for (const [i, name] of models.entries()) {
    if (existing.has(name)) continue;
    const added = await createVehicleModel(SYSTEM_ACTOR, vehicleClass.id, {
      name,
      sortOrder: i + 1,
      isActive: true,
      photos: [],
    });
    must(`${slug}, ${name}`, added);
    console.log(`${fields.name}: added the model ${name}.`);
  }
}

for (const slug of DROPPED) {
  const dropped = await db.vehicleClass.findUnique({
    where: { slug },
    include: { _count: { select: { tripItems: true } } },
  });
  if (!dropped) continue;
  if (dropped._count.tripItems > 0) {
    if (dropped.isActive) {
      const off = await updateVehicleClass(SYSTEM_ACTOR, dropped.id, {
        isActive: false,
      });
      must(slug, off);
    }
    console.log(
      `${dropped.name}: ${dropped._count.tripItems} booking items use it, so it is switched off, not deleted.`,
    );
    continue;
  }
  const [rates, offerings] = await db.$transaction([
    db.zoneRate.deleteMany({ where: { vehicleClassId: dropped.id } }),
    db.locationVehicleClass.deleteMany({
      where: { vehicleClassId: dropped.id },
    }),
    db.vehicleModel.deleteMany({ where: { vehicleClassId: dropped.id } }),
    db.vehicleClass.delete({ where: { id: dropped.id } }),
  ]);
  console.log(
    `${dropped.name}: deleted, with ${offerings.count} offerings and ${rates.count} zone rates.`,
  );
}

await db.$disconnect();
console.log(
  `The catalogue holds the ${CLASS_LIST.length} classes of the list.`,
);
