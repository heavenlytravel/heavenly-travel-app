import type { BBox } from "./geo";

/**
 * What the search card on a location's pages keeps to, pure and
 * browser-safe. The pick-up suggests places in the districts the
 * location's zones lie in: the whole of Langkawi for a location whose
 * zones are three circles on the island, so a hotel the customer knows is
 * found, and Kuala Lumpur's is not. The drop-off keeps to the zones the
 * location's trips may end in: its own, and the other locations' zones its
 * routes out end at when trips across locations are on. A box is all the
 * search can keep to; whether the places picked are served is checked
 * when the customer asks for prices, and by the quote after that. Plain data, because the customer site
 * caches it with the location's pages. See docs/261015-locations-as-operation-areas.md,
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
  /** The box the drop-off suggests places in; null for a location with no zone, as the pick-up. */
  dropoff: BBox | null;
  /** The Google place ids of the saved addresses a trip may end at. */
  dropoffPlaces: string[];
};

/** Whether the empty drop-off offers the saved address at the place: only one a trip may end at. */
export function offersDropoffAddress(
  search: LocationSearch,
  placeId: string,
): boolean {
  return search.dropoffPlaces.includes(placeId);
}

/** Why the places of a trip cannot be booked from the location; null for one that can. */
export type TripPlaceIssues = {
  pickup: string | null;
  dropoff: string | null;
};
