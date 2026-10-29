"use client";

import { useSyncExternalStore } from "react";
import { byStart, isTripCategory, type TripCategory } from "@repo/db";
import {
  NO_FLIGHTS,
  type ForDriver,
  type PlannedTrip,
  type PricedTrips,
} from "./trip-plan";

/**
 * The trip plan in the browser's local storage: the trips, the group's
 * size, the one vehicle chosen for them all, what the drivers need, and
 * the last pricing. A list of trips does not fit a URL; the browser keeps
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
  forDriver: ForDriver;
  priced: PricedTrips | null;
};

export const EMPTY_PLAN: TripPlan = {
  category: "car-with-driver",
  trips: [],
  passengers: 1,
  classId: null,
  forDriver: NO_FLIGHTS,
  priced: null,
};

const KEY = "heavenly-trip-plan";
/** Bumped when the stored shape changes, so an old plan is dropped, not misread. */
const VERSION = 1;

let cache: TripPlan | null = null;
const listeners = new Set<() => void>();

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
        ? saved.plan
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
    if (e.key !== KEY) return;
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

/** Changes the plan; the trips are kept by start. */
export function updatePlan(change: (plan: TripPlan) => TripPlan) {
  const next = change(read());
  cache = { ...next, trips: byStart(next.trips) };
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ v: VERSION, plan: cache }),
    );
  } catch {
    // Storage is full or off: the plan lasts until the page reloads.
  }
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
