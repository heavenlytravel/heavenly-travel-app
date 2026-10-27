import type { ClassAvailability } from "./booking-rules";

/**
 * Several trips in one booking, done by one vehicle: the rules a list of
 * trips is checked by, on the website's planner as each trip is typed and
 * again by the booking action. Pure and browser-safe. See
 * docs/261027-multi-trip-booking.md, "The rules".
 */

const HOUR_MS = 60 * 60 * 1000;

/** When a trip takes the vehicle: its start, and the hours of an hourly hire (null for one-way). */
export type TripTiming = { startsAt: Date; hours: number | null };

/** The trip a trip cannot share the vehicle with, by its index in the list, and why. */
export type TripClash = {
  with: number;
  /** "same-time": both start at the same moment; "during-hire": it starts while an hourly hire is going. */
  kind: "same-time" | "during-hire";
};

/**
 * For each trip of a list, the trip it cannot share the vehicle with, or
 * null. One vehicle does one trip at a time: a trip may not start at the
 * same moment as another, or while an hourly hire is still going (a hire
 * past midnight runs into the next day). A one-way trip has no length
 * here: how long the drive takes is not known when it is typed, so trips
 * close together are allowed and the team plans the gap. Of two trips at
 * the same moment, the later one in the list is the one that clashes.
 */
export function tripClashes(
  trips: readonly TripTiming[],
): (TripClash | null)[] {
  const order = trips
    .map((_, index) => index)
    .sort(
      (a, b) =>
        trips[a]!.startsAt.getTime() - trips[b]!.startsAt.getTime() || a - b,
    );
  const clashes: (TripClash | null)[] = trips.map(() => null);
  order.forEach((index, rank) => {
    const start = trips[index]!.startsAt.getTime();
    for (const earlier of order.slice(0, rank)) {
      const other = trips[earlier]!;
      const from = other.startsAt.getTime();
      if (from === start) {
        clashes[index] = { with: earlier, kind: "same-time" };
        return;
      }
      if (other.hours !== null && from + other.hours * HOUR_MS > start) {
        clashes[index] = { with: earlier, kind: "during-hire" };
        return;
      }
    }
  });
  return clashes;
}

/** A class as one trip's quote prices it, read the same way by the site and the booking action. */
export type TripClassPrice = {
  id: string;
  /** With any model of the class; null when the grid has no price for it on this trip. */
  totalSen: number | null;
  availability: ClassAvailability;
};

type Unavailable = Exclude<ClassAvailability, { ok: true }>;

/** Whether one class can do every trip of a booking: its total, or the first reason it cannot. */
export type ClassFit =
  | { ok: true; totalSen: number }
  | { ok: false; reason: "seats" }
  /** The trip's location does not sell the class. */
  | { ok: false; reason: "not-offered"; trip: number }
  /** The trip's location sells it, but its rules or the grid refuse the trip. */
  | {
      ok: false;
      reason: "unavailable";
      trip: number;
      availability: Unavailable;
    };

/**
 * Whether one class can do every trip of a booking, and its total if so.
 * One vehicle does them all, so the class must seat the group, be sold at
 * every trip's location (a trip is priced by its pickup's), and take every
 * trip under its rules with a price on the grid. The group is checked
 * first, since changing a trip never fixes it. `trips` holds each trip's
 * priced classes, in the list's order.
 */
export function classFit(
  vehicleClass: { id: string; maxPassengers: number },
  trips: readonly (readonly TripClassPrice[])[],
  passengers: number,
): ClassFit {
  if (passengers > vehicleClass.maxPassengers) {
    return { ok: false, reason: "seats" };
  }
  let totalSen = 0;
  for (const [trip, classes] of trips.entries()) {
    const priced = classes.find((c) => c.id === vehicleClass.id);
    if (!priced) return { ok: false, reason: "not-offered", trip };
    if (!priced.availability.ok) {
      return {
        ok: false,
        reason: "unavailable",
        trip,
        availability: priced.availability,
      };
    }
    if (priced.totalSen === null) {
      return {
        ok: false,
        reason: "unavailable",
        trip,
        availability: { ok: false, reason: "not-on-route" },
      };
    }
    totalSen += priced.totalSen;
  }
  return { ok: true, totalSen };
}

/**
 * Why a class that fits the group cannot do the trips, as the end of the
 * vehicle page's "Not shown" line: "which needs 24 hours notice for trip
 * 1 (Tue, 3 Nov)". `tripName` names a trip by its index.
 */
export function classFitNote(
  fit: Extract<ClassFit, { reason: "not-offered" | "unavailable" }>,
  tripName: (trip: number) => string,
) {
  const trip = tripName(fit.trip);
  if (fit.reason === "not-offered") return `which is not offered for ${trip}`;
  switch (fit.availability.reason) {
    case "too-soon":
      return `which needs ${fit.availability.minLeadHours} hours notice for ${trip}`;
    case "too-few-hours":
      return `which needs at least ${fit.availability.minHourlyHours} hours for ${trip}`;
    case "not-on-route":
      return `which is not offered for ${trip}`;
  }
}

const AIRPORT_RE = /\b(airport|klia2?|lapangan terbang)\b/i;

/** Whether a place is an airport, by its name or address: where a flight number helps the driver. */
export function isAirportPlace(place: { label: string; address?: string }) {
  return AIRPORT_RE.test(place.label) || AIRPORT_RE.test(place.address ?? "");
}

/** The flight numbers a booking asks once, for its trips at an airport. */
export type BookingFlights = {
  /** For every pick-up at an airport. */
  arriving: string | null;
  /** For every drop-off at an airport. */
  departing: string | null;
};

/**
 * The flight a trip is for: the arriving one for a pick-up at an airport,
 * else the departing one for a drop-off at one; null for neither.
 */
export function flightOfTrip(
  trip: {
    pickup: { label: string; address?: string };
    dropoff: { label: string; address?: string } | null;
  },
  flights: BookingFlights,
): string | null {
  if (isAirportPlace(trip.pickup)) return flights.arriving;
  if (trip.dropoff && isAirportPlace(trip.dropoff)) return flights.departing;
  return null;
}
