import type { Place } from "@repo/db";
import { memoize } from "./cache";
import { parsePlace, parseRoute, parseSuggestions } from "./google-parse";
import type { PlacesProvider } from "./types";

/**
 * Google behind the `PlacesProvider` interface: Places API (New) for
 * autocomplete and details, Routes API for driving distance. One server-side
 * key, never sent to the browser. Details responses include address
 * components, so the Geocoding API is not needed.
 */

const PLACES = "https://places.googleapis.com/v1";
const ROUTES = "https://routes.googleapis.com/directions/v2:computeRoutes";
const DETAILS_FIELDS =
  "id,displayName,formattedAddress,location,addressComponents";
const TIMEOUT_MS = 5_000;
const LANGUAGE = "en";
const REGION = "MY";

const MINUTE = 60_000;

async function call(
  key: string,
  url: string,
  init: { method?: string; fieldMask: string; body?: unknown },
): Promise<unknown> {
  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": init.fieldMask,
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Google responded ${res.status} for ${url.split("?")[0]}`);
  }
  return res.json();
}

/** Logged, never thrown: a Google failure degrades the page, not crashes it. */
async function attempt<T>(what: string, run: () => Promise<T>, fallback: T) {
  try {
    return await run();
  } catch (error) {
    console.error(`[places] ${what} failed`, error);
    return fallback;
  }
}

export function googleProvider(key: string): PlacesProvider {
  // The session token is not part of any cache key: a cached answer costs
  // nothing, and the token only matters on the calls that reach Google.
  const search = memoize(
    (query: string, sessionToken?: string) =>
      call(key, `${PLACES}/places:autocomplete`, {
        method: "POST",
        fieldMask:
          "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat",
        body: {
          input: query,
          includedRegionCodes: [REGION],
          languageCode: LANGUAGE,
          regionCode: REGION,
          sessionToken,
        },
      }).then(parseSuggestions),
    { key: ([query]) => query, ttlMs: MINUTE, max: 1_000 },
  );

  // Google's terms allow caching place ids indefinitely and other place data
  // for up to 30 days; ten minutes covers a booking flow.
  const details = memoize(
    (placeId: string, sessionToken?: string) => {
      const params = new URLSearchParams({
        languageCode: LANGUAGE,
        regionCode: REGION,
      });
      if (sessionToken) params.set("sessionToken", sessionToken);
      return call(
        key,
        `${PLACES}/places/${encodeURIComponent(placeId)}?${params}`,
        { fieldMask: DETAILS_FIELDS },
      ).then(parsePlace);
    },
    { key: ([placeId]) => placeId, ttlMs: 10 * MINUTE, max: 1_000 },
  );

  const route = memoize(
    (from: Place, to: Place) =>
      call(key, ROUTES, {
        method: "POST",
        fieldMask: "routes.distanceMeters,routes.duration",
        body: {
          origin: { placeId: from.placeId },
          destination: { placeId: to.placeId },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_UNAWARE",
          units: "METRIC",
          languageCode: LANGUAGE,
          regionCode: REGION,
        },
      }).then(parseRoute),
    {
      key: ([from, to]) => `${from.placeId}|${to.placeId}`,
      ttlMs: 10 * MINUTE,
      max: 1_000,
    },
  );

  return {
    name: "google",
    canRoute: true,
    searchPlaces: (query, options) =>
      attempt("autocomplete", () => search(query, options?.sessionToken), []),
    resolvePlace: (placeId, options) =>
      attempt(
        "place details",
        () => details(placeId, options?.sessionToken),
        null,
      ),
    roadDistance: (from, to) => attempt("route", () => route(from, to), null),
  };
}
