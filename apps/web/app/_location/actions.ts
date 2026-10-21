"use server";

import {
  checkPlaceAt,
  getAdminAccess,
  type PlaceCheck,
  type PlaceCheckRequest,
} from "@repo/db/server";
import { resolvePlace } from "@repo/places/server";

/**
 * The check on a place picked in the search card of a location's pages:
 * whether the location serves it as a pick-up, or lets a trip end there,
 * so the field says so at once instead of the options page after the
 * search. Public, like the place search; the staff preview's check reads a
 * location the public does not see, so it asks for the preview's access.
 * The details call carries the field's autocomplete session, which ends
 * it. Arguments are checked for their type here: an action is reachable
 * by direct POST.
 */

const UNKNOWN_PLACE: PlaceCheck = {
  ok: false,
  message: "We could not find that place. Choose it from the list again.",
};

export async function checkPlaceAction(input: {
  slug: string;
  placeId: string;
  sessionToken?: string;
  check: PlaceCheckRequest;
  preview: boolean;
}): Promise<PlaceCheck | null> {
  if (typeof input !== "object" || input === null) return null;
  const { slug, placeId, sessionToken, check, preview } = input;
  if (
    typeof slug !== "string" ||
    typeof placeId !== "string" ||
    !placeId ||
    (sessionToken !== undefined && typeof sessionToken !== "string") ||
    typeof preview !== "boolean" ||
    typeof check !== "object" ||
    check === null ||
    (check.role !== "pickup" && check.role !== "dropoff") ||
    (check.role === "dropoff" &&
      check.pickupZoneId !== null &&
      typeof check.pickupZoneId !== "string")
  ) {
    return null;
  }
  if (preview) {
    const access = await getAdminAccess("locations.manage");
    if (access.status !== "ok") return null;
  }
  const place = await resolvePlace(placeId, {
    sessionToken: sessionToken?.slice(0, 64),
  });
  if (!place) return UNKNOWN_PLACE;
  return checkPlaceAt(
    slug,
    place,
    check.role === "pickup"
      ? { role: "pickup" }
      : { role: "dropoff", pickupZoneId: check.pickupZoneId },
    { preview },
  );
}
