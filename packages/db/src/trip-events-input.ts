import { refuse, type Change } from "./change";
import { guardFor } from "./const-enum";
import { tripWindow, type TripTimes } from "./fulfilment-rules";

/**
 * The driver's reports on the day, pure and browser-safe: what a tap can
 * say, the checks a tap passes before it is kept and how long a driver
 * sees the customer's details. The writer is ./driver-jobs. See
 * docs/261028-fulfilment-vendors-and-connect.md, "On the day: the driver's
 * reports" and "What people see in Connect", and
 * docs/261111-catalogue-booking-flow-and-ops.md, part E: two reports since.
 */

/**
 * Every kind a tap has had, in the order a trip goes. On the way,
 * Passenger on board and a problem are no longer tapped (`TAPPED_EVENTS`);
 * the old taps still read.
 */
export const TRIP_EVENT_KINDS = [
  "on-the-way",
  "arrived",
  "on-board",
  "dropped-off",
  "no-show",
  "problem",
] as const;
export type TripEventKind = (typeof TRIP_EVENT_KINDS)[number];
export const isTripEventKind = guardFor(TRIP_EVENT_KINDS);

/** What each tap says, on its button and in the history. */
export const TRIP_EVENT_LABELS: Record<TripEventKind, string> = {
  "on-the-way": "On the way",
  arrived: "Arrived at pickup",
  "on-board": "Passenger on board",
  "dropped-off": "Dropped off",
  "no-show": "No-show",
  problem: "Report a problem",
};

/**
 * Whether a trip is on the road: its driver has tapped On the way or any
 * step after it. A problem reported alone, before setting off, is not.
 */
export function isOnTheRoad(events: readonly { kind: string }[]) {
  return events.some((e) => e.kind !== "problem" && isTripEventKind(e.kind));
}

/** The steps of a trip, in order: Arrived, then Dropped off. */
export const TRIP_STEPS = [
  "arrived",
  "dropped-off",
] as const satisfies readonly TripEventKind[];

/** What a driver, or Operation for them, taps now: the steps and a no-show. */
export const TAPPED_EVENTS: readonly TripEventKind[] = [
  ...TRIP_STEPS,
  "no-show",
];

/**
 * The taps that end a trip's steps. Dropped off completes the trip at
 * once. A no-show completes it `NO_SHOW_UNDO_MINUTES` after it is received
 * (`noShowEndsAt`), so the driver can take it back first; the vendor is
 * paid for it, and what the customer pays is B-O4's.
 */
export const COMPLETING_EVENTS: readonly TripEventKind[] = [
  "dropped-off",
  "no-show",
];

export const TRIP_EVENT_NOTE_MAX_LENGTH = 300;

/** How far ahead of the server the phone's clock may be, and how old a queued tap may be. */
const AHEAD_MS = 10 * 60 * 1000;
const OLDEST_MS = 3 * 24 * 60 * 60 * 1000;

const CLIENT_ID_RE = /^[A-Za-z0-9-]{8,64}$/;

/** A tap as the phone sends it. */
export type TripEventInput = {
  itemId: string;
  kind: TripEventKind;
  /** When it happened, by the phone's clock. */
  at: Date;
  note: string | null;
  /** Made on the phone, so a retry never counts twice. */
  clientId: string;
};

/** The checks a tap passes before it is kept. A no-show says why. */
export function checkTripEvent(
  input: TripEventInput,
  now: Date = new Date(),
): Change {
  if (!isTripEventKind(input.kind) || !TAPPED_EVENTS.includes(input.kind)) {
    return refuse("Choose what happened.");
  }
  if (!CLIENT_ID_RE.test(input.clientId)) {
    return refuse("This tap did not arrive whole. Tap again.");
  }
  const at = input.at.getTime();
  if (Number.isNaN(at) || at > now.getTime() + AHEAD_MS) {
    return refuse("The phone's clock is ahead. Set its time to automatic.");
  }
  if (at < now.getTime() - OLDEST_MS) {
    return refuse("This tap is too old to keep. Call Operation instead.");
  }
  if (input.note && input.note.length > TRIP_EVENT_NOTE_MAX_LENGTH) {
    return refuse(
      `A note is at most ${TRIP_EVENT_NOTE_MAX_LENGTH} characters.`,
      "note",
    );
  }
  if (input.kind === "no-show" && !input.note?.trim()) {
    return refuse(
      "Say why: how long you waited and how you tried to reach them.",
      "note",
    );
  }
  return { ok: true };
}

