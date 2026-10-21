import type { BBox } from "./geo";
import type { DropoffRule } from "./rates-input";

/**
 * What the search card on a location's pages keeps to, pure and
 * browser-safe. The pick-up suggests places in the districts the
 * location's zones lie in: the whole of Langkawi for a location whose
 * zones are three circles on the island, so a hotel the customer knows is
 * found, and Kuala Lumpur's is not. The drop-off follows the location's
 * rule: anywhere in Malaysia, or the same area when a trip must end in the
 * location. A box is all the search can keep to; whether the places picked
 * are served is checked when the customer asks for prices, and by the
 * quote after that. Plain data, because the customer site caches it with
 * the location's pages. See docs/261015-locations-as-operation-areas.md,
 * "The search card".
 */

/**
 * How far past the districts a search reaches, in degrees (about 5 km): a
 * jetty or a beach hotel sits past the shoreline the boundary data draws,
 * as `COAST_KM` allows for a pickup.
 */
export const SEARCH_MARGIN = 0.05;

export type LocationSearch = {
  /**
   * The box the pick-up suggests places in: the zones and the districts
   * they lie in, with the margin. Null for a location with no zone, whose
   * card searches all of Malaysia.
   */
  pickup: BBox | null;
  dropoffRule: DropoffRule;
  /** The Google place ids of the saved addresses that lie in one of the zones. */
  placesInZones: string[];
};

/** The box the drop-off suggests places in: none for "anywhere", the pick-up's when a trip must end in the location. */
export function dropoffBox(search: LocationSearch): BBox | null {
  return search.dropoffRule === "anywhere" ? null : search.pickup;
}

/** Whether the empty drop-off offers the saved address at the place: under a strict rule, only one in a zone. */
export function offersDropoffAddress(
  search: LocationSearch,
  placeId: string,
): boolean {
  return (
    search.dropoffRule === "anywhere" || search.placesInZones.includes(placeId)
  );
}

/** Why the places of a trip cannot be booked from the location; null for one that can. */
export type TripPlaceIssues = {
  pickup: string | null;
  dropoff: string | null;
};
