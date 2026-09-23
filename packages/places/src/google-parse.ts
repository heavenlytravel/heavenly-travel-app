import type { Place } from "@repo/db";
import type { PlaceSuggestion, RoadDistance } from "./types";

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
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
    };
  }[];
};

export function parseSuggestions(body: unknown): PlaceSuggestion[] {
  const suggestions = (body as AutocompleteResponse).suggestions ?? [];
  return suggestions.flatMap(({ placePrediction: p }) => {
    if (!p?.placeId) return [];
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
  routes?: { distanceMeters?: number; duration?: string }[];
};

/** Distance and duration of the first route; null when Google found none. */
export function parseRoute(body: unknown): RoadDistance | null {
  const route = (body as RoutesResponse).routes?.[0];
  if (!route || typeof route.distanceMeters !== "number") return null;
  // Durations arrive as protobuf strings: "4212s".
  const seconds = Number.parseFloat(route.duration ?? "");
  return {
    distanceKm: Math.round(route.distanceMeters / 100) / 10,
    durationMinutes: Number.isFinite(seconds) ? Math.round(seconds / 60) : 0,
  };
}
