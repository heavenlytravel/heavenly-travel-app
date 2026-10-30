import { cancellationDeadline, formatLocalTime } from "./booking-rules";
import { refuse, type Change } from "./change";
import { guardFor } from "./const-enum";
import { numberOf, type Parsed } from "./fields";
import type { LngLat } from "./geo";
import { kmBetween } from "./zone-trip";

/**
 * Fulfilment's vocabulary and rules, pure and browser-safe: who does a
 * trip, when a vehicle or a driver is busy, what refuses a job and what
 * only warns, when a trip is assigned, and which column of the board it
 * stands in. The writers in ./fulfilment apply them inside their
 * transactions. See docs/261028-fulfilment-vendors-and-connect.md.
 */

/** A trip is done by a vehicle and a driver, each a part of it. */
export const PART_ROLES = ["vehicle", "driver"] as const;
export type PartRole = (typeof PART_ROLES)[number];
export const isPartRole = guardFor(PART_ROLES);
export const PART_ROLE_LABELS: Record<PartRole, string> = {
  vehicle: "Vehicle",
  driver: "Driver",
};

export const OFFER_STATUSES = [
  "offered",
  "accepted",
  "declined",
  "expired",
  "withdrawn",
  "released",
] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];
export const isOfferStatus = guardFor(OFFER_STATUSES);
export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  offered: "Waiting for an answer",
  accepted: "Accepted",
  declined: "Declined",
  expired: "No answer in time",
  withdrawn: "Withdrawn",
  released: "Released",
};

/** Why a vendor or a driver says no; "other" asks a few words. */
export const DECLINE_REASONS = ["not-available", "too-far", "other"] as const;
export type DeclineReason = (typeof DECLINE_REASONS)[number];
export const isDeclineReason = guardFor(DECLINE_REASONS);
export const DECLINE_REASON_LABELS: Record<DeclineReason, string> = {
  "not-available": "Not available",
  "too-far": "Too far",
  other: "Other",
};
export const DECLINE_NOTE_MAX_LENGTH = 200;

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

/** The speed an estimate drives at, in km/h: a trip booked before Google's time was kept, the drive between two jobs in the picker. */
export const ESTIMATE_KMH = 50;
/** How much longer a road is than the straight line, for an estimate between two points. */
export const ROAD_FACTOR = 1.3;

/** The buffer a location starts with, and the most one may hold. */
export const SAFETY_BUFFER_DEFAULT_MINUTES = 15;
export const SAFETY_BUFFER_MAX_MINUTES = 240;
/** The form name of a location's buffer. */
export const SAFETY_BUFFER_FIELD = "safetyBufferMinutes";

/** A buffer is whole minutes from 0, which turns it off, to the most. */
export function checkSafetyBuffer(minutes: number): Change {
  return Number.isInteger(minutes) &&
    minutes >= 0 &&
    minutes <= SAFETY_BUFFER_MAX_MINUTES
    ? { ok: true }
    : refuse(
        `The buffer is a whole number of minutes from 0 to ${SAFETY_BUFFER_MAX_MINUTES}; 0 turns it off.`,
        SAFETY_BUFFER_FIELD,
      );
}

/** The buffer form's value, read and checked. */
export function parseSafetyBuffer(
  values: Record<string, unknown>,
): Parsed<number> {
  const minutes = numberOf(values[SAFETY_BUFFER_FIELD]);
  const check = checkSafetyBuffer(minutes);
  return check.ok ? { ok: true, value: minutes } : check;
}

/** Whole minutes to drive a road this long, by the estimate's speed. */
export function estimateDriveMinutes(roadKm: number) {
  return Math.max(0, Math.ceil((roadKm / ESTIMATE_KMH) * 60));
}

/** Whole minutes to drive between two points, from the straight line: shown as "about". */
export function estimateDriveBetween(from: LngLat, to: LngLat) {
  return estimateDriveMinutes(kmBetween(from, to) * ROAD_FACTOR);
}

/** What the timing reads of a trip. */
export type TripTimes = {
  startsAt: Date;
  /** An hourly hire's end; null for one-way. */
  endsAt: Date | null;
  /** Google's drive, one-way; null when unknown. */
  driveMinutes: number | null;
  /** One-way's road distance, for an estimate when Google's drive is unknown. */
  distanceKm: number | null;
};

