import {
  pickupInstant,
  type NearestAnswer,
  type TripRouting,
  type TripSearch,
} from "@repo/db";
import type { TripRequest } from "@repo/db/server";
import { ttlStore } from "./cache";
import type { PlacesProvider } from "./types";

/**
 * From a parsed search to what the domain layer prices: the places
 * resolved and the pickup instant computed, with the routing the quote
 * measures the trip by. The website's options, confirm and create steps
 * and the console's manual booking all start here, so a booking can never
 * be built from a trip the priced list did not show.
 */

export type ResolvedTrip =
  | { ok: true; request: TripRequest; routing: TripRouting }
  | { ok: false; title: string; message: string };

const stop = (title: string, message: string): ResolvedTrip => ({
  ok: false,
  title,
  message,
});

const DAY = 24 * 60 * 60 * 1000;

/**
 * How a quote reaches the provider's roads: its routes, and the nearest
 * zone of each address kept for a day. The cache's keys name the zones
 * asked about and when each last changed, so a redrawn zone is asked
 * again. See docs/261023-nearest-zone-pricing.md, "Measuring with Google".
 */
export function routingOf(provider: PlacesProvider): TripRouting {
  return {
    route: (from, to) => provider.route(from, to),
    nearest: ttlStore<NearestAnswer>({ ttlMs: DAY, max: 5_000 }),
  };
}

/** `resolveTrip` for one provider and its routing; the server entry point binds the app's. */
export function tripResolver(provider: PlacesProvider, routing: TripRouting) {
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
    return {
      ok: true,
      request: {
        mode: search.mode,
        pickup,
        dropoff: search.mode === "oneway" ? dropoff : null,
        startsAt,
        hours: search.hours,
      },
      routing,
    };
  };
}
