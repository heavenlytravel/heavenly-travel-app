"use client";

import { useSyncExternalStore } from "react";
import type { Canceller, ItemStatus, TripCategory } from "@repo/db";
import {
  classOf,
  dayLabel,
  endTime,
  fareOf,
  shortPlace,
  startOf,
  type TripMode,
} from "./data";

/**
 * The booking example's state: the search, the trips it asks for, the one
 * vehicle that does every trip, and the booking made from them. It lives
 * in the browser's session storage, so a reload keeps it and nothing
 * reaches the database. The real flow keeps the trips as a draft on the
 * server instead.
 */

/** A problem a situation plants on a trip, to show how the page answers it. */
export type Issue = "notice" | "quote" | "overnight";

export type Trip = {
  id: string;
  mode: TripMode;
  from: string;
  to: string;
  hours: number;
  date: string;
  time: string;
  flight: string;
  notes: string;
  issue?: Issue;
  /** Its price before today's rates, for a trip priced again since it was added. */
  wasPrice?: number;
  /** Set once booked: each trip is one booking item. */
  status?: ItemStatus;
  cancelledBy?: Canceller;
  /** Why we cancelled it, for the customer. */
  cancelNote?: string;
};

/** The booking's one vehicle: every trip is done in it. */
export type Vehicle = {
  category: TripCategory;
  classId: string | null;
  /** The most travelling on any trip. */
  passengers: number;
};

export type SearchRow = {
  id: string;
  mode: TripMode;
  from: string;
  to: string;
  hours: number;
  date: string;
  time: string;
};

export type Contact = { name: string; phone: string; email: string };

/** What the drivers need, asked once for the booking: copied onto each trip it is for when booked. */
export type ForDriver = {
  /** For every pick-up at an airport. */
  arrivingFlight: string;
  /** For every drop-off at an airport. */
  departingFlight: string;
  notes: string;
};

/** A vehicle once chosen. */
export type ChosenVehicle = Vehicle & { classId: string };

export type Booking = {
  reference: string;
  trips: Trip[];
  vehicle: ChosenVehicle;
  contact: Contact;
  /** Made by a visitor without an account. */
  guest: boolean;
  /** The moment the page pretends it is, for a sample booking mid-trip. */
  seenAt: string | null;
};

export type ExampleState = {
  v: 5;
  /** The search card's trips, one row each. */
  search: SearchRow[];
  /** The row open in the search card, the others listed above it; the last when null. */
  editing: string | null;
  trips: Trip[];
  vehicle: Vehicle;
  contact: Contact;
  forDriver: ForDriver;
  signedIn: boolean;
  booking: Booking | null;
};

export const ACCOUNT: Contact = {
  name: "Aisyah Rahman",
  phone: "+60 12 345 6789",
  email: "aisyah@example.com",
};

export function newId() {
  return Math.random().toString(36).slice(2, 10);
}

export function blankRow(start: Partial<SearchRow> = {}): SearchRow {
  return {
    id: newId(),
    mode: "oneway",
    from: "",
    to: "",
    hours: 8,
    date: "",
    time: "",
    ...start,
  };
}

const INITIAL: ExampleState = {
  v: 5,
  search: [blankRow({ id: "first" })],
  editing: null,
  trips: [],
  vehicle: {
    category: "car-with-driver",
    classId: null,
    passengers: 2,
  },
  contact: { name: "", phone: "", email: "" },
  forDriver: { arrivingFlight: "", departingFlight: "", notes: "" },
  signedIn: false,
  booking: null,
};

/* ---------- the store ---------- */

const KEY = "booking-example";
let cache: ExampleState | null = null;
const listeners = new Set<() => void>();

function read(): ExampleState {
  if (cache) return cache;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    const saved = raw ? (JSON.parse(raw) as ExampleState) : null;
    cache = saved?.v === 5 ? saved : INITIAL;
  } catch {
    cache = INITIAL;
  }
  return cache;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useExample() {
  return useSyncExternalStore(subscribe, read, () => INITIAL);
}

export function update(change: (state: ExampleState) => ExampleState) {
  cache = change(read());
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Storage is off: the example still works until the page reloads.
  }
  for (const listener of listeners) listener();
}

export function resetExample() {
  update(() => INITIAL);
}

/** The state a situation starts from: nothing searched, nothing booked. */
export function freshState(): ExampleState {
  return { ...INITIAL, search: [blankRow()] };
}

