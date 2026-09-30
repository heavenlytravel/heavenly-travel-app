import { pickupInstant, type Place, type TripSearch } from "@repo/db";
import type { TripRequest } from "@repo/db/server";
import type { PlacesProvider } from "./types";

/**
 * From a parsed search to what the domain layer prices: the places
 * resolved, the pickup instant computed, the road distance fetched. The
 * website's options, confirm and create steps and the console's manual
 * booking all start here, so a booking can never be built from a trip the
 * priced list did not show.
 */

export type ResolvedTrip =
  | { ok: true; request: TripRequest }
  | { ok: false; title: string; message: string };

const stop = (title: string, message: string): ResolvedTrip => ({
  ok: false,
  title,
  message,
});

/** `resolveTrip` for one provider; the server entry point binds the app's. */
export function tripResolver(provider: PlacesProvider) {
  async function distanceBetween(from: Place, to: Place) {
    const route = await provider.roadDistance(from, to);
    return route ? route.distanceKm : null;
  }

  return async function resolveTrip(search: TripSearch): Promise<ResolvedTrip> {
    const startsAt = pickupInstant(search.date, search.time);
    if (!startsAt) {
      return stop(
        "Check the date and time",
        "That pick-up date and time are not valid.",
      );
    }

    const [pickup, dropoff] = await Promise.all([
      provider.resolvePlace(search.pickupId),
      search.dropoffId ? provider.resolvePlace(search.dropoffId) : null,
    ]);
    if (!pickup) {
      return stop(
        "Pick-up not found",
        "We could not find that pick-up place. Please search again.",
      );
    }
    if (search.dropoffId && !dropoff) {
      return stop(
        "Drop-off not found",
        "We could not find that drop-off place. Please search again.",
      );
    }

    const distanceKm =
      search.mode === "oneway" && dropoff
        ? await distanceBetween(pickup, dropoff)
        : null;

    return {
      ok: true,
      request: {
        mode: search.mode,
        pickup,
        dropoff: search.mode === "oneway" ? dropoff : null,
        startsAt,
        hours: search.hours,
        distanceKm,
      },
    };
  };
}
