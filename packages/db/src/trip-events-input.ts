import { refuse, type Change } from "./change";
import { guardFor } from "./const-enum";
import { tripWindow, type TripTimes } from "./fulfilment-rules";

/**
 * The driver's reports on the day, pure and browser-safe: what a tap can
 * say, the checks a tap passes before it is kept, the waiting it measures
 * and how long a driver sees the customer's details. The writer is
 * ./driver-jobs. See docs/261028-fulfilment-vendors-and-connect.md, "On the
 * day: the driver's reports" and "What people see in Connect".
 */

/** In the order a trip goes; no-show and a problem may come at any point. */
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

/** The steps of a trip, in order: suggested, never enforced. */
export const TRIP_STEPS = [
  "on-the-way",
  "arrived",
  "on-board",
  "dropped-off",
] as const satisfies readonly TripEventKind[];

/**
 * The taps that end a trip: it is completed. A no-show ends it too, and
 * the vendor is paid for it; what the customer pays is B-O4's.
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

/** The checks a tap passes before it is kept. A problem needs a few words. */
export function checkTripEvent(
  input: TripEventInput,
  now: Date = new Date(),
): Change {
  if (!isTripEventKind(input.kind)) return refuse("Choose what happened.");
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
  if (input.kind === "problem" && !input.note?.trim()) {
    return refuse("Say what the problem is.", "note");
  }
  return { ok: true };
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

/**
 * How long the driver waited: from the first "Arrived" to the first
 * "Passenger on board" after it, in whole minutes; null until both are
 * in. Not a tap of its own: for waiting charges and vendor questions.
 */
export function waitingMinutes(
  events: readonly { kind: string; at: Date }[],
): number | null {
  const sorted = [...events].sort((a, b) => a.at.getTime() - b.at.getTime());
  const arrived = sorted.find((e) => e.kind === "arrived");
  if (!arrived) return null;
  const onBoard = sorted.find(
    (e) => e.kind === "on-board" && e.at >= arrived.at,
  );
  if (!onBoard) return null;
  return Math.round((onBoard.at.getTime() - arrived.at.getTime()) / 60_000);
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
