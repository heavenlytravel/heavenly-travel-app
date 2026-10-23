"use server";

import {
  emptyTrace,
  isTripCategory,
  localDateTimeInputs,
  pickupInstant,
  pinPlace,
  priceRows,
  unavailableReason,
  type LngLat,
  type TripPriceBreakdown,
  type TripTrace,
  type ZoneTripMeasure,
} from "@repo/db";
import { listOfferings, quoteTrip, type QuotedEnd } from "@repo/db/server";
import { resolvePlace, tripRouting } from "@repo/places/server";
import { getAdmin } from "../../../../../_lib/access";
import { FORBIDDEN_MESSAGE } from "../../../../../_lib/action-state";

/** An end as Try a trip sends it: a place picked from the search, or a pin dropped on the map. */
export type TryEnd =
  | { placeId: string; label: string }
  | { lat: number; lng: number; label: string };

export type TryTripInput = {
  pickup: TryEnd;
  dropoff: TryEnd;
  vehicleClassId: string;
  /** The pickup time, "23:30", for the odd-hours surcharge; the day is tomorrow. */
  time: string;
};

/** What Try a trip shows: the price as a customer would be charged, or why not, and every step. */
export type TryTripAnswer =
  | { ok: false; error: string }
  | {
      ok: true;
      pickup: { label: string; at: LngLat };
      dropoff: { label: string; at: LngLat };
      /** Every step of the quote, with its geometry. */
      trace: TripTrace;
      /** Why it cannot be priced, for the customer and in Ops' words; null when it was. */
      refused: { message: string; reason: string | null } | null;
      quote: {
        location: string;
        pickup: QuotedEnd;
        dropoff: QuotedEnd;
        zoneTrip: ZoneTripMeasure | null;
        /** The class's price; null when the grid has none for it on this trip. */
        price: TripPriceBreakdown | null;
        /** The receipt's rows, as the website and the console show them. */
        rows: [string, string][];
        /** Why the class cannot take the trip as asked, as the options page says it. */
        unavailable: string | null;
      } | null;
    };

const DAY_MS = 24 * 60 * 60 * 1000;

function isEnd(value: unknown): value is TryEnd {
  if (typeof value !== "object" || value === null) return false;
  const e = value as Record<string, unknown>;
  if (typeof e.label !== "string") return false;
  if (typeof e.placeId === "string") return e.placeId !== "";
  return (
    typeof e.lat === "number" &&
    typeof e.lng === "number" &&
    Math.abs(e.lat) <= 90 &&
    Math.abs(e.lng) <= 180
  );
}

const placeOf = async (end: TryEnd) =>
  "placeId" in end ? resolvePlace(end.placeId) : pinPlace(end);

/**
 * Prices a trip on the location's Rates tab with the website's own
 * `quoteTrip`, the pickup's location pinned to the tab's, and answers the
 * price and the quote's trace. Nothing is booked or stored; the routes are
 * real Google calls, counted in the trace. For anyone who can see the tab
 * (`coverage.view`). Arguments are checked for their type here: an action
 * is reachable by direct POST.
 */
export async function tryTripAction(
  locationId: unknown,
  input: unknown,
): Promise<TryTripAnswer> {
  const admin = await getAdmin("coverage.view");
  if (!admin) return { ok: false, error: FORBIDDEN_MESSAGE };
  const given = input as Partial<TryTripInput> | null;
  if (
    typeof locationId !== "string" ||
    !given ||
    !isEnd(given.pickup) ||
    !isEnd(given.dropoff) ||
    typeof given.vehicleClassId !== "string" ||
    typeof given.time !== "string"
  ) {
    return { ok: false, error: "Pick the pickup, the drop-off and a class." };
  }
  const tomorrow = localDateTimeInputs(new Date(Date.now() + DAY_MS)).date;
  const startsAt = pickupInstant(tomorrow, given.time);
  if (!startsAt) return { ok: false, error: "Enter the pickup time." };

  const [pickup, dropoff, offerings] = await Promise.all([
    placeOf(given.pickup),
    placeOf(given.dropoff),
    listOfferings(locationId),
  ]);
  if (!pickup || !dropoff) {
    return {
      ok: false,
      error: "Google did not return that place. Pick it again.",
    };
  }
  const offering = offerings.find(
    (o) => o.vehicleClassId === given.vehicleClassId,
  );
  const category = offering?.vehicleClass.category;
  if (!offering || !isTripCategory(category)) {
    return { ok: false, error: "That class is not sold here. Pick another." };
  }

  const trace = emptyTrace();
  const quoted = await quoteTrip(
    category,
    { mode: "oneway", pickup, dropoff, startsAt, hours: null },
    tripRouting,
    { locationId, trace },
  );
  const ends = {
    pickup: { label: pickup.label, at: [pickup.lng, pickup.lat] as LngLat },
    dropoff: {
      label: dropoff.label,
      at: [dropoff.lng, dropoff.lat] as LngLat,
    },
  };
  if (!quoted.ok) {
    return {
      ok: true,
      ...ends,
      trace,
      refused: {
        message: quoted.error.message,
        reason: quoted.error.reason ?? null,
      },
      quote: null,
    };
  }
  const { quote } = quoted;
  const chosen = quote.classes.find(
    (c) => c.vehicleClass.id === given.vehicleClassId,
  );
  return {
    ok: true,
    ...ends,
    trace,
    refused: null,
    quote: {
      location: quote.location.name,
      pickup: quote.pickup,
      dropoff: quote.dropoff!,
      zoneTrip: quote.zoneTrip,
      price: chosen?.price ?? null,
      rows: chosen?.price ? priceRows(chosen.price) : [],
      unavailable: chosen
        ? unavailableReason(chosen.availability)
        : `${offering.vehicleClass.name} is not on sale here.`,
    },
  };
}
