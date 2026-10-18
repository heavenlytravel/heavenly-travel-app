import {
  PLACE_QUERY_MAX_LENGTH,
  PLACE_QUERY_MIN_LENGTH,
  type Bounds,
  type PlaceSearchResponse,
  type PlaceSuggestion,
} from "@repo/places";

/**
 * The browser side of place autocomplete. Suggestions come from the app's
 * own route handler, which holds the Google key and caches per query. Both
 * apps mount the handler at the same path.
 */

export const PLACE_SEARCH_PATH = "/api/places/search";

/** True when the query is long enough to be worth a request. */
export function isSearchableQuery(query: string) {
  return query.trim().length >= PLACE_QUERY_MIN_LENGTH;
}

/** The suggestions for a query; inside `within` only, when given. */
export async function fetchPlaceSuggestions(
  query: string,
  sessionToken: string,
  signal?: AbortSignal,
  within?: Bounds,
): Promise<PlaceSuggestion[]> {
  const params = new URLSearchParams({
    q: query.trim().slice(0, PLACE_QUERY_MAX_LENGTH),
    session: sessionToken,
  });
  if (within) params.set("within", within.join(","));
  const res = await fetch(`${PLACE_SEARCH_PATH}?${params}`, { signal });
  if (!res.ok) return [];
  const body = (await res.json()) as PlaceSearchResponse;
  return body.suggestions;
}
