import "server-only";
import { googleProvider } from "./google";
import { nullProvider } from "./null-provider";
import { placeSearchHandler } from "./route";
import { tripResolver } from "./trip-request";
import type { PlacesProvider } from "./types";

export type { PlacesProvider, SearchOptions } from "./types";
export type { ResolvedTrip } from "./trip-request";
export * from "./index";

/**
 * The provider the app runs with: Google when `GOOGLE_MAPS_SERVER_KEY` is
 * set, otherwise the null provider. Chosen once per process; the key is read
 * here and nowhere else.
 */
function pick(): PlacesProvider {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (key) return googleProvider(key);
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[places] GOOGLE_MAPS_SERVER_KEY is not set; one-way trips cannot be priced",
    );
  }
  return nullProvider;
}

export const places: PlacesProvider = pick();

/** True when Google answers; false when the null provider offers the seeded names. */
export const hasGooglePlaces = places.name === "google";

export const searchPlaces: PlacesProvider["searchPlaces"] = (query, options) =>
  places.searchPlaces(query, options);
export const resolvePlace: PlacesProvider["resolvePlace"] = (
  placeId,
  options,
) => places.resolvePlace(placeId, options);
export const roadDistance: PlacesProvider["roadDistance"] = (from, to) =>
  places.roadDistance(from, to);

/** `export const GET = handlePlaceSearch;` in each app's `api/places/search/route.ts`. */
export const handlePlaceSearch = placeSearchHandler(places);

/**
 * A parsed trip search as a `TripRequest`, places resolved and distance
 * fetched, or why it cannot be. See ./trip-request.
 */
export const resolveTrip = tripResolver(places);
