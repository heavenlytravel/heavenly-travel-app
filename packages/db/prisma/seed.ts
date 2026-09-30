// Usage: pnpm --filter @repo/db db:seed [-- --replace-districts]
//
// Creates the vehicle classes and zones a fresh database starts with. A
// record that already exists (by slug) is left alone, districts and rates
// included: once seeded, ops owns them and edits them in the console. For an
// existing zone the script prints how its districts differ from this list;
// `--replace-districts` makes every existing zone's districts this list,
// for carrying a corrected list into a database seeded earlier. Rates are
// never replaced.
//
// Rates and the coach rules are placeholders until ops confirms them.
// District names are the `locality` Google returns for places in the zone.
// Google never returns the administrative district (`administrative_area_level_2`)
// for Malaysian places, so the real district names (Petaling, Timur Laut,
// Melaka Tengah) match nothing and are not listed. Every name here resolved
// at least one real place in the check on 2026-09-30:
// `pnpm --filter @repo/places check-coverage`. See docs/260930-ops-screens.md.
import { CATEGORY_RULE_DEFAULTS } from "../src/booking-rules";
import type { TripCategory } from "../src/booking-status";
import { db } from "../src/client";

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

type ZoneSeed = {
  slug: string;
  name: string;
  multiplier: number;
  /**
   * `state` is the English name Google uses most often; it varies ("Penang"
   * and "Pulau Pinang", "Melaka" and "Malacca") and only breaks a tie when
   * two zones list the same name. `names` are Google localities.
   */
  districts: { state: string; names: string[] }[];
};

const ZONES: ZoneSeed[] = [
  {
    slug: "klang-valley",
    name: "Klang Valley",
    multiplier: 1,
    districts: [
      {
        state: "Wilayah Persekutuan Kuala Lumpur",
        // Google names a few Kepong places' locality after the territory.
        names: ["Kuala Lumpur", "Wilayah Persekutuan"],
      },
      { state: "Putrajaya", names: ["Putrajaya"] },
      {
        state: "Selangor",
        names: [
          // Petaling district
          "Petaling Jaya",
          "Subang Jaya",
          "Subang",
          "Shah Alam",
          "Puchong",
          "Seri Kembangan",
          "Sungai Buloh",
          // Klang district
          "Klang",
          "Port Klang",
          "Kapar",
          "Pulau Ketam",
          // Gombak district; Rawang also covers Bukit Beruntung in Hulu Selangor
          "Batu Caves",
          "Rawang",
          "Gombak",
          // Hulu Langat district
          "Kajang",
          "Bangi",
          "Bandar Baru Bangi",
          "Semenyih",
          "Balakong",
          "Cheras",
          "Ampang",
          "Hulu Langat",
          // Sepang district
          "Sepang",
          "KLIA",
          "Cyberjaya",
          "Dengkil",
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
          // The island
          "George Town",
          "Bayan Lepas",
          "Batu Ferringhi",
          "Tanjung Bungah",
          "Bukit Bendera",
          "Air Itam",
          "Jelutong",
          "Gelugor",
          "Balik Pulau",
          // Seberang Perai
          "Butterworth",
          "Perai",
          "Bukit Mertajam",
          "Permatang Pauh",
          "Kepala Batas",
          "Tasek Gelugor",
          "Simpang Ampat",
          "Nibong Tebal",
          "Sungai Jawi",
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
        state: "Melaka",
        names: [
          // Melaka Tengah district
          "Melaka",
          "Malacca",
          "Ayer Keroh",
          "Batu Berendam",
          "Bukit Katil",
          "Cheng",
          "Tanjung Kling",
          "Sungai Udang",
          // Alor Gajah district
          "Alor Gajah",
          "Masjid Tanah",
          "Durian Tunggal",
          // Jasin district
          "Jasin",
          "Merlimau",
          "Bemban",
          "Selandar",
        ],
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
        names: [
          // Johor Bahru district
          "Johor Bahru",
          "Skudai",
          "Iskandar Puteri",
          "Gelang Patah",
          "Pasir Gudang",
          "Masai",
          "Ulu Tiram",
          // Kulai district
          "Kulai",
          "Senai",
        ],
      },
    ],
  },
  {
    slug: "cameron-highlands",
    name: "Cameron Highlands",
    multiplier: 1,
    districts: [
      { state: "Pahang", names: ["Tanah Rata", "Brinchang", "Ringlet"] },
    ],
  },
];

const REPLACE_FLAG = "--replace-districts";
const replaceDistricts = process.argv.includes(REPLACE_FLAG);

const lower = (names: Iterable<string>) =>
  new Set(Array.from(names, (n) => n.toLowerCase()));
const list = (names: string[]) => names.map((n) => `"${n}"`).join(", ");

let created = 0;
let kept = 0;

for (const { slug, ...fields } of VEHICLE_CLASSES) {
  const existing = await db.vehicleClass.findUnique({ where: { slug } });
  if (existing) {
    kept += 1;
    continue;
  }
  await db.vehicleClass.create({ data: { slug, ...fields } });
  created += 1;
}

for (const { slug, districts, ...fields } of ZONES) {
  const rows = districts.flatMap(({ state, names }) =>
    names.map((district) => ({ state, district })),
  );
  const existing = await db.zone.findUnique({
    where: { slug },
    include: { districts: true },
  });
  if (!existing) {
    await db.zone.create({
      data: { slug, ...fields, districts: { create: rows } },
    });
    created += 1;
    continue;
  }

  kept += 1;
  const inSeed = lower(rows.map((r) => r.district));
  const inDb = lower(existing.districts.map((r) => r.district));
  const missing = rows
    .filter((r) => !inDb.has(r.district.toLowerCase()))
    .map((r) => r.district);
  const extra = existing.districts
    .filter((r) => !inSeed.has(r.district.toLowerCase()))
    .map((r) => r.district);
  if (missing.length === 0 && extra.length === 0) continue;

  if (replaceDistricts) {
    await db.$transaction([
      db.zoneDistrict.deleteMany({ where: { zoneId: existing.id } }),
      db.zoneDistrict.createMany({
        data: rows.map((row) => ({ zoneId: existing.id, ...row })),
      }),
    ]);
    console.log(`Zone "${slug}": districts replaced with this seed's list.`);
    continue;
  }
  console.log(`Zone "${slug}" exists and was left alone.`);
  if (missing.length) console.log(`  Not in the database: ${list(missing)}`);
  if (extra.length) console.log(`  Not in this seed: ${list(extra)}`);
  console.log(`  Edit them in the console, or run again with ${REPLACE_FLAG}.`);
}

console.log(
  `${VEHICLE_CLASSES.length} vehicle classes and ${ZONES.length} zones: ${created} created, ${kept} already there.`,
);
await db.$disconnect();
