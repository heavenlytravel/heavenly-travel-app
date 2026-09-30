import {
  fitsPassengers,
  HOURLY_OPTIONS,
  isTripCategory,
  localDateTimeInputs,
  tripViewOfItem,
  type TripCategory,
  type TripMode,
} from "@repo/db";
import type { BookingItemWithDetails } from "@repo/db/server";

/**
 * What the booking forms and their actions agree on: the manual booking
 * and the amend screen share one item editor. The trip's input names are
 * `TRIP_PARAM` and `TRIP_OPTION_FIELDS` in @repo/db, the same names the
 * website's URLs carry, each under `tripItemField` with the item's index;
 * the override's are `PRICE_OVERRIDE_FIELDS`. Only the category and the
 * customer block are these forms' own. Browser-safe.
 */

export const CATEGORY_FIELD = "category";

export const CONTACT_FIELDS = {
  name: "name",
  phone: "phone",
  email: "email",
} as const;

/** One class as priced for the trip. Plain data, sent to the browser. */
export type ClassQuoteView = {
  id: string;
  name: string;
  description: string;
  luggage: string;
  minPassengers: number;
  maxPassengers: number;
  totalSen: number;
  /** Why the class cannot take this trip, or null when it can. */
  unavailable: string | null;
};

/** What "Get prices" answers: the trip as resolved and every class priced. */
export type TripQuoteView =
  | {
      ok: true;
      category: TripCategory;
      pickup: string;
      dropoff: string | null;
      /** As people read it: "Sat, 3 Oct 2026, 09:30". */
      startsAt: string;
      hours: number | null;
      distanceKm: number | null;
      /** "Petaling, Selangor" */
      district: string;
      multiplier: number;
      classes: ClassQuoteView[];
    }
  | { ok: false; error: string };

export type PricedTrip = Extract<TripQuoteView, { ok: true }>;

/** A place field: what was typed, and the id once picked from the list. */
export type PlaceValue = { text: string; id?: string };

export type TripValues = {
  category: TripCategory;
  mode: TripMode;
  pickup: PlaceValue;
  dropoff: PlaceValue;
  date: string;
  time: string;
  hours: string;
};

/** Everything one item's editor holds, each value as its input shows it. */
export type ItemDraft = {
  trip: TripValues;
  /** The priced list for the trip as it stands; null once the trip changed. */
  quote: PricedTrip | null;
  quoteError: string | null;
  vehicleClassId: string | null;
  passengers: string;
  childSeats: string;
  flightNumber: string;
  notes: string;
  agreedPrice: string;
  priceReason: string;
};

export const EMPTY_ITEM_DRAFT: ItemDraft = {
  trip: {
    category: "car-with-driver",
    mode: "oneway",
    pickup: { text: "" },
    dropoff: { text: "" },
    date: "",
    time: "",
    hours: String(HOURLY_OPTIONS[0]),
  },
  quote: null,
  quoteError: null,
  vehicleClassId: null,
  passengers: "1",
  childSeats: "0",
  flightNumber: "",
  notes: "",
  agreedPrice: "",
  priceReason: "",
};

/**
 * A stored item as the editor starts from it, with its trip priced again
 * so the class list shows at once. The class stays chosen when the priced
 * list still offers it. Null for an item that is not a trip.
 */
export function itemDraftOf(
  item: BookingItemWithDetails,
  quote: TripQuoteView,
): ItemDraft | null {
  const trip = tripViewOfItem(item);
  const details = item.tripDetails;
  if (!trip || !details || !isTripCategory(details.vehicleClassCategory)) {
    return null;
  }
  const { date, time } = localDateTimeInputs(trip.startsAt);
  const priced = quote.ok ? quote : null;
  return {
    trip: {
      category: details.vehicleClassCategory,
      mode: trip.mode,
      pickup: { text: trip.pickup.label, id: trip.pickup.placeId },
      dropoff: trip.dropoff
        ? { text: trip.dropoff.label, id: trip.dropoff.placeId }
        : { text: "" },
      date,
      time,
      hours: String(trip.hours ?? HOURLY_OPTIONS[0]),
    },
    quote: priced,
    quoteError: quote.ok ? null : quote.error,
    vehicleClassId: priced?.classes.some((c) => c.id === details.vehicleClassId)
      ? details.vehicleClassId
      : null,
    passengers: String(details.passengers),
    childSeats: String(details.childSeats),
    flightNumber: details.flightNumber ?? "",
    notes: details.notes ?? "",
    agreedPrice: "",
    priceReason: "",
  };
}

/** Whether a class can be chosen: it takes the trip and the group fits. */
export function isChoosable(c: ClassQuoteView, passengers: number) {
  return c.unavailable === null && fitsPassengers(c, passengers);
}

/** The class chosen for an item, or null while none can be submitted. */
export function chosenClass(draft: ItemDraft): ClassQuoteView | null {
  const chosen = draft.quote?.classes.find(
    (c) => c.id === draft.vehicleClassId,
  );
  return chosen && isChoosable(chosen, Number(draft.passengers))
    ? chosen
    : null;
}
