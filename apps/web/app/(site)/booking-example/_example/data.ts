import { formatMyr, type TripCategory } from "@repo/db";

/**
 * Sample vehicle classes and prices for the booking example. Nothing here
 * comes from the database: the example shows the flow, not the rates. The
 * classes and photos only stand in for a location's catalogue.
 */

export type TripMode = "oneway" | "hourly";

export type VehicleClass = {
  id: string;
  category: TripCategory;
  name: string;
  seats: number;
  bags: number;
  blurb: string;
  models: string;
  photo: string | null;
  /** Sample fare of a one-way trip on a short route, in ringgit. */
  oneway: number;
  /** Sample rate for an hour of hire, in ringgit. */
  hourly: number;
  /** Late-night surcharge per vehicle, in ringgit. */
  lateNight: number;
  /** Free cancellation until this many hours before the trip. */
  cutoffHours: number;
};

export const CLASSES: VehicleClass[] = [
  {
    id: "sedan",
    category: "car-with-driver",
    name: "Sedan",
    seats: 4,
    bags: 2,
    blurb: "Comfortable for a couple or a small family.",
    models: "Proton Saga, Toyota Vios, or similar",
    photo: null,
    oneway: 45,
    hourly: 30,
    lateNight: 20,
    cutoffHours: 24,
  },
  {
    id: "mpv",
    category: "car-with-driver",
    name: "MPV",
    seats: 7,
    bags: 4,
    blurb: "Room for a family and their luggage.",
    models: "Toyota Innova, Perodua Alza, or similar",
    photo: "/brand/mpv.jpg",
    oneway: 65,
    hourly: 35,
    lateNight: 20,
    cutoffHours: 24,
  },
  {
    id: "premium-mpv",
    category: "car-with-driver",
    name: "Premium MPV",
    seats: 6,
    bags: 4,
    blurb: "Captain seats and extra space.",
    models: "Toyota Alphard, Toyota Vellfire, or similar",
    photo: null,
    oneway: 160,
    hourly: 80,
    lateNight: 30,
    cutoffHours: 24,
  },
  {
    id: "van",
    category: "car-with-driver",
    name: "Van",
    seats: 12,
    bags: 8,
    blurb: "One van for a bigger group.",
    models: "Toyota Hiace, Hyundai Starex, or similar",
    photo: null,
    oneway: 120,
    hourly: 40,
    lateNight: 30,
    cutoffHours: 24,
  },
  {
    id: "minibus",
    category: "coach-charter",
    name: "Minibus",
    seats: 20,
    bags: 15,
    blurb: "A small bus for a tour group.",
    models: "Toyota Coaster, or similar",
    photo: null,
    oneway: 280,
    hourly: 90,
    lateNight: 50,
    cutoffHours: 72,
  },
  {
    id: "coach-30",
    category: "coach-charter",
    name: "30-seat coach",
    seats: 30,
    bags: 25,
    blurb: "A full coach for a mid-sized group.",
    models: "Scania, Volvo, or similar",
    photo: "/brand/coach.jpg",
    oneway: 380,
    hourly: 120,
    lateNight: 50,
    cutoffHours: 72,
  },
  {
    id: "coach-44",
    category: "coach-charter",
    name: "44-seat coach",
    seats: 44,
    bags: 40,
    blurb: "The largest coach, for a big group.",
    models: "Scania, Volvo, or similar",
    photo: "/brand/coach.jpg",
    oneway: 480,
    hourly: 150,
    lateNight: 50,
    cutoffHours: 72,
  },
];

export function classOf(id: string): VehicleClass {
  return CLASSES.find((c) => c.id === id) ?? CLASSES[0]!;
}

export const HOUR_CHOICES = [2, 3, 4, 5, 6, 8, 10, 12];

/** The most passengers one vehicle of a category seats. */
export function largestIn(category: TripCategory) {
  return Math.max(
    ...CLASSES.filter((c) => c.category === category).map((c) => c.seats),
  );
}

/** A route's sample length as a fare multiplier, the same both ways. */
function routeFactor(from: string, to: string) {
  const key = [from.trim().toLowerCase(), to.trim().toLowerCase()]
    .sort()
    .join("|");
  let hash = 0;
  for (let i = 0; i < key.length; i++)
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return 1 + (hash % 9) / 4;
}

const roundTo5 = (n: number) => Math.round(n / 5) * 5;

/** A pick-up between 23:00 and 05:59 pays the late-night surcharge. */
export function isLateNight(time: string) {
  const hour = Number(time.slice(0, 2));
  return hour >= 23 || hour < 6;
}

export type Fare = { fare: number; lateNight: number; total: number };

/** What a class costs on a trip, in ringgit. */
export function fareOf(
  trip: {
    mode: TripMode;
    from: string;
    to: string;
    hours: number;
    time: string;
  },
  cls: VehicleClass,
): Fare {
  const fare =
    trip.mode === "hourly"
      ? cls.hourly * trip.hours
      : roundTo5(cls.oneway * routeFactor(trip.from, trip.to));
  const lateNight = isLateNight(trip.time) ? cls.lateNight : 0;
  return { fare, lateNight, total: fare + lateNight };
}

/** Ringgit as the site writes it: "RM 1,234.00". */
export function rm(ringgit: number) {
  return formatMyr(ringgit * 100);
}

/** A place's name without its area: "Pelangi Beach Resort, Langkawi" -> "Pelangi Beach Resort". */
export function shortPlace(place: string) {
  return place.split(",")[0]?.trim() || place;
}

/** Whether a place sounds like an airport, which makes the flight field useful. */
export function isAirport(place: string) {
  return /airport|klia|lapangan terbang|terminal/i.test(place);
}

/* ---------- days and times, read as Malaysian local time ---------- */

const DAY = 86_400_000;

function utcOf(date: string) {
  return new Date(`${date}T00:00:00Z`);
}

/** "2026-11-03" -> "Tue, 3 Nov" */
export function dayLabel(date: string) {
  return utcOf(date).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** "2026-11-03" -> "3 Nov" */
export function shortDay(date: string) {
  return utcOf(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function addDays(date: string, days: number) {
  return new Date(utcOf(date).getTime() + days * DAY)
    .toISOString()
    .slice(0, 10);
}

/** "09:00" plus 8 hours -> "17:00"; past midnight it says so. */
export function endTime(time: string, hours: number) {
  const [h, m] = time.split(":").map(Number);
  const end = (h ?? 0) + hours;
  const clock = `${String(end % 24).padStart(2, "0")}:${String(m ?? 0).padStart(2, "0")}`;
  return end >= 24 ? `${clock} next day` : clock;
}

/** The moment a trip starts, from its Malaysian day and time. */
export function startOf(date: string, time: string) {
  return new Date(`${date}T${time}:00+08:00`);
}

/** A moment as "2 Nov, 10:30" in Malaysia. */
export function momentLabel(moment: Date) {
  const local = new Date(moment.getTime() + 8 * 3_600_000);
  const day = local.toISOString().slice(0, 10);
  const time = local.toISOString().slice(11, 16);
  return `${shortDay(day)}, ${time}`;
}

/** Today's date in Malaysia, "2026-10-26". */
export function todayInMalaysia() {
  return new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
}