/**
 * Why a no-show cannot be reported yet, or null when it can: only once
 * the driver has arrived and the pickup time has passed, so a late
 * passenger is waited for. The phone shows the button by the same rule.
 */
export function noShowRefusal(
  events: readonly { kind: string }[],
  startsAt: Date,
  now: Date = new Date(),
): string | null {
  if (!events.some((e) => e.kind === "arrived")) {
    return "Tap Arrived first: a no-show is reported at the pickup.";
  }
  if (now.getTime() < startsAt.getTime()) {
    return "Wait for the pickup time before reporting a no-show.";
  }
  return null;
}

/**
 * How long a no-show waits before it completes the trip, and so how long
 * its driver may take it back: the passenger turned up late.
 */
export const NO_SHOW_UNDO_MINUTES = 60;

/**
 * When a trip's no-show completes it: `NO_SHOW_UNDO_MINUTES` after the
 * server received it (`createdAt`), not by the phone's clock, so a wrong
 * clock or a tap queued without signal never shortens the wait. Null with
 * no no-show.
 */
export function noShowEndsAt(
  events: readonly { kind: string; createdAt: Date }[],
): Date | null {
  const noShow = events.find((e) => e.kind === "no-show");
  return noShow
    ? new Date(noShow.createdAt.getTime() + NO_SHOW_UNDO_MINUTES * 60 * 1000)
    : null;
}

/**
 * Why a trip's no-show cannot be taken back, or null when it can: there is
 * one, the trip did not go on to be dropped off, and its hour is not over
 * (`noShowEndsAt`), so a passenger who turns up late still rides. The same
 * hour for the driver and Operation: after it the trip is completed and
 * may be billed, and stays so. Both sides show the button by this rule,
 * hiding it as the hour ends; the writer checks it again.
 */
export function noShowUndoRefusal(
  events: readonly { kind: string; createdAt: Date }[],
  now: Date = new Date(),
): string | null {
  const endsAt = noShowEndsAt(events);
  if (!endsAt) return "This trip has no no-show to take back.";
  if (events.some((e) => e.kind === "dropped-off")) {
    return "This trip was dropped off after the no-show.";
  }
  if (now.getTime() >= endsAt.getTime()) {
    return "Its hour has passed: the no-show stands and the trip is done. Add a note on the booking if it was wrong.";
  }
  return null;
}

/** The step a driver is likely to tap next, after the taps so far; null once the trip is ended. */
export function nextTripStep(
  events: readonly { kind: string }[],
): TripEventKind | null {
  if (events.some((e) => COMPLETING_EVENTS.includes(e.kind as TripEventKind))) {
    return null;
  }
  const done = new Set(events.map((e) => e.kind));
  return TRIP_STEPS.find((step) => !done.has(step)) ?? null;
}

/** How many days after a trip's end its driver still sees the customer's details. */
export const CONTACT_VISIBLE_DAYS = 3;

/**
 * Until when the driver sees the customer's name, phone and exact places:
 * the trip's end, estimated for a one-way trip, plus `CONTACT_VISIBLE_DAYS`.
 */
export function contactVisibleUntil(trip: TripTimes): Date {
  return new Date(
    tripWindow(trip).end.getTime() + CONTACT_VISIBLE_DAYS * 24 * 60 * 60 * 1000,
  );
}

/** Whether a driver who accepted the trip still sees the customer's details. */
export function contactVisible(trip: TripTimes, now: Date = new Date()) {
  return now.getTime() < contactVisibleUntil(trip).getTime();
}

/** A place as an offer shows it: its area, never its exact address. */
export function placeArea(place: {
  label: string;
  locality: string | null;
  district: string | null;
  state: string | null;
}): string {
  return place.locality ?? place.district ?? place.state ?? "Malaysia";
}
