import {
  fitsPassengers,
  formatMyr,
  HOURLY_OPTIONS,
  isTripCategory,
  localDateTimeInputs,
  parsePriceOverride,
  parseRinggit,
  plural,
  TRIP_CATEGORY_LABELS,
  TRIP_PARAM,
  tripViewOfItem,
  type TripCategory,
  type TripMode,
} from "@repo/db";
import type { BookingItemWithDetails } from "@repo/db/server";

/**
 * What the booking forms and their actions agree on: the manual booking
 * and the amend screen share the steps of an item. The trip's input names are
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
  /** Its picture; null for none. */
  imageUrl: string | null;
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
      /** "Petaling, Selangor", for the record; null at sea. */
      district: string | null;
      /** The location whose rates price the trip: the one whose zone the pickup is in. */
      location: string;
      /** "Langkawi Airport to Cenang" when both ends are in a zone; null when metered. */
      route: string | null;
      /** The odd-hours surcharge that applies, "+20%" or "+RM 30.00"; null for none. */
      surcharge: string | null;
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

/** The first thing missing from the trip before it can be priced; null once it can be. */
export function tripIssue(trip: TripValues): string | null {
  if (!trip.pickup.id) {
    return trip.pickup.text
      ? "Choose the pick-up from the list."
      : "Enter a pick-up place.";
  }
  if (trip.mode === "oneway" && !trip.dropoff.id) {
    return trip.dropoff.text
      ? "Choose the drop-off from the list."
      : "Enter a drop-off place.";
  }
  if (!trip.date) return "Choose a date.";
  if (!trip.time) return "Choose a pick-up time.";
  return null;
}

/** The trip under the names the parser reads, as the quote and the form post it. */
export function tripInput(trip: TripValues): Record<string, string> {
  const input: Record<string, string> = {
    [CATEGORY_FIELD]: trip.category,
    [TRIP_PARAM.mode]: trip.mode,
    [TRIP_PARAM.pickup]: trip.pickup.id ?? "",
    [TRIP_PARAM.date]: trip.date,
    [TRIP_PARAM.time]: trip.time,
  };
  if (trip.mode === "oneway") input[TRIP_PARAM.dropoff] = trip.dropoff.id ?? "";
  else input[TRIP_PARAM.hours] = trip.hours;
  return input;
}

/** "Klang Valley rates · Petaling, Selangor · 55.2 km by road · odd hours +50%" */
export function quoteSummary(quote: PricedTrip) {
  const parts = [`${quote.location} rates`];
  if (quote.district) parts.push(quote.district);
  if (quote.route) parts.push(`fixed rate, ${quote.route}`);
  if (quote.distanceKm !== null) {
    parts.push(`${quote.distanceKm.toFixed(1)} km by road`);
  }
  if (quote.hours !== null) parts.push(`${quote.hours} hours`);
  if (quote.surcharge !== null) parts.push(`odd hours ${quote.surcharge}`);
  return parts.join(" · ");
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

/** The trip as a folded step reads: "Car with driver · KLIA to Pavilion · Sat, 24 Oct 2026, 14:30". */
export function tripLine(draft: ItemDraft): string {
  const { quote, trip } = draft;
  if (!quote) return tripIssue(trip) ?? "Not priced yet";
  const where = quote.dropoff
    ? `${quote.pickup} to ${quote.dropoff}`
    : `${quote.pickup}, ${quote.hours} hours`;
  return [TRIP_CATEGORY_LABELS[quote.category], where, quote.startsAt].join(
    " · ",
  );
}

/**
 * The vehicle as a folded step reads: "Premium MPV · 4 passengers ·
 * RM 100.00"; without the price beside a total that shows it.
 */
export function vehicleLine(
  draft: ItemDraft,
  { price = true }: { price?: boolean } = {},
): string {
  const chosen = chosenClass(draft);
  if (!chosen) return draft.quote ? "Not chosen yet" : "Price the trip first";
  return [
    chosen.name,
    plural(Number(draft.passengers), "passenger"),
    price ? formatMyr(chosen.totalSen) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** What the item costs as entered: the agreed price once one is typed, else the quote; null before a vehicle is chosen. */
export function itemTotalSen(draft: ItemDraft): number | null {
  const chosen = chosenClass(draft);
  if (!chosen) return null;
  return parseRinggit(draft.agreedPrice) ?? chosen.totalSen;
}

/** The details as a folded step reads: "Flight MH 1234 · 1 child seat · notes for the driver". */
export function detailsLine(draft: ItemDraft): string {
  const parts: string[] = [];
  if (draft.flightNumber.trim()) {
    parts.push(`Flight ${draft.flightNumber.trim().toUpperCase()}`);
  }
  const seats = Number(draft.childSeats);
  if (seats > 0) parts.push(plural(seats, "child seat"));
  if (draft.notes.trim()) parts.push("notes for the driver");
  return parts.length > 0
    ? parts.join(" · ")
    : "No flight, child seats or notes";
}

/** Why the agreed price cannot be saved as entered; null when it can, or when there is none. */
export function agreedPriceIssue(draft: ItemDraft): string | null {
  const parsed = parsePriceOverride({
    amount: draft.agreedPrice,
    reason: draft.priceReason,
  });
  return parsed.ok ? null : parsed.error;
}
