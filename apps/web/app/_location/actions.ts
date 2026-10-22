"use server";

import { isTripId } from "@repo/db";
import { checkTripAt, getAdminAccess } from "@repo/db/server";
import { resolvePlace } from "@repo/places/server";
import type { TripSearchIssue } from "../_lib/transportation-booking";

/**
 * The check on the places of a trip asked for on a location's pages, when
 * the customer asks for prices: whether the location picks up there, and
 * lets the trip end where it ends, so the card says so at the field
 * instead of the options page after it. Public, like the place search; the
 * staff preview's check reads a location the public does not see, so it
 * asks for the preview's access. Each place's details call carries its
 * field's autocomplete session, which ends it. Arguments are checked for
 * their type here: an action is reachable by direct POST. No verdict, an
 * empty list, for a check that cannot be made: the options page still
 * checks.
 */

/** A place as the card holds it: the id picked, and its field's autocomplete session. */
type PickedPlace = { placeId: string; sessionToken?: string };

const isPicked = (value: unknown): value is PickedPlace => {
  if (typeof value !== "object" || value === null) return false;
  const { placeId, sessionToken } = value as Record<string, unknown>;
  return (
    isTripId(placeId) &&
    (sessionToken === undefined || typeof sessionToken === "string")
  );
};

const UNKNOWN_PLACE =
  "We could not find that place. Choose it from the list again.";

export async function checkTripAction(input: {
  slug: string;
  preview: boolean;
  pickup: PickedPlace;
  dropoff: PickedPlace | null;
}): Promise<TripSearchIssue[]> {
  if (typeof input !== "object" || input === null) return [];
  const { slug, preview, pickup, dropoff } = input;
  if (
    typeof slug !== "string" ||
    typeof preview !== "boolean" ||
    !isPicked(pickup) ||
    (dropoff !== null && !isPicked(dropoff))
  ) {
    return [];
  }
  if (preview) {
    const access = await getAdminAccess("locations.manage");
    if (access.status !== "ok") return [];
  }
  const resolve = (place: PickedPlace) =>
    resolvePlace(place.placeId, {
      sessionToken: place.sessionToken?.slice(0, 64),
    });
  const [from, to] = await Promise.all([
    resolve(pickup),
    dropoff ? resolve(dropoff) : null,
  ]);
  const issues: TripSearchIssue[] = [];
  if (!from) issues.push({ field: "from", message: UNKNOWN_PLACE });
  if (dropoff && !to) issues.push({ field: "to", message: UNKNOWN_PLACE });
  if (!from || (dropoff && !to)) return issues;

  const found = await checkTripAt(
    slug,
    { pickup: from, dropoff: to },
    { preview },
  );
  if (found?.pickup) issues.push({ field: "from", message: found.pickup });
  if (found?.dropoff) issues.push({ field: "to", message: found.dropoff });
  return issues;
}
