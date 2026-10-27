"use server";

import { BOOKING_RULES, parseTripSearch } from "@repo/db";
import { quoteTrips, type TripRequest } from "@repo/db/server";
import { resolveTrip, tripRouting } from "@repo/places/server";
import type {
  ClassCard,
  TripQuoteView,
  TripsQuoteAnswer,
} from "../../../../_lib/trip-plan";
import { bookableCategory } from "../../../../_lib/transportation-booking";

/**
 * Every class of the category priced for every trip of a list, in one
 * request: the vehicle and confirm pages ask it whenever a trip is added
 * or changed, and when the quotes they hold are old. Each trip arrives as
 * the search's own query string and is parsed, resolved and priced on the
 * server, the locations and their offerings read once for the list. A trip
 * that cannot be priced says why in its place; the others are still
 * priced. Nothing is written, and the booking action prices every trip
 * again. See docs/261027-multi-trip-booking.md, "Pricing".
 */
export async function quoteTripsAction(
  segment: string,
  searches: string[],
): Promise<TripsQuoteAnswer> {
  const category = bookableCategory(segment);
  if (
    !category ||
    !Array.isArray(searches) ||
    searches.length === 0 ||
    searches.length > BOOKING_RULES.maxTripsPerBooking
  ) {
    return {
      ok: false,
      error: "These trips cannot be priced. Start a new search.",
    };
  }

  const resolved = await Promise.all(
    searches.map(async (query) => {
      const search = typeof query === "string" ? parseTripSearch(query) : null;
      if (!search) {
        return { ok: false as const, message: "This trip is incomplete." };
      }
      return resolveTrip(search);
    }),
  );
  const requests: TripRequest[] = resolved.flatMap((trip) =>
    trip.ok ? [trip.request] : [],
  );
  const quoted = await quoteTrips(category, requests, tripRouting);

  const classes = new Map<string, ClassCard>();
  let next = 0;
  const trips = resolved.map((trip): TripQuoteView => {
    if (!trip.ok) return { ok: false, error: trip.message };
    const result = quoted[next++]!;
    if (!result.ok) return { ok: false, error: result.error.message };
    const { quote } = result;
    for (const { vehicleClass, offering } of quote.classes) {
      if (classes.has(vehicleClass.id)) continue;
      classes.set(vehicleClass.id, {
        id: vehicleClass.id,
        name: vehicleClass.name,
        description: vehicleClass.description,
        luggage: vehicleClass.luggage,
        minPassengers: vehicleClass.minPassengers,
        maxPassengers: vehicleClass.maxPassengers,
        imageUrl: offering.coverUrl,
        models: vehicleClass.models,
      });
    }
    return {
      ok: true,
      pickup: trip.request.pickup.label,
      dropoff: trip.request.dropoff?.label ?? null,
      classes: quote.classes.map((c) => ({
        id: c.vehicleClass.id,
        totalSen: c.price?.totalSen ?? null,
        availability: c.availability,
        modelChoiceSen: c.modelChoice?.amountSen ?? null,
        modelChoicePercent: c.modelChoice?.charge.percent ?? null,
        modelIds: c.vehicleClass.models.map((model) => model.id),
        oddHoursSen: c.price?.surcharge?.amountSen ?? 0,
        cancellationCutoffHours: c.offering.cancellationCutoffHours,
      })),
    };
  });
  return { ok: true, trips, classes: [...classes.values()] };
}
