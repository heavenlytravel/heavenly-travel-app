import { cancellationDeadline, formatLocalTime } from "./booking-rules";
import { refuse, type Change } from "./change";
import { guardFor } from "./const-enum";
import { numberOf, type Parsed } from "./fields";
import type { LngLat } from "./geo";
import { kmBetween } from "./zone-trip";

/**
 * Fulfilment's vocabulary and rules, pure and browser-safe: who does a
 * trip, when a vehicle or a driver is busy, what refuses a job and what
 * only warns, when a trip is assigned, and where on the Assign page it
 * stands in. The writers in ./fulfilment apply them inside their
 * transactions. See docs/261028-fulfilment-vendors-and-connect.md.
 */

/**
 * A trip is done by a vehicle and a driver, each a part of it, and a tour
 * guide when it goes with one (`rolesOf`). See docs/261103-tour-guide.md.
 */
export const PART_ROLES = ["vehicle", "driver", "guide"] as const;
export type PartRole = (typeof PART_ROLES)[number];
export const isPartRole = guardFor(PART_ROLES);
export const PART_ROLE_LABELS: Record<PartRole, string> = {
  vehicle: "Vehicle",
  driver: "Driver",
  guide: "Tour guide",
};

/** Whether a trip goes with a tour guide: one whose language was paid for. */
export function hasGuide(
  details: { guideLanguage: string | null } | null | undefined,
): boolean {
  return Boolean(details?.guideLanguage);
}

/** The roles a trip needs: a vehicle and a driver, and a guide when it goes with one. */
export function rolesOf(withGuide: boolean): PartRole[] {
  return withGuide ? [...PART_ROLES] : ["vehicle", "driver"];
}

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

/** A sentence for a clash, naming the other job: "Has HT-7K3QZM from 09:00, an hourly hire until 13:00". */
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
 * about 08:45. Cenang is about 60 min away, so he arrives about 09:45 for
 * a 09:00 pickup."
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
  guideId: string | null;
  vendorAcceptedAt: Date | null;
  driverAcceptedAt: Date | null;
};

/** The vehicle, driver or guide a part names; null until named. */
export function namedIdOf(
  part: Pick<PartAcceptance, "role" | "vehicleId" | "driverId" | "guideId">,
) {
  switch (part.role) {
    case "vehicle":
      return part.vehicleId;
    case "guide":
      return part.guideId;
    default:
      return part.driverId;
  }
}

/** Whether a part is settled: named, its vendor accepted, and, a driver, the driver too. */
export function partAccepted(part: PartAcceptance) {
  if (!part.vendorAcceptedAt || namedIdOf(part) === null) return false;
  return part.role !== "driver" || part.driverAcceptedAt !== null;
}

/**
 * What a part still waits for, null once settled: its vendor's yes
 * ("ours" when the vendor is ours, Operation's own), then the vehicle or
 * driver named, then a driver's own yes.
 */
export type PartWaiting = "vendor" | "ours" | "name" | "driver";

export function partWaitingOf(
  part: PartAcceptance,
  isOurs: boolean,
): PartWaiting | null {
  if (!part.vendorAcceptedAt) return isOurs ? "ours" : "vendor";
  if (namedIdOf(part) === null) return "name";
  if (part.role === "driver" && !part.driverAcceptedAt) return "driver";
  return null;
}

/** "Waiting for Ali Transport", "Waiting for us to accept", "Not named yet", "Waiting for the driver". */
export function partWaitingLabel(waiting: PartWaiting, vendorName: string) {
  switch (waiting) {
    case "vendor":
      return `Waiting for ${vendorName}`;
    case "ours":
      return "Waiting for us to accept";
    case "name":
      return "Not named yet";
    case "driver":
      return "Waiting for the driver";
  }
}

const DAY_MS = 24 * HOUR_MS;

/**
 * How long until a pickup, in a few words: "Started", "in 40 min",
 * "in 3 h", "in 2 days"; and whether it is within the day, soon enough
 * that a trip not yet assigned needs Operation now.
 */
export function untilPickup(
  startsAt: Date,
  now: Date = new Date(),
): { label: string; soon: boolean } {
  const ms = startsAt.getTime() - now.getTime();
  if (ms <= 0) return { label: "Started", soon: true };
  const soon = ms < DAY_MS;
  if (ms < HOUR_MS) {
    return { label: `in ${Math.max(1, Math.round(ms / MINUTE_MS))} min`, soon };
  }
  if (ms < DAY_MS) return { label: `in ${Math.round(ms / HOUR_MS)} h`, soon };
  const days = Math.round(ms / DAY_MS);
  return { label: days === 1 ? "in 1 day" : `in ${days} days`, soon };
}

