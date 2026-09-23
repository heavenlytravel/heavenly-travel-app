import type { Place } from "@repo/db";

/** One row in the autocomplete list. Resolves to a `Place` on selection. */
export type PlaceSuggestion = {
  placeId: string;
  /** What people recognise: "KLIA Terminal 1". */
  label: string;
  /** The rest of the address, for the second line: "Sepang, Selangor". */
  detail: string;
};

/** Body of GET /api/places/search. */
export type PlaceSearchResponse = { suggestions: PlaceSuggestion[] };

export type RoadDistance = {
  distanceKm: number;
  durationMinutes: number;
};

/** Shorter queries return nothing, so the field does not ask for them. */
export const PLACE_QUERY_MIN_LENGTH = 2;
export const PLACE_QUERY_MAX_LENGTH = 120;

export type SearchOptions = {
  /**
   * Google bills an autocomplete session (keystrokes plus the final details
   * call) as one request when every call carries the same token. The field
   * mints one per selection.
   */
  sessionToken?: string;
};

/**
 * What the app needs from a places service. Malaysia only. Every method
 * returns an empty result instead of throwing when the upstream fails, and
 * logs the failure, so a Google outage degrades the page rather than
 * crashing it.
 */
export type PlacesProvider = {
  name: string;
  /** False when one-way trips cannot be priced because there is no routing. */
  canRoute: boolean;
  searchPlaces(
    query: string,
    options?: SearchOptions,
  ): Promise<PlaceSuggestion[]>;
  /** Null when the id is unknown or the place is outside Malaysia. */
  resolvePlace(placeId: string, options?: SearchOptions): Promise<Place | null>;
  /** Driving distance, or null when there is no road route. */
  roadDistance(from: Place, to: Place): Promise<RoadDistance | null>;
};