/* ---------- trips ---------- */

function sortTrips(trips: Trip[]) {
  return [...trips].sort((a, b) =>
    `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`),
  );
}

function tripFromRow(row: SearchRow): Trip {
  return {
    id: row.id,
    mode: row.mode,
    from: row.from,
    to: row.mode === "oneway" ? row.to : "",
    hours: row.hours,
    date: row.date,
    time: row.time,
    flight: "",
    notes: "",
  };
}

const sameWhereAndWhen = (a: Trip, b: Trip) =>
  a.mode === b.mode &&
  a.from === b.from &&
  a.to === b.to &&
  a.hours === b.hours &&
  a.date === b.date &&
  a.time === b.time;

/**
 * The trips a search asks for. A trip searched again keeps its flight and
 * notes, and what we knew about it while its place and time are the same.
 */
export function tripsFromSearch(rows: SearchRow[], before: Trip[]): Trip[] {
  return sortTrips(
    rows.map((row) => {
      const trip = tripFromRow(row);
      const old = before.find((t) => t.id === row.id);
      if (!old) return trip;
      const kept = { ...trip, flight: old.flight, notes: old.notes };
      return sameWhereAndWhen(old, trip) ? { ...old, ...kept } : kept;
    }),
  );
}

/** The search card's rows for a booking's trips, to change or add to them. */
export function rowsOf(trips: Trip[], added?: SearchRow): SearchRow[] {
  const rows: SearchRow[] = trips.map((t) => ({
    id: t.id,
    mode: t.mode,
    from: t.from,
    to: t.to,
    hours: t.hours,
    date: t.date,
    time: t.time,
  }));
  if (added) rows.push(added);
  if (rows.length === 0) rows.push(blankRow());
  return rows;
}

/* ---------- prices and rules ---------- */

/** A trip's price in a class; null when it is quoted later. */
export function priceOf(trip: Trip, classId: string): number | null {
  if (trip.issue === "quote") return null;
  return fareOf(trip, classOf(classId)).total;
}

/** What the trips not cancelled cost in a class, quotes left out. */
export function totalOf(trips: Trip[], classId: string) {
  return trips
    .filter((t) => t.status !== "cancelled")
    .reduce((sum, t) => sum + (priceOf(t, classId) ?? 0), 0);
}

/** The last moment a trip can be cancelled for free. */
export function cutoffOf(trip: Trip, classId: string) {
  const start = startOf(trip.date, trip.time);
  return new Date(start.getTime() - classOf(classId).cutoffHours * 3_600_000);
}

const startAt = (trip: Trip) => startOf(trip.date, trip.time).getTime();

/**
 * The trip this one cannot share the vehicle with: one listed before it
 * that starts at the same moment, or an hourly hire still going when it
 * starts. A one-way trip has no length here: how long the drive takes is
 * not known until the route is, so only the same start time counts.
 */
export function clashOf(trip: Trip, trips: Trip[]): Trip | null {
  const sorted = sortTrips(trips);
  const index = sorted.findIndex((t) => t.id === trip.id);
  const start = startAt(trip);
  return (
    sorted
      .slice(0, index)
      .find(
        (t) =>
          startAt(t) === start ||
          (t.mode === "hourly" && startAt(t) + t.hours * 3_600_000 > start),
      ) ?? null
  );
}

/** What the customer is told about a trip that starts while `clash` is still going. */
export function clashMessage(clash: Trip) {
  if (clash.mode === "hourly") {
    const end = endTime(clash.time, clash.hours);
    return `Your ${clash.hours}-hour hire on ${dayLabel(clash.date)} runs until ${end}, and this trip starts during it. Your driver can take you there as part of the hire: remove this trip and tell the driver, or start it after ${end}.`;
  }
  return `Your vehicle starts the trip from ${shortPlace(clash.from)} at ${clash.time} too. Choose another time, or book a second vehicle on its own.`;
}

/** Why a trip stops the booking until it is changed or removed, if it does. */
export function blockOf(trip: Trip, trips: Trip[]): "notice" | "clash" | null {
  if (trip.issue === "notice") return "notice";
  if (clashOf(trip, trips)) return "clash";
  return null;
}

const LETTERS = "ACDEFGHJKMNPQRTUVWXY34679";

export function newReference() {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += LETTERS[Math.floor(Math.random() * LETTERS.length)];
  }
  return `HT-${code}`;
}
