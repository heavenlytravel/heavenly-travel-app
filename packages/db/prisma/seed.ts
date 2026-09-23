// Usage: pnpm --filter @repo/db db:seed
// Idempotent: vehicle classes and zones are upserted by slug, districts are
// replaced per zone. Runs against the DATABASE_URL in packages/db/.env.
//
// Rates are placeholders until ops confirms them. District names are as
// Google spells them in address components (administrative_area_level_2 or
// locality); verify against real geocodes when the places package lands.
import { db } from "../src/client";

const VEHICLE_CLASSES = [
  {
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
