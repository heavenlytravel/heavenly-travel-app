// Usage: pnpm --filter @repo/db db:seed
// Idempotent: vehicle classes and zones are upserted by slug, districts are
// replaced per zone. Runs against the DATABASE_URL in packages/db/.env.
//
// Rates and the coach rules are placeholders until ops confirms them.
// District names are as Google spells them in address components
// (administrative_area_level_2 or locality); verify against real geocodes
// when the places package lands. See docs/260928-coach-charter.md, "Seed".
import type { TripCategory } from "../src/booking-status";
import { db } from "../src/client";

/** Each category's usual rules; a class may differ, it is only a row. */
const CAR_RULES = {
  category: "car-with-driver" satisfies TripCategory,
  minLeadHours: 4,
  cancellationCutoffHours: 24,
  minHourlyHours: 3,
};
const COACH_RULES = {
  category: "coach-charter" satisfies TripCategory,
  minLeadHours: 24,
  cancellationCutoffHours: 48,
  minHourlyHours: 4,
};

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

type ZoneSeed = {
  slug: string;
  name: string;
  multiplier: number;
  districts: { state: string; names: string[] }[];
};

const ZONES: ZoneSeed[] = [
  {
    slug: "klang-valley",
    name: "Klang Valley",
    multiplier: 1,
    districts: [
      {
        state: "Federal Territory of Kuala Lumpur",
        names: ["Kuala Lumpur"],
      },
      { state: "Putrajaya", names: ["Putrajaya"] },
      {
        state: "Selangor",
        names: [
          "Petaling",
          "Klang",
          "Gombak",
          "Hulu Langat",
          "Sepang",
          "Petaling Jaya",
          "Shah Alam",
          "Subang Jaya",
          "Puchong",
          "Kajang",
          "Ampang",
          "Cyberjaya",
        ],
      },
    ],
  },
  {
    slug: "langkawi",
    name: "Langkawi",
    multiplier: 1,
    districts: [{ state: "Kedah", names: ["Langkawi", "Kuah"] }],
  },
  {
    slug: "penang",
    name: "Penang",
    multiplier: 1,
    districts: [
      {
        state: "Penang",
        names: [
          "Timur Laut",
          "Barat Daya",
          "Seberang Perai Utara",
          "Seberang Perai Tengah",
          "Seberang Perai Selatan",
          "George Town",
          "Bayan Lepas",
          "Butterworth",
        ],
      },
    ],
  },
  {
    slug: "melaka",
    name: "Melaka",
    multiplier: 1,
    districts: [
      {
        state: "Malacca",
        names: ["Melaka Tengah", "Alor Gajah", "Jasin", "Malacca", "Melaka"],
      },
    ],
  },
  {
    slug: "johor-bahru",
    name: "Johor Bahru",
    multiplier: 1,
    districts: [
      {
        state: "Johor",
        names: ["Johor Bahru", "Kulai", "Iskandar Puteri", "Skudai"],
      },
    ],
  },
  {
    slug: "cameron-highlands",
    name: "Cameron Highlands",
    multiplier: 1,
    districts: [
      {
        state: "Pahang",
        names: ["Cameron Highlands", "Tanah Rata", "Brinchang"],
      },
    ],
  },
];

for (const { slug, ...fields } of VEHICLE_CLASSES) {
  await db.vehicleClass.upsert({
    where: { slug },
    update: fields,
    create: { slug, ...fields },
  });
}

for (const { slug, districts, ...fields } of ZONES) {
  const zone = await db.zone.upsert({
    where: { slug },
    update: fields,
    create: { slug, ...fields },
  });
  const rows = districts.flatMap(({ state, names }) =>
    names.map((district) => ({ zoneId: zone.id, state, district })),
  );
  await db.$transaction([
    db.zoneDistrict.deleteMany({ where: { zoneId: zone.id } }),
    db.zoneDistrict.createMany({ data: rows }),
  ]);
}

console.log(
  `Seeded ${VEHICLE_CLASSES.length} vehicle classes and ${ZONES.length} zones.`,
);
await db.$disconnect();
