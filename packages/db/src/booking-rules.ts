import type { TripCategory } from "./booking-status";

/**
 * Global business rules and the pure checks built on them. Pure: no database
 * and no `server-only`, so it runs in unit tests and in the browser. The
 * notice, the cancellation cutoff and the minimum hire are set per vehicle
 * class; the rest is global. See docs/260928-coach-charter.md, "Rules live on the
 * vehicle class".
 */

export const BOOKING_RULES = {
  /** A pickup must be at most this far in the future (12 months). */
  maxHorizonDays: 365,
  /**
   * The lowest minimum hire any class may set. Forms and URLs accept hours
   * from here, because they do not know the class yet.
   */
  hourlyFloorHours: 3,
  /** Longest hourly hire in one item; anything longer is a multi-day request. */
  maxHourlyHours: 12,
  /** All customer-facing dates and times. Malaysia has no daylight saving. */
  timeZone: "Asia/Kuala_Lumpur",
  utcOffset: "+08:00",
  utcOffsetHours: 8,
} as const;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const hoursAfter = (instant: Date, hours: number) =>
  new Date(instant.getTime() + hours * HOUR_MS);

/** The latest pickup instant anyone may book right now. */
export function latestPickup(now: Date = new Date()) {
  return new Date(now.getTime() + BOOKING_RULES.maxHorizonDays * DAY_MS);
}

/** Whether a pickup is inside the booking horizon. The notice is per class. */
export function isWithinHorizon(startsAt: Date, now: Date = new Date()) {
  return startsAt.getTime() <= latestPickup(now).getTime();
}

export type HoursCheck =
  { ok: true } | { ok: false; reason: "not-whole" | "too-few" | "too-many" };

/**
 * Hourly hires are whole hours between the hourly floor and the maximum. A
 * class may ask for more than the floor; `classAvailability` checks that.
 */
export function checkHours(hours: number): HoursCheck {
  if (!Number.isInteger(hours)) return { ok: false, reason: "not-whole" };
  if (hours < BOOKING_RULES.hourlyFloorHours) {
    return { ok: false, reason: "too-few" };
  }
  if (hours > BOOKING_RULES.maxHourlyHours) {
    return { ok: false, reason: "too-many" };
  }
  return { ok: true };
}

/** The hour choices a form offers for an hourly hire. */
export const HOURLY_OPTIONS: readonly number[] = Array.from(
  {
    length: BOOKING_RULES.maxHourlyHours - BOOKING_RULES.hourlyFloorHours + 1,
  },
  (_, i) => BOOKING_RULES.hourlyFloorHours + i,
);

/** The rules a vehicle class sets for a trip, as stored on `VehicleClass`. */
export type ClassRules = {
  minLeadHours: number;
  minHourlyHours: number;
};

/** The three rules a class carries, as stored on `VehicleClass`. */
export type VehicleClassRules = ClassRules & {
  cancellationCutoffHours: number;
};

/**
 * Each category's usual rules. A new class on the Vehicle classes screen
 * starts with them and the seed's classes carry them; a class may differ,
 * it is only a row. The coach values are placeholders until ops confirms
 * them.
 */
export const CATEGORY_RULE_DEFAULTS: Record<TripCategory, VehicleClassRules> = {
  "car-with-driver": {
    minLeadHours: 4,
    cancellationCutoffHours: 24,
    minHourlyHours: 3,
  },
  "coach-charter": {
    minLeadHours: 24,
    cancellationCutoffHours: 48,
    minHourlyHours: 4,
  },
};

/**
 * Whether one class can take one trip, and if not, why: the pickup is
 * sooner than the class's notice, or an hourly hire is shorter than its
 * minimum. The notice is checked first, because more hours never fix it.
 */
export type ClassAvailability =
  | { ok: true }
  | { ok: false; reason: "too-soon"; minLeadHours: number }
  | { ok: false; reason: "too-few-hours"; minHourlyHours: number };

export function classAvailability(
  rules: ClassRules,
  trip: {
    startsAt: Date;
    /** Hourly only; null for one-way. */
    hours: number | null;
  },
  now: Date = new Date(),
): ClassAvailability {
  if (trip.startsAt.getTime() < hoursAfter(now, rules.minLeadHours).getTime()) {
    return { ok: false, reason: "too-soon", minLeadHours: rules.minLeadHours };
  }
  if (trip.hours !== null && trip.hours < rules.minHourlyHours) {
    return {
      ok: false,
      reason: "too-few-hours",
      minHourlyHours: rules.minHourlyHours,
    };
  }
  return { ok: true };
}

/** Why a class cannot take the trip, as the options page says it. */
export function unavailableReason(availability: ClassAvailability) {
  if (availability.ok) return null;
  return availability.reason === "too-soon"
    ? `Needs ${availability.minLeadHours} hours notice`
    : `Minimum ${availability.minHourlyHours} hours`;
}

/** Whether a group fits a class. Only the maximum counts. */
export function fitsPassengers(
  vehicleClass: { maxPassengers: number },
  passengers: number,
) {
  return (
    Number.isInteger(passengers) &&
    passengers >= 1 &&
    passengers <= vehicleClass.maxPassengers
  );
}

/**
 * The most passengers a list of classes accepts: the largest maximum among
 * them, or 0 for an empty list. No seat number lives in code.
 */
export function largestGroup(
  vehicleClasses: readonly { maxPassengers: number }[],
) {
  return vehicleClasses.reduce((max, c) => Math.max(max, c.maxPassengers), 0);
}

/** The last instant a customer may still cancel an item that starts then. */
export function cancellationDeadline(
  startsAt: Date,
  cancellationCutoffHours: number,
) {
  return hoursAfter(startsAt, -cancellationCutoffHours);
}

const localDateTime = new Intl.DateTimeFormat("en-MY", {
  timeZone: BOOKING_RULES.timeZone,
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** An instant as customers and ops read it: "Sat, 3 Oct 2026, 09:30" in Malaysia. */
export function formatLocalDateTime(instant: Date) {
  return localDateTime.format(instant);
}

/**
 * The Malaysian calendar day an instant falls in, as the UTC instants it
 * starts at (inclusive) and ends at (exclusive), for "today" counts.
 */
export function localDayRange(instant: Date): { start: Date; end: Date } {
  const offset = BOOKING_RULES.utcOffsetHours * HOUR_MS;
  const local = new Date(instant.getTime() + offset);
  const startLocal = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
  );
  const start = new Date(startLocal - offset);
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

/**
 * A date input value and a time input value, read as Malaysian local time,
 * as the UTC instant to store. Null when either is missing or not a real
 * calendar date and time (`new Date` would roll 2026-02-31 into March).
 */
export function pickupInstant(date: string, time: string): Date | null {
  if (!DATE_RE.test(date) || !TIME_RE.test(time)) return null;
  const instant = new Date(`${date}T${time}:00${BOOKING_RULES.utcOffset}`);
  if (Number.isNaN(instant.getTime())) return null;
  const roundTrip = localDateTimeInputs(instant);
  return roundTrip.date === date && roundTrip.time === time ? instant : null;
}

/**
 * An instant as the values of a date input and a time input in Malaysian
 * local time: the inverse of `pickupInstant`, for a form that starts from
 * a stored trip.
 */
export function localDateTimeInputs(instant: Date): {
  date: string;
  time: string;
} {
  const local = new Date(
    instant.getTime() + BOOKING_RULES.utcOffsetHours * HOUR_MS,
  ).toISOString();
  return { date: local.slice(0, 10), time: local.slice(11, 16) };
}
