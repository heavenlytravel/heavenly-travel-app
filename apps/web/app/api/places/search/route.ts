import type { NextRequest } from "next/server";
import {
  PLACE_QUERY_MAX_LENGTH,
  PLACE_QUERY_MIN_LENGTH,
  searchPlaces,
  type PlaceSearchResponse,
} from "@repo/places/server";

// Autocomplete proxy for the place fields, signed in or not. The Google key
// stays on the server; the provider caches per query. `session` is Google's
// autocomplete session token, minted by the field per selection.
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const query = (params.get("q") ?? "").trim().slice(0, PLACE_QUERY_MAX_LENGTH);
  const sessionToken = params.get("session")?.slice(0, 64) || undefined;

  const suggestions =
    query.length < PLACE_QUERY_MIN_LENGTH
      ? []
      : await searchPlaces(query, { sessionToken });

  const body: PlaceSearchResponse = { suggestions };
  return Response.json(body, {
    headers: { "Cache-Control": "private, max-age=60" },
  });
}
