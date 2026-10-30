import {
  BOOKING_RULES,
  byStart,
  classFit,
  formatLocalTime,
  hireEndOf,
  parseTripSearch,
  startOfTrip,
  tripItemField,
  tripSearchParams,
  type ClassFit,
  type TripClash,
  type TripClassPrice,
  type TripMode,
  type TripSearch,
} from "@repo/db";
import type { GalleryModel } from "../_components/ModelGallery";
import { EMPTY_SEARCH, type SearchValues } from "./search";
import {
  tripSearchFromCard,
  type TripSearchIssue,
} from "./transportation-booking";

/**
 * The trips a customer puts together before booking them: the search
 * card's list, carried to the vehicle and confirm pages in the browser's
 * storage (./trip-plan-store), with the quote each trip was given. One
 * vehicle does every trip, chosen once. Each trip is one booking item, so
 * the list is kept by start, the order its trips are numbered, priced and
 * booked in. Browser-safe and pure. See docs/261027-multi-trip-booking.md.
 */

/** A place in the plan: the id the server resolves, and the name the customer picked. */
export type PlanPlace = { placeId: string; label: string };

/** One trip, as typed. */
export type PlannedTrip = {
  id: string;
  mode: TripMode;
  pickup: PlanPlace;
  /** One-way only. */
  dropoff: PlanPlace | null;
  /** "2026-11-03", in Malaysia. */
  date: string;
  /** "09:30" */
  time: string;
  /** Hourly only. */
  hours: number | null;
};

/** What the drivers need, asked once for the booking and copied onto the trips it is for. */
export type ForDriver = {
  arrivingFlight: string;
  departingFlight: string;
  notes: string;
};

export const NO_FLIGHTS: ForDriver = {
  arrivingFlight: "",
  departingFlight: "",
  notes: "",
};

/** One class as a trip's quote prices it, with what the pages say about it. */
export type TripClassQuote = TripClassPrice & {
  /** What the odd-hours surcharge adds to this trip; 0 when none. */
  oddHoursSen: number;
  /** The customer may cancel this trip free until this long before it starts. */
  cancellationCutoffHours: number;
};

/** A trip as the server priced it: its places' names and every class, or why it cannot be booked. */
export type TripQuoteView =
  | {
      ok: true;
      pickup: string;
      dropoff: string | null;
      classes: TripClassQuote[];
    }
  | { ok: false; error: string };

/** A class as its vehicle card shows it, from the first trip's location that sells it. */
export type ClassCard = {
  id: string;
  name: string;
  description: string;
  luggage: string;
  minPassengers: number;
  maxPassengers: number;
  imageUrl: string | null;
  models: GalleryModel[];
};

/** What pricing a list answers: each trip in the list's order, and the classes they offer. */
export type TripsQuoteAnswer =
  | { ok: true; trips: TripQuoteView[]; classes: ClassCard[] }
  | { ok: false; error: string };

/** A trip's quote as the plan keeps it, with each class's price before the last pricing where it changed. */
export type KeptQuote = { view: TripQuoteView; was: Record<string, number> };

/** The plan's last pricing: when, each trip's quote by the trip's key, and the classes. */
export type PricedTrips = {
  at: number;
  quotes: Record<string, KeptQuote>;
  classes: ClassCard[];
};

/** A quote older than this is asked again before a page shows it. */
export const QUOTE_TTL_MS = 15 * 60 * 1000;

export function newTripId() {
  return Math.random().toString(36).slice(2, 10);
}

/** The trip as the search parameters the server reads. */
export function searchOfTrip(trip: PlannedTrip): TripSearch {
  return {
    mode: trip.mode,
    pickupId: trip.pickup.placeId,
    dropoffId: trip.dropoff?.placeId ?? null,
    date: trip.date,
    time: trip.time,
    hours: trip.hours,
  };
}

/** What a trip's price depends on: a trip changed in any of it is priced again. */
export function tripKey(trip: PlannedTrip) {
  return tripSearchParams(searchOfTrip(trip)).toString();
}

/** A trip from a search that arrived in a link, its places named once the server resolves them. */
export function tripOfSearch(search: TripSearch): PlannedTrip {
  return {
    id: newTripId(),
    mode: search.mode,
    pickup: { placeId: search.pickupId, label: "" },
    dropoff: search.dropoffId ? { placeId: search.dropoffId, label: "" } : null,
    date: search.date,
    time: search.time,
    hours: search.hours,
  };
}

