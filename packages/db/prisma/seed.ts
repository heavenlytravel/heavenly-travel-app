// Usage: pnpm --filter @repo/db db:seed
//
// Creates the vehicle classes a fresh database starts with, and keeps the
// State and District rows in step with data/malaysia-districts.json. A
// vehicle class that already exists (by slug) is left alone, rates included:
// once seeded, ops owns it and edits it in the console. A state or district
// that already exists keeps its multiplier and its switch; only its name and
// state are refreshed from the data file. A district created here starts on
// when it is in the list below, the coverage the site launched with.
//
// Rates and the coach rules are placeholders until ops confirms them. See
// docs/260930-coverage.md and docs/260930-ops-screens.md.
import { CATEGORY_RULE_DEFAULTS } from "../src/booking-rules";
import type { TripCategory } from "../src/booking-status";
import { db } from "../src/client";
import { DISTRICT_DATA } from "../src/district-index";

/** Each category with its usual rules; a class may differ, it is only a row. */
const rulesOf = (category: TripCategory) => ({
  category,
  ...CATEGORY_RULE_DEFAULTS[category],
});
const CAR_RULES = rulesOf("car-with-driver");
const COACH_RULES = rulesOf("coach-charter");

const VEHICLE_CLASSES = [
  {
    ...CAR_RULES,
    slug: "sedan",
    name: "Executive sedan",
    description:
      "Up to 3 passengers and 2 large bags. Meet and greet included.",
    sortOrder: 1,
    minPassengers: 1,
    maxPassengers: 3,
    luggage: "2 large bags",
    baseFareSen: 3_000,
    perKmSen: 180,
    hourlyRateSen: 6_000,
    minimumFareSen: 6_000,
  },
  {
    ...CAR_RULES,
    slug: "mpv",
    name: "Premium MPV",
    description:
      "Up to 6 passengers and 5 large bags. Captain seats, USB charging.",
    sortOrder: 2,
    minPassengers: 1,
    maxPassengers: 6,
    luggage: "5 large bags",
    baseFareSen: 4_500,
    perKmSen: 250,
    hourlyRateSen: 9_000,
    minimumFareSen: 9_000,
  },
  {
    ...CAR_RULES,
    slug: "van",
    name: "Passenger van",
    description: "Up to 10 passengers and 8 large bags. Same driver all trip.",
    sortOrder: 3,
    minPassengers: 1,
    maxPassengers: 10,
    luggage: "8 large bags",
    baseFareSen: 6_000,
    perKmSen: 320,
    hourlyRateSen: 12_000,
    minimumFareSen: 12_000,
  },
  {
    ...COACH_RULES,
    slug: "minibus",
    name: "Minibus",
    description:
      "15 to 24 passengers, such as a Toyota Coaster. Luggage space at the back.",
    sortOrder: 1,
    minPassengers: 15,
    maxPassengers: 24,
    luggage: "15 large bags",
    baseFareSen: 15_000,
    perKmSen: 450,
    hourlyRateSen: 18_000,
    minimumFareSen: 30_000,
  },
  {
    ...COACH_RULES,
    slug: "midi-coach",
    name: "Midi coach",
    description:
      "25 to 30 passengers, such as a Mitsubishi Rosa or Hino. Luggage hold.",
    sortOrder: 2,
    minPassengers: 25,
    maxPassengers: 30,
    luggage: "25 large bags",
    baseFareSen: 20_000,
    perKmSen: 550,
    hourlyRateSen: 22_000,
    minimumFareSen: 40_000,
  },
  {
    ...COACH_RULES,
    slug: "coach",
    name: "Coach",
    description:
      "31 to 44 passengers, such as a Scania or Volvo 44-seater. Full luggage hold.",
    sortOrder: 3,
    minPassengers: 31,
    maxPassengers: 44,
    luggage: "40 large bags",
    baseFareSen: 25_000,
    perKmSen: 650,
    hourlyRateSen: 28_000,
    minimumFareSen: 50_000,
  },
  {
    ...COACH_RULES,
    slug: "vip-coach",
    name: "VIP coach",
    description:
      "15 to 27 passengers in wide executive seats. For corporate groups.",
    sortOrder: 4,
    minPassengers: 15,
    maxPassengers: 27,
    luggage: "25 large bags",
    baseFareSen: 30_000,
    perKmSen: 800,
    hourlyRateSen: 35_000,
    minimumFareSen: 60_000,
  },
];

/** The districts served at launch: Klang Valley, Langkawi, Penang, Melaka, Johor Bahru and Cameron Highlands. */
const LAUNCH_DISTRICTS = new Set([
  "kuala-lumpur",
  "putrajaya",
  "petaling",
  "klang",
  "gombak",
  "hulu-langat",
  "sepang",
  "langkawi",
  "timur-laut",
  "barat-daya",
  "seberang-perai-utara",
  "seberang-perai-tengah",
  "seberang-perai-selatan",
  "melaka-tengah",
  "alor-gajah",
  "jasin",
  "johor-bahru",
  "kulai",
  "cameron-highlands",
]);

for (const code of LAUNCH_DISTRICTS) {
  if (!DISTRICT_DATA.districts.some((d) => d.code === code)) {
    throw new Error(`Launch district ${code} is not in the data file.`);
  }
}

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
    data: { code, name, stateCode, isActive: LAUNCH_DISTRICTS.has(code) },
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
