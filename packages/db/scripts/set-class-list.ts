// Usage: pnpm --filter @repo/db db:set-class-list [-- --dry-run]
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
// - A model named before brands were kept, "Toyota Alphard", is split at
//   its first space into the brand Toyota and the model Alphard. Its name
//   on screen stays the same, so this is not logged.
// - Each listed class gets the list's models it lacks.
// - Minibus and Midi coach are deleted with their offerings, zone rates and
//   models. One that a booking, a vehicle or a driver still has is switched
//   off instead, and named. The console never deletes a class, so these
//   deletes are reported here and not in any History.
//
// With --dry-run it reads the database and prints every change it would
// make, writing nothing: run it so first against production. The class and
// model changes are logged as the system's. Running it again changes
// nothing.
import { SYSTEM_ACTOR } from "../src/activity-actions";
import { db } from "../src/client";
import { createVehicleClass, updateVehicleClass } from "../src/vehicle-classes";
import { modelName, sameName } from "../src/vehicle-model-input";
import { modelFor } from "../src/vehicle-models";
import { CLASS_LIST } from "../prisma/class-list";

/** The slugs the list renames, old to new. */
const RENAMED: Record<string, string> = { "vip-coach": "coach-vip" };

/** The classes the list drops. */
const DROPPED = ["minibus", "midi-coach"];

const DRY_RUN = process.argv.includes("--dry-run");

/** Prints a change, as made or as it would be. */
function report(change: string) {
  console.log(DRY_RUN ? `Would: ${change}` : change);
}

/** Stops the script on a refusal, naming what was refused. */
function must<T extends { ok: true } | { ok: false; error: string }>(
  what: string,
  result: T,
): asserts result is Extract<T, { ok: true }> {
  if (!result.ok) throw new Error(`${what}: ${result.error}`);
}

if (DRY_RUN) console.log("Dry run: nothing is written.");

for (const [from, to] of Object.entries(RENAMED)) {
  const [old, taken] = await Promise.all([
    db.vehicleClass.findUnique({ where: { slug: from } }),
    db.vehicleClass.findUnique({ where: { slug: to } }),
  ]);
  if (old && taken) {
    console.log(
      `${old.name} (${from}) and ${taken.name} (${to}) both exist, so the slug is not moved. Move what ${old.name} sells to ${taken.name}, then switch ${old.name} off.`,
    );
  } else if (old) {
    if (!DRY_RUN) {
      await db.vehicleClass.update({
        where: { id: old.id },
        data: { slug: to },
      });
    }
    report(`${old.name}: slug ${from} is now ${to}.`);
  }
}

for (const model of await db.vehicleModel.findMany({ where: { brand: "" } })) {
  const at = model.name.indexOf(" ");
  if (at < 0) {
    console.log(
      `${model.name}: one word, so no brand. Edit its vehicles to give them one.`,
    );
    continue;
  }
  const brand = model.name.slice(0, at);
  const name = model.name.slice(at + 1);
  if (!DRY_RUN) {
    await db.vehicleModel.update({
      where: { id: model.id },
      data: { brand, name },
    });
  }
  report(`${model.name}: the brand ${brand}, the model ${name}.`);
}

for (const { slug, models, ...fields } of CLASS_LIST) {
  let vehicleClass = await db.vehicleClass.findUnique({ where: { slug } });
  if (vehicleClass) {
    if (!DRY_RUN) {
      const updated = await updateVehicleClass(
        SYSTEM_ACTOR,
        vehicleClass.id,
        fields,
      );
      must(slug, updated);
    }
  } else if (DRY_RUN) {
    report(
      `${fields.name}: created, with the models ${models.map(modelName).join(", ")}.`,
    );
    continue;
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
    report(`${fields.name}: created. Sell it at each location with its rates.`);
  }

  const vehicleClassId = vehicleClass.id;
  const existing = await db.vehicleModel.findMany({
    where: { vehicleClassId },
    select: { brand: true, name: true },
  });
  for (const model of models) {
    const there = existing.some(
      (m) => sameName(m.brand, model.brand) && sameName(m.name, model.name),
    );
    if (there) continue;
    if (!DRY_RUN) {
      const added = await db.$transaction((tx) =>
        modelFor(tx, SYSTEM_ACTOR, { vehicleClassId, ...model }),
      );
      must(`${slug}, ${modelName(model)}`, added);
    }
    report(`${fields.name}: added the model ${modelName(model)}.`);
  }
}

for (const slug of DROPPED) {
  const dropped = await db.vehicleClass.findUnique({
    where: { slug },
    include: {
      _count: { select: { tripItems: true, drivers: true } },
      models: { select: { _count: { select: { vehicles: true } } } },
    },
  });
  if (!dropped) continue;
  const vehicles = dropped.models.reduce(
    (sum, model) => sum + model._count.vehicles,
    0,
  );
  const { tripItems, drivers } = dropped._count;
  if (tripItems > 0 || vehicles > 0 || drivers > 0) {
    if (dropped.isActive && !DRY_RUN) {
      const off = await updateVehicleClass(SYSTEM_ACTOR, dropped.id, {
        isActive: false,
      });
      must(slug, off);
    }
    report(
      `${dropped.name}: ${tripItems} booking items, ${vehicles} vehicles and ${drivers} drivers have it, so it is switched off, not deleted.`,
    );
    continue;
  }
  const [rates, offerings, models] = await Promise.all([
    db.zoneRate.count({ where: { vehicleClassId: dropped.id } }),
    db.locationVehicleClass.count({ where: { vehicleClassId: dropped.id } }),
    db.vehicleModel.count({ where: { vehicleClassId: dropped.id } }),
  ]);
  if (!DRY_RUN) {
    await db.$transaction([
      db.zoneRate.deleteMany({ where: { vehicleClassId: dropped.id } }),
      db.locationVehicleClass.deleteMany({
        where: { vehicleClassId: dropped.id },
      }),
      db.vehicleModel.deleteMany({ where: { vehicleClassId: dropped.id } }),
      db.vehicleClass.delete({ where: { id: dropped.id } }),
    ]);
  }
  report(
    `${dropped.name}: deleted, with ${offerings} offerings, ${rates} zone rates and ${models} models.`,
  );
}

await db.$disconnect();
console.log(
  DRY_RUN
    ? "Dry run done. Run it again without --dry-run to make these changes."
    : `The catalogue holds the ${CLASS_LIST.length} classes of the list.`,
);
