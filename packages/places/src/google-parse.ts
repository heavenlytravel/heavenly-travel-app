import type { Place, RoadRoute } from "@repo/db";
import { decodePolyline } from "./polyline";
import type { PlaceSuggestion } from "./types";

/**
 * Pure readers for the Google Places API (New) and Routes API response
 * shapes. Kept apart from the fetch layer so they can be unit-tested against
 * captured responses without a key.
 */

type AutocompleteResponse = {
  suggestions?: {
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
      types?: string[];
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
    };
  }[];
};

/**
 * Suggestion types that name an area, not a spot: a town, a state, a
 * postcode, a whole road. Google puts a pin in the middle of these, which is
 * no pickup point, so they are dropped before the customer sees them.
 */
const AREA_TYPES = new Set([
  "locality",
  "sublocality",
  "sublocality_level_1",
  "sublocality_level_2",
  "neighborhood",
  "administrative_area_level_1",
  "administrative_area_level_2",
  "administrative_area_level_3",
  "postal_code",
  "country",
  "route",
]);

export function isAreaSuggestion(types: readonly string[] | undefined) {
  return (types ?? []).some((type) => AREA_TYPES.has(type));
}

export function parseSuggestions(
  body: unknown,
  includeAreas = false,
): PlaceSuggestion[] {
  const suggestions = (body as AutocompleteResponse).suggestions ?? [];
  return suggestions.flatMap(({ placePrediction: p }) => {
    if (!p?.placeId) return [];
    if (!includeAreas && isAreaSuggestion(p.types)) return [];
    const label = p.structuredFormat?.mainText?.text ?? p.text?.text ?? "";
    if (!label) return [];
    return [
      {
        placeId: p.placeId,
        label,
        detail: p.structuredFormat?.secondaryText?.text ?? "",
      },
    ];
  });
}

export type AddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

type PlaceDetailsResponse = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  addressComponents?: AddressComponent[];
};

/** The long name of the first component with a type, or null. */
export function componentOf(
  components: AddressComponent[],
  type: string,
): string | null {
  const match = components.find((c) => c.types?.includes(type));
  return match?.longText ?? null;
}

/**
 * A place details body as the `Place` snapshot stored on bookings. Null when
 * the essentials are missing or the place is outside Malaysia: the search is
 * restricted to Malaysia, but a place id pasted from elsewhere is not.
 */
export function parsePlace(body: unknown): Place | null {
  const d = body as PlaceDetailsResponse;
  const lat = d.location?.latitude;
  const lng = d.location?.longitude;
  if (!d.id || typeof lat !== "number" || typeof lng !== "number") return null;

  const components = d.addressComponents ?? [];
  const country = components.find((c) => c.types?.includes("country"));
  if (country && country.shortText?.toUpperCase() !== "MY") return null;

  const address = d.formattedAddress ?? "";
  return {
    placeId: d.id,
    label: d.displayName?.text || address.split(",")[0] || d.id,
    address,
    lat,
    lng,
    state: componentOf(components, "administrative_area_level_1"),
    district: componentOf(components, "administrative_area_level_2"),
    locality: componentOf(components, "locality"),
  };
}

type RoutesResponse = {
  routes?: {
    distanceMeters?: number;
    polyline?: { encodedPolyline?: string };
  }[];
};

/**
 * The first route's length in km and its line; null when Google found
 * none, or answered without a line. A route of 0 m, from a point to
 * itself, may come with no distance at all.
 */
export function parseRoute(body: unknown): RoadRoute | null {
  const route = (body as RoutesResponse).routes?.[0];
  const encoded = route?.polyline?.encodedPolyline;
  if (!route || typeof encoded !== "string") return null;
  const line = decodePolyline(encoded);
  if (line.length === 0) return null;
  return { distanceKm: (route.distanceMeters ?? 0) / 1000, line };
}
