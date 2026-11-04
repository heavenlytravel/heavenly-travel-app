import type { TripCategory } from "./booking-status";

/**
 * Global business rules and the pure checks built on them. Pure: no database
 * and no `server-only`, so it runs in unit tests and in the browser. The
 * notice and the cancellation cutoff are each location's for each class
 * it sells, on its offering (./offering-input); the hours of an hourly
 * hire are its packages' (./hourly-input); the rest is global. See docs/261018-location-work-and-class-catalogue.md, "The rules
 * per location and class".
 */

export const BOOKING_RULES = {
  /** A pickup must be at most this far in the future (12 months). */
  maxHorizonDays: 365,
  /** The most trips one booking takes on the website: a long stay, not a fleet. */
  maxTripsPerBooking: 20,
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

/**
 * Whose booking a trip is checked for. The website's customer meets every
 * rule. An admin enters what was already agreed, often by phone and
 * sometimes after the trip: no notice, no horizon, any group, and a
 * pickup in the past too.
 */
export type BookingSide = "customer" | "admin";

/** The rules a location sets for a trip in one class, as stored on its offering. */
export type ClassRules = {
  minLeadHours: number;
};

/** The two rules an offering carries, as stored on `LocationVehicleClass`. */
export type OfferingRules = ClassRules & {
  cancellationCutoffHours: number;
};

/**
 * Each category's usual rules. A class a location starts selling starts
 * with them; the location may differ, per class, it is only a row. The
 * coach values are placeholders until ops confirms them.
 */
export const CATEGORY_RULE_DEFAULTS: Record<TripCategory, OfferingRules> = {
  "car-with-driver": {
    minLeadHours: 4,
    cancellationCutoffHours: 24,
  },
  "coach-charter": {
    minLeadHours: 24,
    cancellationCutoffHours: 48,
  },
};

/**
 * Whether one class can take one trip, and if not, why: the pickup is
 * sooner than the class's notice, or the class has no price for the trip.
 */
export type ClassAvailability =
  | { ok: true }
  | { ok: false; reason: "too-soon"; minLeadHours: number }
  /** The grid or the hourly list has no price for this class on this trip. */
  | { ok: false; reason: "not-on-route" };

export function classAvailability(
  rules: ClassRules,
  trip: { startsAt: Date },
  now: Date = new Date(),
  side: BookingSide = "customer",
): ClassAvailability {
  // The notice is the website's; an admin books what was agreed.
  if (side === "admin") return { ok: true };
  if (trip.startsAt.getTime() < hoursAfter(now, rules.minLeadHours).getTime()) {
    return { ok: false, reason: "too-soon", minLeadHours: rules.minLeadHours };
  }
  return { ok: true };
}

/** Why a class cannot take the trip, as the options page says it. */
export function unavailableReason(availability: ClassAvailability) {
  if (availability.ok) return null;
  switch (availability.reason) {
    case "too-soon":
      return `Needs ${availability.minLeadHours} hours notice`;
    case "not-on-route":
      return "Not offered on this trip";
  }
}

/**
 * Whether a group fits a class. Only the maximum counts, and only for a
 * customer: an admin may book any group, as agreed.
 */
export function fitsPassengers(
  vehicleClass: { maxPassengers: number },
  passengers: number,
  side: BookingSide = "customer",
) {
  return (
    Number.isInteger(passengers) &&
    passengers >= 1 &&
    (side === "admin" || passengers <= vehicleClass.maxPassengers)
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

const localClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: BOOKING_RULES.timeZone,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** The minute of the Malaysian day an instant falls in: 23:30 is 1410. */
export function localMinuteOfDay(instant: Date) {
  const parts = localClock.formatToParts(instant);
  const read = (type: "hour" | "minute") =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  // Some runtimes spell midnight "24".
  return (read("hour") % 24) * 60 + read("minute");
}

/**
 * A minute of the day as every page, email and picker shows a time, on
 * the 24-hour clock: 570 is "09:30", 0 is "00:00", 1410 is "23:30".
 */
export function formatClock(minute: number) {
  const two = (n: number) => String(n).padStart(2, "0");
  return `${two(Math.floor(minute / 60))}:${two(minute % 60)}`;
}

/** An instant as customers and ops read it: "Sat, 3 Oct 2026, 09:30" in Malaysia. */
export function formatLocalDateTime(instant: Date) {
  return `${formatLocalDate(instant)}, ${formatLocalTime(instant)}`;
}

const localDate = new Intl.DateTimeFormat("en-MY", {
  timeZone: BOOKING_RULES.timeZone,
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** The day alone, "Sat, 3 Oct 2026" in Malaysia, for a table that puts the time under it. */
export function formatLocalDate(instant: Date) {
  return localDate.format(instant);
}

/** The time alone, "09:30" in Malaysia, from the same minute the rules read. */
export function formatLocalTime(instant: Date) {
  return formatClock(localMinuteOfDay(instant));
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
