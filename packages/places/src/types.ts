import type { Place, RoadRoute, RoutePoint } from "@repo/db";

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

/** Shorter queries return nothing, so the field does not ask for them. */
export const PLACE_QUERY_MIN_LENGTH = 2;
export const PLACE_QUERY_MAX_LENGTH = 120;

/** A box on the map, [west, south, east, north] in degrees. */
export type Bounds = [west: number, south: number, east: number, north: number];

export type SearchOptions = {
  /**
   * Keep suggestions that name an area (a town, a road, a state) rather
   * than a spot. The fields drop them, because a pin in the middle of a town
   * is no pickup point; the coverage check asks for them by name.
   */
  includeAreas?: boolean;
  /**
   * Google bills an autocomplete session (keystrokes plus the final details
   * call) as one request when every call carries the same token. The field
   * mints one per selection.
   */
  sessionToken?: string;
  /**
   * Suggest only places inside this box: a location's saved addresses
   * search the box around its states.
   */
  within?: Bounds;
  /**
   * Suggest the places inside this box first, and the rest of Malaysia
   * after them: the search card on a location's pages puts the location's
   * area first. Ignored with `within`, which keeps to its box already.
   */
  near?: Bounds;
};

/**
 * What the app needs from a places service. Malaysia only. Every method
 * returns an empty result instead of throwing when the upstream fails, and
 * logs the failure, so a Google outage degrades the page rather than
 * crashing it.
 */
export type PlacesProvider = {
  name: string;
  searchPlaces(
    query: string,
    options?: SearchOptions,
  ): Promise<PlaceSuggestion[]>;
  /** Null when the id is unknown or the place is outside Malaysia. */
  resolvePlace(placeId: string, options?: SearchOptions): Promise<Place | null>;
  /**
   * The road between two points, its length and its line, avoiding
   * ferries; null when no road joins them. Unlike the other methods it
   * rejects when the router cannot answer, so a quote never takes an
   * outage for no road. A point with a place id is routed from the place.
   */
  route(from: RoutePoint, to: RoutePoint): Promise<RoadRoute | null>;
};
