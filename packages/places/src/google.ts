import { pointKey, type RoutePoint } from "@repo/db";
import { memoize } from "./cache";
import { parsePlace, parseRoute, parseSuggestions } from "./google-parse";
import type { Bounds, PlacesProvider } from "./types";

/**
 * Google behind the `PlacesProvider` interface: Places API (New) for
 * autocomplete and details, Routes API for the road and its line. One server-side
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

/** A route's end as the Routes API takes it: the place when there is one, else the point. */
const waypointOf = (point: RoutePoint) =>
  point.placeId
    ? { placeId: point.placeId }
    : {
        location: {
          latLng: { latitude: point.lat, longitude: point.lng },
        },
      };

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
    (
      query: string,
      sessionToken?: string,
      includeAreas?: boolean,
      within?: Bounds,
    ) =>
      call(key, `${PLACES}/places:autocomplete`, {
        method: "POST",
        fieldMask:
          "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.types,suggestions.placePrediction.structuredFormat",
        body: {
          input: query,
          includedRegionCodes: [REGION],
          languageCode: LANGUAGE,
          regionCode: REGION,
          sessionToken,
          locationRestriction: within
            ? {
                rectangle: {
                  low: { latitude: within[1], longitude: within[0] },
                  high: { latitude: within[3], longitude: within[2] },
                },
              }
            : undefined,
        },
      }).then((body) => parseSuggestions(body, includeAreas)),
    {
      key: ([query, , includeAreas, within]) =>
        `${includeAreas ? "areas:" : ""}${within ? `${within.join(",")}:` : ""}${query}`,
      ttlMs: MINUTE,
      max: 1_000,
    },
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

  // The line prices a trip from the zone edges
  // (docs/261023-nearest-zone-pricing.md). Asking for it and avoiding
  // ferries keep a request in the cheapest tier, Compute Routes Essentials:
  // no traffic, no waypoints, no tolls.
  const route = memoize(
    (from: RoutePoint, to: RoutePoint) =>
      call(key, ROUTES, {
        method: "POST",
        fieldMask: "routes.distanceMeters,routes.polyline.encodedPolyline",
        body: {
          origin: waypointOf(from),
          destination: waypointOf(to),
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_UNAWARE",
          routeModifiers: { avoidFerries: true },
          polylineQuality: "HIGH_QUALITY",
          units: "METRIC",
          languageCode: LANGUAGE,
          regionCode: REGION,
        },
      }).then(parseRoute),
    {
      key: ([from, to]) => `${pointKey(from)}|${pointKey(to)}`,
      ttlMs: 10 * MINUTE,
      max: 1_000,
    },
  );

  return {
    name: "google",
    searchPlaces: (query, options) =>
      attempt(
        "autocomplete",
        () =>
          search(
            query,
            options?.sessionToken,
            options?.includeAreas,
            options?.within,
          ),
        [],
      ),
    resolvePlace: (placeId, options) =>
      attempt(
        "place details",
        () => details(placeId, options?.sessionToken),
        null,
      ),
    route: (from, to) =>
      route(from, to).catch((error: unknown) => {
        console.error("[places] route failed", error);
        throw error;
      }),
  };
}
