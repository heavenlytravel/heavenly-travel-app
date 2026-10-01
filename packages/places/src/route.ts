import {
  PLACE_QUERY_MAX_LENGTH,
  PLACE_QUERY_MIN_LENGTH,
  type PlaceSearchResponse,
  type PlacesProvider,
} from "./types";

/**
 * The GET handler behind the place fields' autocomplete, one for both apps:
 * `GET /api/places/search?q=...&session=...`. The Google key stays on the
 * server; the provider caches per query. `session` is Google's autocomplete
 * session token, minted by the field per selection. Signed in or not.
 *
 * With `allowAreas` the handler also answers `areas=1`, which keeps the
 * suggestions that name an area. The admin console mounts it that way,
 * because a location is an area; the customer site never offers one.
 */
export function placeSearchHandler(
  provider: PlacesProvider,
  { allowAreas = false }: { allowAreas?: boolean } = {},
) {
  return async function GET(request: Request): Promise<Response> {
    const params = new URL(request.url).searchParams;
    const query = (params.get("q") ?? "")
      .trim()
      .slice(0, PLACE_QUERY_MAX_LENGTH);
    const sessionToken = params.get("session")?.slice(0, 64) || undefined;
    const includeAreas = allowAreas && params.get("areas") === "1";

    const suggestions =
      query.length < PLACE_QUERY_MIN_LENGTH
        ? []
        : await provider.searchPlaces(query, { sessionToken, includeAreas });

    const body: PlaceSearchResponse = { suggestions };
    return Response.json(body, {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  };
}
