import "server-only";
import { resolveDistrict } from "@repo/db/server";
import { resolvePlace } from "@repo/places/server";

/** What the console learns about a place an admin picked from the search. */
export type PlaceCheck =
  | { ok: false; error: string }
  | {
      ok: true;
      label: string;
      address: string;
      lat: number;
      lng: number;
      /** The district the point falls in, or null at sea or outside Malaysia. */
      district: {
        code: string;
        name: string;
        isActive: boolean;
        stateCode: string;
        stateName: string;
      } | null;
    };

/**
 * Places a picked place by its coordinates, exactly as a booking would. The
 * caller has checked the admin's permission.
 */
export async function checkPlace(placeId: unknown): Promise<PlaceCheck> {
  if (typeof placeId !== "string" || !placeId) {
    return { ok: false, error: "Pick a place from the list." };
  }
  const place = await resolvePlace(placeId);
  if (!place) {
    return { ok: false, error: "Google did not return that place." };
  }
  const district = await resolveDistrict(place);
  return {
    ok: true,
    label: place.label,
    address: place.address,
    lat: place.lat,
    lng: place.lng,
    district: district
      ? {
          code: district.code,
          name: district.name,
          isActive: district.isActive,
          stateCode: district.state.code,
          stateName: district.state.name,
        }
      : null,
  };
}
