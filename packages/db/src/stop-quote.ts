import { isTripCategory, type TripCategory } from "./booking-status";
import { db } from "./client";
import { isPlace, type Place } from "./place";
import { stopPaySuggestion, stopsOf, type TripStop } from "./stops";
import { quoteTrips } from "./transportation";
import type { TripRouting } from "./zone-quote";

/**
 * What a stop adds to a one-way trip's quote: the legs through every
 * place priced on their own with the trip's class and rules (zone grid,
 * per km, weekend), less the trip from its pick-up to its drop-off
 * priced the same way now. Priced alike, so the model, the guide and the
 * surcharges the receipt already holds are not counted twice. An hourly
 * hire's package covers its stops: nothing is added. See
 * docs/261108-billing-and-revisions.md, decision 17.
 */

export type StopQuote =
  | {
      ok: true;
      /** What the stop adds to the trip's quote; never below nothing. */
      quoteAddSen: number;
      /** The road it adds, km; null for an hourly hire. */
      extraKm: number | null;
    }
  | { ok: false; error: string };

export async function quoteStop(input: {
  category: TripCategory;
  vehicleClassId: string;
  mode: "oneway" | "hourly";
  startsAt: Date;
  pickup: Place;
  /** The stops it has, in order. */
  stops: readonly TripStop[];
  dropoff: Place | null;
  /** The new stop, and where among the stops it goes (0 is first). */
  stop: Place;
  at: number;
  routing: TripRouting;
  now?: Date;
}): Promise<StopQuote> {
  if (input.mode === "hourly" || !input.dropoff) {
    return { ok: true, quoteAddSen: 0, extraKm: null };
  }
  const before = [
    input.pickup,
    ...input.stops.map((s) => s.place),
    input.dropoff,
  ];
  const after = [...before];
  after.splice(input.at + 1, 0, input.stop);
  const legs = (places: readonly Place[]) =>
    places.slice(0, -1).map((pickup, index) => ({
      mode: "oneway" as const,
      pickup,
      dropoff: places[index + 1]!,
      startsAt: input.startsAt,
      hourly: null,
    }));
  const requests = [...legs(before), ...legs(after)];
  const quoted = await quoteTrips(input.category, requests, input.routing, {
    side: "admin",
    now: input.now,
  });
  let beforeSen = 0;
  let afterSen = 0;
  let beforeKm = 0;
  let afterKm = 0;
  for (const [index, result] of quoted.entries()) {
    if (!result.ok) {
      return {
        ok: false,
        error: `A leg of the trip could not be priced: ${(result.error.reason ?? result.error.message).replace(/\.?\s*$/, ".")}`,
      };
    }
    const priced = result.quote.classes.find(
      (c) => c.vehicleClass.id === input.vehicleClassId,
    )?.price;
    if (!priced) {
      return {
        ok: false,
        error: "The trip's class has no price on a leg through this stop.",
      };
    }
    const km =
      result.quote.basis.mode === "oneway" ? result.quote.basis.distanceKm : 0;
    if (index < before.length - 1) {
      beforeSen += priced.totalSen;
      beforeKm += km;
    } else {
      afterSen += priced.totalSen;
      afterKm += km;
    }
  }
  return {
    ok: true,
    quoteAddSen: Math.max(0, afterSen - beforeSen),
    extraKm: Math.max(0, Math.round((afterKm - beforeKm) * 10) / 10),
  };
}

/** A stop asked for on a stored trip: the quote, and the suggestions the Add stop dialog starts at. */
export type ItemStopQuote =
  | {
      ok: true;
      quote: StopQuote;
      /** What the trip charges now. */
      chargedSen: number;
      /** What it would charge with the stop, by the price rule: now plus what the quote added. */
      suggestedSen: number;
      /** The driver's stop pay from the location's rates; null when Operation entered none. */
      paySuggestionSen: number | null;
    }
  | { ok: false; error: string };

/**
 * What a stop at `stop`, among the trip's stops at `at`, adds to a
 * stored trip, and what the dialog suggests from it. A trip whose legs
 * cannot be priced still takes the stop: its quote adds nothing, and
 * staff type the price.
 */
export async function quoteItemStop(
  itemId: string,
  stop: Place,
  at: number,
  routing: TripRouting,
): Promise<ItemStopQuote> {
  const item = await db.bookingItem.findUnique({
    where: { id: itemId },
    select: {
      startsAt: true,
      priceTotalSen: true,
      location: { select: { driverPayPerKmSen: true, stopFeeSen: true } },
      tripDetails: {
        select: {
          vehicleClassId: true,
          vehicleClassCategory: true,
          mode: true,
          pickupPlace: true,
          dropoffPlace: true,
          stops: true,
        },
      },
    },
  });
  const details = item?.tripDetails;
  if (!item || !details || !isPlace(details.pickupPlace)) {
    return {
      ok: false,
      error: "This trip is no longer on the booking. Reload the booking.",
    };
  }
  const quote = await quoteStop({
    category: isTripCategory(details.vehicleClassCategory)
      ? details.vehicleClassCategory
      : "car-with-driver",
    vehicleClassId: details.vehicleClassId,
    mode: details.mode === "hourly" ? "hourly" : "oneway",
    startsAt: item.startsAt,
    pickup: details.pickupPlace,
    stops: stopsOf(details.stops),
    dropoff: isPlace(details.dropoffPlace) ? details.dropoffPlace : null,
    stop,
    at,
    routing,
  });
  const added = quote.ok ? quote.quoteAddSen : 0;
  return {
    ok: true,
    quote,
    chargedSen: item.priceTotalSen,
    suggestedSen: item.priceTotalSen + added,
    paySuggestionSen: stopPaySuggestion({
      extraKm: quote.ok ? quote.extraKm : null,
      payPerKmSen: item.location?.driverPayPerKmSen ?? null,
      stopFeeSen: item.location?.stopFeeSen ?? null,
    }),
  };
}