/** Whether two lists hold the same trips, whatever their ids. */
export function sameTrips(
  a: readonly PlannedTrip[],
  b: readonly PlannedTrip[],
) {
  const keys = (trips: readonly PlannedTrip[]) =>
    trips.map(tripKey).sort().join("|");
  return a.length === b.length && keys(a) === keys(b);
}

/* ---------- the form's values ---------- */

/** A trip as the planner's form holds it: the search card's values. */
export function draftOf(trip: PlannedTrip): SearchValues {
  return {
    ...EMPTY_SEARCH,
    mode: trip.mode,
    from: trip.pickup.label,
    to: trip.dropoff?.label ?? "",
    date: trip.date,
    time: trip.time,
    hours: String(trip.hours ?? EMPTY_SEARCH.hours),
    placeIds: {
      from: trip.pickup.placeId,
      to: trip.dropoff?.placeId,
    },
  };
}

/** Whether nothing is typed in the form yet. */
export function isBlankDraft(values: SearchValues) {
  return !values.from && !values.to && !values.date && !values.time;
}

/** The form's values as a trip, or what to fix first. */
export function tripOfDraft(
  values: SearchValues,
  id: string,
): { ok: true; trip: PlannedTrip } | { ok: false; issues: TripSearchIssue[] } {
  const sent = tripSearchFromCard(values);
  if (!sent.ok) return sent;
  const search = parseTripSearch(sent.params)!;
  return {
    ok: true,
    trip: {
      id,
      mode: search.mode,
      pickup: { placeId: search.pickupId, label: values.from },
      dropoff: search.dropoffId
        ? { placeId: search.dropoffId, label: values.to }
        : null,
      date: search.date,
      time: search.time,
      hours: search.hours,
    },
  };
}

/* ---------- what the list says ---------- */

const dayFormat = new Intl.DateTimeFormat("en-MY", {
  timeZone: BOOKING_RULES.timeZone,
  weekday: "short",
  day: "numeric",
  month: "short",
});

const shortDayFormat = new Intl.DateTimeFormat("en-MY", {
  timeZone: BOOKING_RULES.timeZone,
  day: "numeric",
  month: "short",
});

/** The day of a trip: "Tue, 3 Nov". */
export function dayOf(trip: Pick<PlannedTrip, "date" | "time">) {
  const start = startOfTrip(trip);
  return start ? dayFormat.format(start) : trip.date;
}

/** The day of a trip without its weekday, for a span: "3 Nov". */
export function shortDayOf(trip: Pick<PlannedTrip, "date" | "time">) {
  const start = startOfTrip(trip);
  return start ? shortDayFormat.format(start) : trip.date;
}

/** When a trip starts, as the list says it: "Tue, 3 Nov · 9:30 AM". */
export function whenOf(trip: Pick<PlannedTrip, "date" | "time">) {
  const start = startOfTrip(trip);
  return start ? `${dayFormat.format(start)} · ${formatLocalTime(start)}` : "";
}

/** The days the trips span: "Tue, 3 Nov", or "3 Nov to 6 Nov". */
export function spanOf(trips: readonly PlannedTrip[]) {
  const sorted = byStart(trips);
  const first = sorted[0];
  const last = sorted.at(-1);
  if (!first || !last) return "";
  return first.date === last.date
    ? dayOf(first)
    : `${shortDayOf(first)} to ${shortDayOf(last)}`;
}

/** A trip in a few words: "Langkawi Airport → Pelangi Beach Resort", or "8 hours from Pelangi Beach Resort". */
export function routeOf(trip: PlannedTrip) {
  // A trip from a link has its places named once it is priced.
  const name = (place: PlanPlace | null) => place?.label || "…";
  if (trip.mode === "hourly") {
    return `${trip.hours} hours from ${name(trip.pickup)}`;
  }
  return `${name(trip.pickup)} → ${name(trip.dropoff)}`;
}

/** What the list says of a trip that clashes, in a few words. */
export function clashLabel(kind: TripClash["kind"]) {
  return kind === "during-hire"
    ? "Starts during another trip"
    : "Same time as another trip";
}

/**
 * What the form says of its trip when it starts while `other` is still
 * going: the same moment, or during a hire; `number` names `other`.
 */
export function clashMessage(other: PlannedTrip, number: number) {
  if (other.mode === "hourly" && other.date && other.time) {
    const end = hireEndOf(other);
    return `Your ${other.hours}-hour hire on ${dayOf(other)} (trip ${number}) runs until ${end}, and this trip starts during it. Your driver can take you there as part of the hire: remove this trip and tell the driver, or start it after ${end}.`;
  }
  return `Trip ${number} starts at the same time, from ${other.pickup.label}. One vehicle cannot do both: choose another time, or book a second vehicle on its own.`;
}

