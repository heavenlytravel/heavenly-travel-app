import {
  PLACE_QUERY_MAX_LENGTH,
  PLACE_QUERY_MIN_LENGTH,
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

export async function fetchPlaceSuggestions(
  query: string,
  sessionToken: string,
  signal?: AbortSignal,
  /** Keep suggestions that name an area. Only the admin console's handler answers it. */
  includeAreas = false,
): Promise<PlaceSuggestion[]> {
  const params = new URLSearchParams({
    q: query.trim().slice(0, PLACE_QUERY_MAX_LENGTH),
    session: sessionToken,
  });
  if (includeAreas) params.set("areas", "1");
  const res = await fetch(`${PLACE_SEARCH_PATH}?${params}`, { signal });
  if (!res.ok) return [];
  const body = (await res.json()) as PlaceSearchResponse;
  return body.suggestions;
}
