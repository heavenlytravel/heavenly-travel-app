import "server-only";
import { pickupInstant, type Place } from "@repo/db";
import type { CarTripRequest } from "@repo/db/server";
import { resolvePlace, roadDistance } from "@repo/places/server";
import type { CarSearch } from "../../../../_lib/car-booking";

/**
 * From the search in the URL to what the domain layer prices: places
 * resolved, the pickup instant computed, the road distance fetched. The
 * options page, the confirm page and the create action all start here, so a
 * booking can never be built from a trip the options page did not show.
 */

export type LoadedTrip =
  | { ok: true; request: CarTripRequest }
  | { ok: false; title: string; message: string };

const stop = (title: string, message: string): LoadedTrip => ({
  ok: false,
  title,
  message,
});

export async function loadCarTrip(search: CarSearch): Promise<LoadedTrip> {
  const startsAt = pickupInstant(search.date, search.time);
  if (!startsAt) {
    return stop(
      "Check the date and time",
      "That pick-up date and time are not valid.",
    );
  }

  const [pickup, dropoff] = await Promise.all([
    resolvePlace(search.pickupId),
    search.dropoffId ? resolvePlace(search.dropoffId) : null,
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
}

async function distanceBetween(from: Place, to: Place) {
  const route = await roadDistance(from, to);
  return route ? route.distanceKm : null;
}