/**
 * When a trip takes its vehicle and driver: from its pickup to its end.
 * An hourly hire's end is known; a one-way trip ends at its pickup plus
 * Google's drive, or an estimate from its distance, and that end is an
 * estimate either way.
 */
export function tripWindow(trip: TripTimes): {
  start: Date;
  end: Date;
  /** The end rests on a drive time, not a booked hour. */
  estimated: boolean;
} {
  if (trip.endsAt) {
    return { start: trip.startsAt, end: trip.endsAt, estimated: false };
  }
  const minutes =
    trip.driveMinutes ?? estimateDriveMinutes(trip.distanceKm ?? 0);
  return {
    start: trip.startsAt,
    end: new Date(trip.startsAt.getTime() + minutes * MINUTE_MS),
    estimated: true,
  };
}

/** A job a vehicle or a driver has, or is asked for: its times and its two ends. */
export type Job = TripTimes & {
  /** The booking's reference, to name it: "HT-7K3QZM". */
  reference: string;
  pickup: { label: string; at: LngLat };
  /** Null for an hourly hire, which ends where it started for all we know. */
  dropoff: { label: string; at: LngLat } | null;
};

/** Two jobs that cannot both be done: the same start, or a start during an hourly hire. */
export type JobClash = { job: Job; kind: "same-time" | "during-hire" };

/**
 * Whether two jobs' known times overlap: they start at the same moment, or
 * one starts while the other, an hourly hire, is still going. The rule a
 * customer's own trips follow (`tripClashes`), applied across bookings.
 * What rests on an estimate never clashes: it warns (`timingWarnings`).
 */
export function jobsClash(a: Job, b: Job): JobClash["kind"] | null {
  const startA = a.startsAt.getTime();
  const startB = b.startsAt.getTime();
  if (startA === startB) return "same-time";
  const [first, second] = startA < startB ? [a, b] : [b, a];
  if (first.endsAt && first.endsAt.getTime() > second.startsAt.getTime()) {
    return "during-hire";
  }
  return null;
}

/** The first of the jobs held that clashes with one of the jobs asked; null for none. */
export function firstClash(
  asked: readonly Job[],
  held: readonly Job[],
): JobClash | null {
  for (const job of asked) {
    for (const other of held) {
      const kind = jobsClash(job, other);
      if (kind) return { job: other, kind };
    }
  }
  return null;
}

/** A sentence for a clash, naming the other job: "Has HT-7K3QZM at 9:00, an hourly hire until 13:00". */
export function clashSentence(clash: JobClash) {
  const at = formatLocalTime(clash.job.startsAt);
  return clash.kind === "same-time"
    ? `Has ${clash.job.reference} at the same time, ${at}`
    : `Has ${clash.job.reference} from ${at}, an hourly hire until ${formatLocalTime(clash.job.endsAt!)}`;
}

/** The drive between two jobs: Google's when asked for, else the straight line's estimate. */
export type DriveBetween = (
  from: LngLat,
  to: LngLat,
) => { minutes: number; about: boolean };

/** The estimate between two points, with no lookup. */
export const ESTIMATED_DRIVE: DriveBetween = (from, to) => ({
  minutes: estimateDriveBetween(from, to),
  about: true,
});

/**
 * The warnings on taking these jobs with those held: where one job ends,
 * the drive to the next one's pickup and the location's buffer reach past
 * that pickup. They rest on estimates, so they never refuse; whoever
 * accepts sees them and owns the timing. "Ali finishes HT-7K3QZM at Datai
 * about 8:45. Cenang is about 60 min away, so he arrives about 9:45 for
 * a 9:00 pickup."
 */
