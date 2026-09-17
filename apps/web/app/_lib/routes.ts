/**
 * Places, road distances and indicative fares shared by the /ideas pages.
 *
 * Distances are rounded road kilometres between town centres. Fares are
 * placeholders in the same spirit as FLEET's day rates in content.ts: real
 * enough to judge a layout with numbers in it, and every page says a quote
 * confirms the final price.
 */

import { FLEET, type Vehicle, type VehicleId } from "./content";

export type { VehicleId };

export type PlaceId =
  | "langkawi"
  | "penang"
  | "ipoh"
  | "cameron"
  | "kl"
  | "klia"
  | "melaka"
  | "jb"
  | "kuantan"
  | "kb";

export type Place = {
  id: PlaceId;
  name: string;
  /** Three-letter code for tight layouts. */
  code: string;
  state: string;
  /** Minutes added to any drive that starts or ends here. */
  extraMinutes: number;
  note?: string;
};

/** Ordered north to south down the west coast, then the east coast. */
export const PLACES: Place[] = [
  {
    id: "langkawi",
    name: "Langkawi",
    code: "LGK",
    state: "Kedah",
    extraMinutes: 105,
    note: "Includes the ferry to Kuala Perlis",
  },
  {
    id: "penang",
    name: "Penang",
    code: "PEN",
    state: "Pulau Pinang",
    extraMinutes: 0,
  },
  { id: "ipoh", name: "Ipoh", code: "IPH", state: "Perak", extraMinutes: 0 },
  {
    id: "cameron",
    name: "Cameron Highlands",
    code: "CAM",
    state: "Pahang",
    extraMinutes: 35,
    note: "Mountain road, driven slowly",
  },
  {
    id: "kl",
    name: "Kuala Lumpur",
    code: "KUL",
    state: "Federal Territory",
    extraMinutes: 0,
  },
  {
    id: "klia",
    name: "KLIA",
    code: "KIA",
    state: "Selangor",
    extraMinutes: 0,
  },
  {
    id: "melaka",
    name: "Melaka",
    code: "MKZ",
    state: "Melaka",
    extraMinutes: 0,
  },
  {
    id: "jb",
    name: "Johor Bahru",
    code: "JHB",
    state: "Johor",
    extraMinutes: 0,
  },
  {
    id: "kuantan",
    name: "Kuantan",
    code: "KUA",
    state: "Pahang",
    extraMinutes: 0,
  },
  {
    id: "kb",
    name: "Kota Bharu",
    code: "KBR",
    state: "Kelantan",
    extraMinutes: 0,
  },
];

/**
 * Upper triangle of the distance chart: KM[i][j - i - 1] is the distance
 * from PLACES[i] to PLACES[j] for j > i. Langkawi's row is the drive from
 * the Kuala Perlis jetty.
 */
const KM: number[][] = [
  [165, 325, 415, 520, 575, 655, 845, 755, 505],
  [160, 250, 355, 410, 490, 680, 590, 340],
  [90, 205, 260, 345, 530, 440, 360],
  [205, 260, 340, 530, 330, 300],
  [58, 145, 330, 250, 440],
  [120, 300, 300, 490],
  [215, 290, 570],
  [330, 690],
  [370],
];

const INDEX = new Map(PLACES.map((p, i) => [p.id, i]));

export function placeById(id: PlaceId): Place {
  return PLACES[INDEX.get(id) ?? 0]!;
}

export function distanceKm(a: PlaceId, b: PlaceId): number {
  const i = INDEX.get(a) ?? 0;
  const j = INDEX.get(b) ?? 0;
  if (i === j) return 0;
  const [lo, hi] = i < j ? [i, j] : [j, i];
  return KM[lo]?.[hi - lo - 1] ?? 0;
}

/** Door-to-door minutes at expressway pace, plus ferry or mountain time. */
export function driveMinutes(a: PlaceId, b: PlaceId): number {
  if (a === b) return 0;
  const raw =
    distanceKm(a, b) * 0.8 +
    placeById(a).extraMinutes +
    placeById(b).extraMinutes;
  return Math.round(raw / 5) * 5;
}

export function formatDrive(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

const RATES: Record<VehicleId, { perKm: number; minimum: number }> = {
  sedan: { perKm: 1.6, minimum: 120 },
  mpv: { perKm: 2.2, minimum: 180 },
  van: { perKm: 2.8, minimum: 240 },
  minibus: { perKm: 4.5, minimum: 600 },
  coach: { perKm: 6.5, minimum: 900 },
};

export const VEHICLE_IDS = Object.keys(RATES) as VehicleId[];

export function vehicleById(id: VehicleId): Vehicle {
  return FLEET.find((v) => v.id === id) ?? FLEET[0]!;
}

/** The largest single vehicle we run; bigger groups travel in convoy. */
export const MAX_SEATS = Math.max(...FLEET.map((v) => v.seats));

/** Smallest vehicle that seats the group, and how many of them it takes. */
export function vehicleFor(passengers: number): {
  vehicle: Vehicle;
  count: number;
} {
  const pax = Math.max(1, Math.floor(passengers));
  const fit = FLEET.find((v) => v.seats >= pax);
  if (fit) return { vehicle: fit, count: 1 };
  const coach = vehicleById("coach");
  return { vehicle: coach, count: Math.ceil(pax / coach.seats) };
}

/** One-way fare for one vehicle, rounded to the nearest RM 10. */
export function oneWayFare(vehicle: VehicleId, a: PlaceId, b: PlaceId): number {
  if (a === b) return 0;
  const { perKm, minimum } = RATES[vehicle];
  const fare = Math.max(minimum, distanceKm(a, b) * perKm);
  return Math.round(fare / 10) * 10;
}
