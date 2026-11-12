// Usage: pnpm --filter @repo/db db:seed
//
// Creates the catalogue of vehicle classes a fresh database starts with,
// each with its models, and keeps the State and District rows in step with
// data/malaysia-districts.json. A vehicle class that already exists (by
// slug) is left alone, models and all: once seeded, ops owns it and edits it
// in the console. A
// district that already exists has only its name and state refreshed from
// the data file. Districts place an address; coverage is a location's
// zones, drawn in the console, as
// docs/261015-locations-as-operation-areas.md describes. Rates and rules are
// set per location on its Vehicle classes tab, so none are seeded. See
// docs/260930-coverage.md, docs/261018-location-work-and-class-catalogue.md
// and docs/261019-vehicles-and-drivers.md.
import { db } from "../src/client";
import { DISTRICT_DATA } from "../src/district-index";
import { classNameOf, classSlugOf } from "../src/vehicle-class-input";
import { CLASS_LIST } from "./class-list";

let classesCreated = 0;
let classesKept = 0;
const places = new Map<string, number>();
for (const { type, tier, models, ...fields } of CLASS_LIST) {
  const sortOrder = (places.get(fields.category) ?? 0) + 1;
  places.set(fields.category, sortOrder);
  const slug = classSlugOf({ type, tier });
  const existing = await db.vehicleClass.findUnique({ where: { slug } });
  if (existing) {
    classesKept += 1;
    continue;
  }
  await db.vehicleClass.create({
    data: {
      slug,
      name: classNameOf({ type, tier }),
      sortOrder,
      ...fields,
      type: {
        connectOrCreate: { where: { name: type }, create: { name: type } },
      },
      ...(tier
        ? {
            tier: {
              connectOrCreate: {
                where: { name: tier },
                create: { name: tier },
              },
            },
          }
        : {}),
      models: {
        create: models,
      },
    },
  });
  classesCreated += 1;
}

for (const { code, name } of DISTRICT_DATA.states) {
  await db.state.upsert({
    where: { code },
    update: { name },
    create: { code, name },
  });
}

let districtsCreated = 0;
for (const { code, name, stateCode } of DISTRICT_DATA.districts) {
  const existing = await db.district.findUnique({ where: { code } });
  if (existing) {
    if (existing.name !== name || existing.stateCode !== stateCode) {
      await db.district.update({ where: { code }, data: { name, stateCode } });
    }
    continue;
  }
  await db.district.create({
    data: { code, name, stateCode },
  });
  districtsCreated += 1;
}

console.log(
  `${CLASS_LIST.length} vehicle classes: ${classesCreated} created with their models, ${classesKept} already there.`,
);
console.log(
  `${DISTRICT_DATA.states.length} states and ${DISTRICT_DATA.districts.length} districts: ${districtsCreated} districts created, the rest refreshed.`,
);
await db.$disconnect();
