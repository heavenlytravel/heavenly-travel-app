"use client";

import { useSyncExternalStore } from "react";
import {
  byStart,
  guideChoiceOf,
  isTripCategory,
  NO_GUIDE,
  type GuideChoice,
  type TripCategory,
} from "@repo/db";
import {
  NO_FLIGHTS,
  type ForDriver,
  type PlannedTrip,
  type PricedTrips,
} from "./trip-plan";

/**
 * The trip plan in the browser's local storage: the trips, the group's
 * size, the one vehicle chosen for them all, the tour guide, what the
 * drivers need, and the last pricing. A list of trips does not fit a URL; the browser keeps
 * it across reloads and the sign-in round trip, and nothing is stored on
 * the server until the booking is made. Every tab of the site shares it.
 * See docs/261027-multi-trip-booking.md, "Where the trips live before
 * booking".
 */

export type TripPlan = {
  category: TripCategory;
  /** By start: the order they are numbered and booked in. */
  trips: PlannedTrip[];
  /** The most travelling on any trip: the vehicle must seat them. */
  passengers: number;
  /** The one vehicle class for every trip; null until chosen. */
  classId: string | null;
  /** A plan saved before guides, or before one language, has none: read as `NO_GUIDE`. */
  guide: GuideChoice;
  forDriver: ForDriver;
  priced: PricedTrips | null;
};

export const EMPTY_PLAN: TripPlan = {
  category: "car-with-driver",
  trips: [],
  passengers: 1,
  classId: null,
  guide: NO_GUIDE,
  forDriver: NO_FLIGHTS,
  priced: null,
};

const KEY = "heavenly-trip-plan";
/** Bumped when the stored shape changes, so an old plan is dropped, not misread. */
const VERSION = 2;

let cache: TripPlan | null = null;
const listeners = new Set<() => void>();

/**
 * A stored pricing as this code reads it, or none: one kept before a
 * class had a list of pictures is priced again rather than misread.
 */
function currentPricing(priced: PricedTrips | null | undefined) {
  return priced?.classes.every((c) => Array.isArray(c.imageUrls))
    ? priced
    : null;
}

function read(): TripPlan {
  if (cache) return cache;
  try {
    const saved = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as {
      v?: number;
      plan?: TripPlan;
    } | null;
    cache =
      saved?.v === VERSION &&
      saved.plan &&
      isTripCategory(saved.plan.category) &&
      Array.isArray(saved.plan.trips)
        ? {
            ...EMPTY_PLAN,
            ...saved.plan,
            priced: currentPricing(saved.plan.priced),
            guide: guideChoiceOf({
              language: saved.plan.guide?.language,
              request: saved.plan.guide?.request,
            }),
          }
        : EMPTY_PLAN;
  } catch {
    cache = EMPTY_PLAN;
  }
  return cache;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab's change: read it again.
  const onStorage = (e: StorageEvent) => {
    // One of ours not yet written stands: it is the newer.
    if (e.key !== KEY || pendingWrite) return;
    cache = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** The plan, or null on the server and before the browser's copy is read. */
export function useTripPlan(): TripPlan | null {
  return useSyncExternalStore<TripPlan | null>(subscribe, read, () => null);
}

/** How long the typing rests before the plan is written to storage. */
const WRITE_AFTER_MS = 400;
let pendingWrite: ReturnType<typeof setTimeout> | null = null;
let writesOnLeave = false;

/** Writes the plan waiting to be written, now; nothing when none waits. */
function write() {
  if (!pendingWrite) return;
  clearTimeout(pendingWrite);
  pendingWrite = null;
  if (!cache) return;
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ v: VERSION, plan: cache }),
    );
  } catch {
    // Storage is full or off: the plan lasts until the page reloads.
  }
}

/**
 * Changes the plan; the trips are kept by start. The page reads the change
 * at once; storage, which takes the whole plan with its prices, a moment
 * after the typing rests, so a key press in the notes stays quick. A page
 * left before then writes it on the way out.
 */
export function updatePlan(change: (plan: TripPlan) => TripPlan) {
  const next = change(read());
  cache = { ...next, trips: byStart(next.trips) };
  if (!writesOnLeave) {
    writesOnLeave = true;
    // A phone may close a tab it has hidden without a pagehide.
    window.addEventListener("pagehide", write);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") write();
    });
  }
  if (pendingWrite) clearTimeout(pendingWrite);
  pendingWrite = setTimeout(write, WRITE_AFTER_MS);
  for (const listener of listeners) listener();
}

/** The plan as it stands, for an event handler that must not wait for a render. */
export function currentPlan() {
  return read();
}

/** A new booking in place of the plan: these trips and this group, nothing chosen yet, nothing for the drivers. */
export function startPlan(
  category: TripCategory,
  trips: PlannedTrip[],
  passengers: number,
) {
  updatePlan(() => ({ ...EMPTY_PLAN, category, trips, passengers }));
}

/** Empties the plan once its trips are booked. */
export function clearPlan() {
  updatePlan(() => EMPTY_PLAN);
}
