"use server";

import { locationAt, resolveDistrict } from "@repo/db/server";
import { resolvePlace } from "@repo/places/server";
import { getAdmin } from "../_lib/access";
import { FORBIDDEN_MESSAGE } from "@repo/console/action-state";

/** What "Test an address" learns about a place the admin picked. */
export type AddressTest =
  | { ok: false; error: string }
  | {
      ok: true;
      address: string;
      lat: number;
      lng: number;
      /** The district the point falls in, for the record; null at sea or outside Malaysia. */
      district: { name: string; stateName: string } | null;
      /** The zone the point falls in and the location it is, or null when no public location serves it. */
      served: {
        location: { id: string; name: string; slug: string };
        zone: string;
      } | null;
    };

/**
 * Places a picked address by its coordinates, exactly as a booking would:
 * the zone it falls in and the location that serves it, with the district
 * for the record. For any admin, since every team opens a location.
 */
export async function testAddressAction(placeId: string): Promise<AddressTest> {
  const admin = await getAdmin("locations.view");
  if (!admin) return { ok: false, error: FORBIDDEN_MESSAGE };
  if (typeof placeId !== "string" || !placeId) {
    return { ok: false, error: "Pick a place from the list." };
  }
  const place = await resolvePlace(placeId);
  if (!place) {
    return { ok: false, error: "Google did not return that place." };
  }
  const [district, served] = await Promise.all([
    resolveDistrict(place),
    locationAt(place),
  ]);
  return {
    ok: true,
    address: place.address,
    lat: place.lat,
    lng: place.lng,
    district: district
      ? { name: district.name, stateName: district.state.name }
      : null,
    served: served
      ? {
          location: {
            id: served.location.id,
            name: served.location.name,
            slug: served.location.slug,
          },
          zone: served.zone.name,
        }
      : null,
  };
}