/** Whether a trip is assigned: every role it needs (`rolesOf`) named and accepted. */
export function tripAssigned(
  parts: readonly PartAcceptance[],
  withGuide: boolean,
) {
  return rolesOf(withGuide).every((role) => {
    const part = parts.find((p) => p.role === role);
    return part !== undefined && partAccepted(part);
  });
}

/** Where a trip stands on the Assign page, worked out, never stored. */
export const ASSIGN_STATES = [
  "to-assign",
  "waiting",
  "assigned",
  "on-the-road",
  "done",
] as const;
export type AssignState = (typeof ASSIGN_STATES)[number];
export const ASSIGN_STATE_LABELS: Record<AssignState, string> = {
  "to-assign": "To assign",
  waiting: "Waiting to accept",
  assigned: "Assigned",
  "on-the-road": "On the road",
  done: "Done",
};

/**
 * Where a trip stands: by its status, its parts and whether its driver
 * has reported. It is to assign while any role it needs has no one asked,
 * though others are, and waits to accept once every role is asked.
 */
export function assignStateOf(trip: {
  status: string;
  parts: readonly PartAcceptance[];
  withGuide: boolean;
  /** Its driver has tapped "On the way" or later: `isOnTheRoad`. */
  reported: boolean;
}): AssignState {
  if (trip.status === "completed") return "done";
  if (trip.reported) return "on-the-road";
  if (tripAssigned(trip.parts, trip.withGuide)) return "assigned";
  const asked = rolesOf(trip.withGuide).every((role) =>
    trip.parts.some((part) => part.role === role),
  );
  return asked ? "waiting" : "to-assign";
}

/** What a role's cell says while no one is asked to do it. */
export const ROLE_NOT_ASKED_LABEL = "No vendor asked yet";

/** What the guide's cell says on a trip booked without one. */
export const NO_GUIDE_LABEL = "Not booked";

/**
 * When an offer is answered by, unless Operation says otherwise: two hours
 * from now, but never later than an hour before the first pickup, and
 * never sooner than half an hour from now, so a trip close to its pickup,
 * or started, still gets an answer.
 */
export function defaultRespondBy(firstPickup: Date, now: Date = new Date()) {
  const twoHours = now.getTime() + 2 * HOUR_MS;
  const hourBefore = firstPickup.getTime() - HOUR_MS;
  const soonest = now.getTime() + 30 * MINUTE_MS;
  return new Date(Math.max(soonest, Math.min(twoHours, hourBefore)));
}

/** The roles a trip still needs asked for: none until it is confirmed, then each it needs and has no part for. */
export function rolesToAsk(trip: {
  status: string;
  parts: readonly { role: string }[];
  withGuide: boolean;
}): PartRole[] {
  if (trip.status !== "confirmed" && trip.status !== "assigned") return [];
  return rolesOf(trip.withGuide).filter(
    (role) => !trip.parts.some((p) => p.role === role),
  );
}

/** A trip still to assign, as the Assign dialog names it. */
export type AssignTrip = {
  id: string;
  position: number;
  startsAt: Date;
  /** "Airport → Datai", or the pickup of an hourly hire. */
  route: string;
  /** The roles it still needs asked for. */
  roles: PartRole[];
  /** A coach trip: its driver is given a tip with their pay. */
  tipped: boolean;
};

/** The trips of a booking still to assign, from its trips with their roles and places. */
export function assignTripsOf(
  trips: readonly {
    id: string;
    position: number;
    startsAt: Date;
    roles: PartRole[];
    tipped: boolean;
    job: { pickup: { label: string }; dropoff: { label: string } | null };
  }[],
): AssignTrip[] {
  return trips.flatMap((trip) =>
    trip.roles.length === 0
      ? []
      : [
          {
            id: trip.id,
            position: trip.position,
            startsAt: trip.startsAt,
            route: trip.job.dropoff
              ? `${trip.job.pickup.label} → ${trip.job.dropoff.label}`
              : trip.job.pickup.label,
            roles: trip.roles,
            tipped: trip.tipped,
          },
        ],
  );
}

/** Why a vehicle or a driver cannot do one trip, and what only warns; both empty when it fits. */
export type TripFit = { reasons: string[]; warnings: string[] };

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
