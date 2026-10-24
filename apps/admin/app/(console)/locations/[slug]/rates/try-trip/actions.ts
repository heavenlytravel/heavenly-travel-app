"use server";

import {
  emptyTrace,
  isTripCategory,
  isWithinHorizon,
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
  /** The pickup's day, "2026-10-25", for the weekend and holiday surcharge. */
  date: string;
  /** The pickup time, "23:30", for the odd-hours surcharge. */
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
      /**
       * What a customer asking the same would meet that Try a trip let
       * through: a pickup too far ahead, an end past the furthest extra
       * road, the class's own booking rules. Empty when nothing.
       */
      customer: string[];
      quote: {
        location: string;
        /** The location's extra road settings: its own, though the try was not held to them. */
        reach: { freeExtraKm: number; maxExtraKm: number };
        pickup: QuotedEnd;
        dropoff: QuotedEnd;
        zoneTrip: ZoneTripMeasure | null;
        /** The class's price; null when the grid has none for it on this trip. */
        price: TripPriceBreakdown | null;
        /** The receipt's rows, as the website and the console show them. */
        rows: [string, string][];
      } | null;
    };

const END_NAMES = { pickup: "pickup", dropoff: "drop-off" } as const;

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
 * `quoteTrip`, the pickup's location pinned to the tab's and its limits
 * lifted (any day, any extra road a location may set), and answers the
 * price, the quote's trace and what a customer would have met instead.
 * Nothing is booked or stored; the routes are real Google calls, counted
 * in the trace. For anyone who can see the tab (`coverage.view`).
 * Arguments are checked for their type here: an action is reachable by
 * direct POST.
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
    typeof given.date !== "string" ||
    typeof given.time !== "string"
  ) {
    return { ok: false, error: "Pick the pickup, the drop-off and a class." };
  }
  const startsAt = pickupInstant(given.date, given.time);
  if (!startsAt) {
    return { ok: false, error: "Pick the pickup's day and time." };
  }

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
    { locationId, trace, unlimited: true },
  );
  const ends = {
    pickup: { label: pickup.label, at: [pickup.lng, pickup.lat] as LngLat },
    dropoff: {
      label: dropoff.label,
      at: [dropoff.lng, dropoff.lat] as LngLat,
    },
  };
  const customer = isWithinHorizon(startsAt)
    ? []
    : ["A customer cannot book that far ahead."];
  if (!quoted.ok) {
    return {
      ok: true,
      ...ends,
      trace,
      refused: {
        message: quoted.error.message,
        reason: quoted.error.reason ?? null,
      },
      customer,
      quote: null,
    };
  }
  const { quote } = quoted;
  const { maxExtraKm, freeExtraKm } = quote.location;
  for (const end of ["pickup", "dropoff"] as const) {
    const nearest = quote[end]?.nearest;
    if (nearest && nearest.extraKm > maxExtraKm) {
      customer.push(
        `A customer would be sent to WhatsApp: the ${END_NAMES[end]} is ${nearest.extraKm.toFixed(1)} km past ${quote[end]!.zone}'s edge, over the ${maxExtraKm} km ${quote.location.name} serves.`,
      );
    }
  }
  const chosen = quote.classes.find(
    (c) => c.vehicleClass.id === given.vehicleClassId,
  );
  const unavailable = chosen
    ? unavailableReason(chosen.availability)
    : `${offering.vehicleClass.name} is not on sale here.`;
  if (unavailable && chosen?.price) {
    customer.push(`A customer could not book it: ${unavailable}`);
  }
  return {
    ok: true,
    ...ends,
    trace,
    refused: null,
    customer,
    quote: {
      location: quote.location.name,
      reach: { freeExtraKm, maxExtraKm },
      pickup: quote.pickup,
      dropoff: quote.dropoff!,
      zoneTrip: quote.zoneTrip,
      price: chosen?.price ?? null,
      rows: chosen?.price ? priceRows(chosen.price) : [],
    },
  };
}