/** What the form says of its trip when trip `number` starts while it is still going. */
export function clashedByMessage(number: number, other: PlannedTrip) {
  return `Trip ${number}, ${whenOf(other)}, starts while this one is still going, and one vehicle cannot do both. Change the time of one of them.`;
}

/** The trips as the booking form posts them: "item1.mode", "item1.pickup", in order. */
export function tripItemEntries(trips: readonly PlannedTrip[]) {
  return trips.flatMap((trip, index) =>
    Array.from(tripSearchParams(searchOfTrip(trip)).entries()).map(
      ([name, value]): [string, string] => [
        tripItemField(index + 1, name),
        value,
      ],
    ),
  );
}

/* ---------- prices ---------- */

/** A trip's quote, while it is the one for the trip as it stands. */
export function quoteOf(priced: PricedTrips | null, trip: PlannedTrip) {
  return priced?.quotes[tripKey(trip)] ?? null;
}

/** Whether the trips need pricing: one has no quote, or the quotes are old. */
export function needsPricing(
  priced: PricedTrips | null,
  trips: readonly PlannedTrip[],
  now: number,
) {
  if (trips.length === 0) return false;
  if (!priced || now - priced.at > QUOTE_TTL_MS) return true;
  return trips.some((trip) => !priced.quotes[tripKey(trip)]);
}

/**
 * A new pricing of the trips, kept: each trip's quote by its key, and for
 * a trip priced before, the old price of every class whose price changed,
 * so the confirm page can say so. A price that changed back loses its note.
 */
export function keepQuotes(
  before: PricedTrips | null,
  trips: readonly PlannedTrip[],
  answer: Extract<TripsQuoteAnswer, { ok: true }>,
  at: number,
): PricedTrips {
  const quotes: Record<string, KeptQuote> = {};
  trips.forEach((trip, index) => {
    const view = answer.trips[index];
    if (!view) return;
    const key = tripKey(trip);
    const old = before?.quotes[key];
    const was: Record<string, number> = {};
    if (old?.view.ok && view.ok) {
      for (const priced of view.classes) {
        const previous =
          old.was[priced.id] ??
          old.view.classes.find((c) => c.id === priced.id)?.totalSen;
        if (
          previous !== undefined &&
          previous !== null &&
          priced.totalSen !== null &&
          previous !== priced.totalSen
        ) {
          was[priced.id] = previous;
        }
      }
    }
    quotes[key] = { view, was };
  });
  return { at, quotes, classes: answer.classes };
}

/** A class of the plan's pricing, and whether it can do every trip. */
export type ClassChoice = { card: ClassCard; fit: ClassFit };

/**
 * The plan's trips against its last pricing: each trip's quote, the trips
 * that cannot be booked and why, and for every class whether it can do
 * them all for the group. The classes are judged only once every trip has
 * a quote that priced it.
 */
export function planPrices(
  trips: readonly PlannedTrip[],
  priced: PricedTrips | null,
  passengers: number,
) {
  const quotes = trips.map((trip) => quoteOf(priced, trip));
  const failed = trips.flatMap((trip, index) => {
    const view = quotes[index]?.view;
    return view && !view.ok ? [{ trip, index, error: view.error }] : [];
  });
  const complete = quotes.every((quote) => quote !== null);
  const choices: ClassChoice[] =
    complete && failed.length === 0
      ? (priced?.classes ?? []).map((card) => ({
          card,
          fit: classFit(
            card,
            quotes.map((quote) => (quote!.view.ok ? quote!.view.classes : [])),
            passengers,
          ),
        }))
      : [];
  return { quotes, failed, complete, choices };
}

/** A class's price on one trip of the plan, as its quote says it; null when it has none. */
export function classOnTrip(quote: KeptQuote | null, classId: string) {
  return quote?.view.ok
    ? (quote.view.classes.find((c) => c.id === classId) ?? null)
    : null;
}

/** How the pages name a trip in a sentence: "trip 2 (Wed, 4 Nov)", or "your trip" when it is the only one. */
export function tripNameOf(trips: readonly PlannedTrip[]) {
  return (index: number) => {
    const trip = trips[index];
    if (!trip) return "a trip";
    return trips.length === 1
      ? "your trip"
      : `trip ${index + 1} (${dayOf(trip)})`;
  };
}
