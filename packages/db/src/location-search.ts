import type { BBox } from "./geo";

/**
 * Where the search card on a location's pages starts, pure and
 * browser-safe. The card searches all of Malaysia and books any trip, as
 * the home page's does, but puts the places in the location's area first:
 * the districts its zones lie in, the whole of Langkawi for a location
 * whose zones are three circles on the island, so a hotel the customer
 * knows comes before one of the same name elsewhere. Each empty field
 * offers the saved addresses its end of a trip from the location may be
 * at. Which location prices a trip, and whether one does, is the options
 * page's to say, as for a trip asked for on the home page. Plain data,
 * because the customer site caches it with the location's pages. See
 * docs/261015-locations-as-operation-areas.md, "The search card", and
 * docs/261025-marketing-pages.md.
 */

/**
 * How far past the districts a search reaches, in degrees (about 5 km): a
 * jetty or a beach hotel sits past the shoreline the boundary data draws,
 * as `COAST_KM` allows for a pickup.
 */
export const SEARCH_MARGIN = 0.05;

export type LocationSearch = {
  /**
   * The box whose places the place fields suggest first: the zones and the
   * districts they lie in, with the margin. Null for a location with no
   * zone, whose card suggests as the home page's.
   */
  near: BBox | null;
  /** The Google place ids of the saved addresses a pickup is served at. */
  pickupPlaces: string[];
  /** The Google place ids of the saved addresses a trip from the location may end at, by its drop-off rule. */
  dropoffPlaces: string[];
};

/** Whether the empty pick-up offers the saved address at the place: only one a pickup is served at. */
export function offersPickupAddress(
  search: LocationSearch,
  placeId: string,
): boolean {
  return search.pickupPlaces.includes(placeId);
}

/** Whether the empty drop-off offers the saved address at the place: only one a trip may end at. */
export function offersDropoffAddress(
  search: LocationSearch,
  placeId: string,
): boolean {
  return search.dropoffPlaces.includes(placeId);
}