export function timingWarnings(
  asked: readonly Job[],
  held: readonly Job[],
  {
    bufferMinutes,
    drive = ESTIMATED_DRIVE,
    who = "It",
  }: { bufferMinutes: number; drive?: DriveBetween; who?: string },
): string[] {
  const all = [
    ...asked.map((job) => ({ job, asked: true })),
    ...held.map((job) => ({ job, asked: false })),
  ].sort((a, b) => a.job.startsAt.getTime() - b.job.startsAt.getTime());
  const warnings: string[] = [];
  for (let i = 1; i < all.length; i++) {
    const before = all[i - 1]!;
    const next = all[i]!;
    // Only a pair with a job asked in it is this choice's to warn about.
    if (!before.asked && !next.asked) continue;
    const ends = tripWindow(before.job);
    const from = (before.job.dropoff ?? before.job.pickup).at;
    const leg = drive(from, next.job.pickup.at);
    const arrives = new Date(
      ends.end.getTime() + (leg.minutes + bufferMinutes) * MINUTE_MS,
    );
    if (arrives.getTime() <= next.job.startsAt.getTime()) continue;
    const endPlace = (before.job.dropoff ?? before.job.pickup).label;
    const about = ends.estimated ? "about " : "";
    const legAbout = leg.about ? "about " : "";
    const buffer =
      bufferMinutes > 0 ? ` and a ${bufferMinutes} min buffer` : "";
    warnings.push(
      `${who} finishes ${before.job.reference} at ${endPlace} ${about}${formatLocalTime(ends.end)}. ${next.job.pickup.label} is ${legAbout}${leg.minutes} min away${buffer}, so ${who === "It" ? "it" : "they"} would be ready ${about || legAbout ? "about " : ""}${formatLocalTime(arrives)} for ${next.job.reference}'s ${formatLocalTime(next.job.startsAt)} pickup.`,
    );
  }
  return warnings;
}

/** What acceptance reads of a part. */
export type PartAcceptance = {
  role: string;
  vehicleId: string | null;
  driverId: string | null;
  vendorAcceptedAt: Date | null;
  driverAcceptedAt: Date | null;
};

/** Whether a part is settled: named, its vendor accepted, and, a driver, the driver too. */
export function partAccepted(part: PartAcceptance) {
  if (!part.vendorAcceptedAt) return false;
  if (part.role === "vehicle") return part.vehicleId !== null;
  return part.driverId !== null && part.driverAcceptedAt !== null;
}

/** Whether a trip is assigned: it has a vehicle and a driver, both accepted. */
export function tripAssigned(parts: readonly PartAcceptance[]) {
  return PART_ROLES.every((role) => {
    const part = parts.find((p) => p.role === role);
    return part !== undefined && partAccepted(part);
  });
}

/** The board's columns, worked out, never stored. */
export const BOARD_COLUMNS = [
  "to-assign",
  "waiting",
  "assigned",
  "on-the-road",
  "done",
] as const;
export type BoardColumn = (typeof BOARD_COLUMNS)[number];
export const BOARD_COLUMN_LABELS: Record<BoardColumn, string> = {
  "to-assign": "To assign",
  waiting: "Waiting to accept",
  assigned: "Assigned",
  "on-the-road": "On the road",
  done: "Done",
};

/** The board's column for a trip: by its status, its parts and whether its driver has reported. */
export function boardColumnOf(trip: {
  status: string;
  parts: readonly PartAcceptance[];
  /** Its driver has tapped "On the way" or later. */
  reported: boolean;
}): BoardColumn {
  if (trip.status === "completed") return "done";
  if (trip.reported) return "on-the-road";
  if (tripAssigned(trip.parts)) return "assigned";
  if (trip.parts.length > 0) return "waiting";
  return "to-assign";
}

/**
 * When an offer is answered by, unless Operation says otherwise: two hours
 * from now, but never later than an hour before the first pickup, and
 * never before now.
 */
export function defaultRespondBy(firstPickup: Date, now: Date = new Date()) {
  const twoHours = now.getTime() + 2 * HOUR_MS;
  const hourBefore = firstPickup.getTime() - HOUR_MS;
  return new Date(Math.max(now.getTime(), Math.min(twoHours, hourBefore)));
}

/**
 * Whether a cancelled trip still owes its vendors: cancelled at or after
 * its free-cancellation deadline (its pickup less its cutoff, kept on the
 * trip at booking). Before it, the vendor gets nothing.
 */
export function owesAfterCancel(
  trip: { startsAt: Date; cancellationCutoffHours: number },
  cancelledAt: Date,
) {
  return (
    cancelledAt.getTime() >=
    cancellationDeadline(trip.startsAt, trip.cancellationCutoffHours).getTime()
  );
}
