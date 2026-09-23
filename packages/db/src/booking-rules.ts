/**
 * Global business rules and the pure checks built on them. Pure: no database
 * and no `server-only`, so it runs in unit tests and in the browser. Zones
 * may override the lead time and horizon; the rest is global. See
 * docs/car-with-driver.md, "Business rules".
 */

export const BOOKING_RULES = {
  /** A pickup must be at least this far in the future. */
  minLeadHours: 4,
  /** A pickup must be at most this far in the future (12 months). */
  maxHorizonDays: 365,
  /** Customers may cancel until this long before pickup. */
  cancellationCutoffHours: 24,
  /** Shortest hourly hire. */
  minHourlyHours: 3,
  /** Longest hourly hire in one item; anything longer is a multi-day request. */
  maxHourlyHours: 12,
  /** All customer-facing dates and times. Malaysia has no daylight saving. */
  timeZone: "Asia/Kuala_Lumpur",
  utcOffset: "+08:00",
  utcOffsetHours: 8,
} as const;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** The per-zone overrides, as stored on `Zone`. Null means use the default. */
export type ZoneRules = {
  minLeadHours: number | null;
  maxHorizonDays: number | null;
};

export function rulesFor(zone: ZoneRules | null | undefined) {
  return {
    minLeadHours: zone?.minLeadHours ?? BOOKING_RULES.minLeadHours,
    maxHorizonDays: zone?.maxHorizonDays ?? BOOKING_RULES.maxHorizonDays,
  };
}

/** The earliest and latest pickup instant a zone accepts right now. */
export function pickupWindow(
  zone: ZoneRules | null | undefined,
  now: Date = new Date(),
) {
  const rules = rulesFor(zone);
  return {
    earliest: new Date(now.getTime() + rules.minLeadHours * HOUR_MS),
    latest: new Date(now.getTime() + rules.maxHorizonDays * DAY_MS),
  };
}

export type PickupWindowCheck =
  { ok: true } | { ok: false; reason: "too-soon" | "too-far" };

export function checkPickupWindow(
  startsAt: Date,
  zone: ZoneRules | null | undefined,
  now: Date = new Date(),
): PickupWindowCheck {
  const { earliest, latest } = pickupWindow(zone, now);
  if (startsAt.getTime() < earliest.getTime()) {
    return { ok: false, reason: "too-soon" };
  }
  if (startsAt.getTime() > latest.getTime()) {
    return { ok: false, reason: "too-far" };
  }
  return { ok: true };
}

export type HoursCheck =
  { ok: true } | { ok: false; reason: "not-whole" | "too-few" | "too-many" };

/** Hourly hires are whole hours between the business minimum and maximum. */
export function checkHours(hours: number): HoursCheck {
  if (!Number.isInteger(hours)) return { ok: false, reason: "not-whole" };
  if (hours < BOOKING_RULES.minHourlyHours) {
    return { ok: false, reason: "too-few" };
  }
  if (hours > BOOKING_RULES.maxHourlyHours) {
    return { ok: false, reason: "too-many" };
  }
  return { ok: true };
}

/** The hour choices a form offers for an hourly hire. */
export const HOURLY_OPTIONS: readonly number[] = Array.from(
  { length: BOOKING_RULES.maxHourlyHours - BOOKING_RULES.minHourlyHours + 1 },
  (_, i) => BOOKING_RULES.minHourlyHours + i,
);

/** The last instant a customer may still cancel a booking that starts then. */
export function cancellationDeadline(startsAt: Date) {
  return new Date(
    startsAt.getTime() - BOOKING_RULES.cancellationCutoffHours * HOUR_MS,
  );
}

/** Whether the cutoff still allows a customer cancel. Status is checked elsewhere. */
export function isBeforeCancellationCutoff(
  startsAt: Date,
  now: Date = new Date(),
) {
  return now.getTime() < cancellationDeadline(startsAt).getTime();
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
  const local = new Date(
    instant.getTime() + BOOKING_RULES.utcOffsetHours * HOUR_MS,
  );
  const roundTrip = `${local.toISOString().slice(0, 10)} ${local.toISOString().slice(11, 16)}`;
  return roundTrip === `${date} ${time}` ? instant : null;
}
