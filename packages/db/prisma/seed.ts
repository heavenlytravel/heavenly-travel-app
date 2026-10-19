// Usage: pnpm --filter @repo/db db:seed
//
// Creates the catalogue of vehicle classes a fresh database starts with, and
// keeps the State and District rows in step with data/malaysia-districts.json.
// A vehicle class that already exists (by slug) is left alone: once seeded,
// ops owns it and edits it in the console. A district that already exists
// has only its name and state refreshed from the data file. Districts place
// an address; coverage is a location's zones, drawn in the console, as
// docs/261015-locations-as-operation-areas.md describes. Rates and rules
// are set per location on its Vehicle classes tab, so none are seeded. See
// docs/260930-coverage.md, docs/260930-ops-screens.md and
// docs/261018-location-work-and-class-catalogue.md.
import type { TripCategory } from "../src/booking-status";
import { db } from "../src/client";
import { DISTRICT_DATA } from "../src/district-index";

const CAR: { category: TripCategory } = { category: "car-with-driver" };
const COACH: { category: TripCategory } = { category: "coach-charter" };

const VEHICLE_CLASSES = [
  {
    ...CAR,
    slug: "sedan",
    name: "Executive sedan",
    description:
      "Up to 3 passengers and 2 large bags. Meet and greet included.",
    sortOrder: 1,
    minPassengers: 1,
    maxPassengers: 3,
    luggage: "2 large bags",
  },
  {
    ...CAR,
    slug: "mpv",
    name: "Premium MPV",
    description:
      "Up to 6 passengers and 5 large bags. Captain seats, USB charging.",
    sortOrder: 2,
    minPassengers: 1,
    maxPassengers: 6,
    luggage: "5 large bags",
  },
  {
    ...CAR,
    slug: "van",
    name: "Passenger van",
    description: "Up to 10 passengers and 8 large bags. Same driver all trip.",
    sortOrder: 3,
    minPassengers: 1,
    maxPassengers: 10,
    luggage: "8 large bags",
  },
  {
    ...COACH,
    slug: "minibus",
    name: "Minibus",
    description:
      "15 to 24 passengers, such as a Toyota Coaster. Luggage space at the back.",
    sortOrder: 1,
    minPassengers: 15,
    maxPassengers: 24,
    luggage: "15 large bags",
  },
  {
    ...COACH,
    slug: "midi-coach",
    name: "Midi coach",
    description:
      "25 to 30 passengers, such as a Mitsubishi Rosa or Hino. Luggage hold.",
    sortOrder: 2,
    minPassengers: 25,
    maxPassengers: 30,
    luggage: "25 large bags",
  },
  {
    ...COACH,
    slug: "coach",
    name: "Coach",
    description:
      "31 to 44 passengers, such as a Scania or Volvo 44-seater. Full luggage hold.",
    sortOrder: 3,
    minPassengers: 31,
    maxPassengers: 44,
    luggage: "40 large bags",
  },
  {
    ...COACH,
    slug: "vip-coach",
    name: "VIP coach",
    description:
      "15 to 27 passengers in wide executive seats. For corporate groups.",
    sortOrder: 4,
    minPassengers: 15,
    maxPassengers: 27,
    luggage: "25 large bags",
  },
];

let classesCreated = 0;
let classesKept = 0;
for (const { slug, ...fields } of VEHICLE_CLASSES) {
  const existing = await db.vehicleClass.findUnique({ where: { slug } });
  if (existing) {
    classesKept += 1;
    continue;
  }
  await db.vehicleClass.create({ data: { slug, ...fields } });
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
  `${VEHICLE_CLASSES.length} vehicle classes: ${classesCreated} created, ${classesKept} already there.`,
);
console.log(
  `${DISTRICT_DATA.states.length} states and ${DISTRICT_DATA.districts.length} districts: ${districtsCreated} districts created, the rest refreshed.`,
);
await db.$disconnect();
