import { unionBox, widenBox, type BBox } from "./geo";
import type { DropoffRule } from "./rates-input";

/**
 * What the search card on a location's pages keeps to, pure and
 * browser-safe. The pick-up suggests places in the districts the
 * location's zones lie in: the whole of Langkawi for a location whose
 * zones are three circles on the island, so a hotel the customer knows is
 * found and, when it is outside every zone, told so on the spot rather
 * than missing from the list. The drop-off follows the location's rule:
 * anywhere in Malaysia, inside the location, or only where the grid
 * prices a route from the pick-up's zone. A box is all the search can
 * keep to; whether the place picked is served is the check on the pick,
 * and the quote's after it. Plain data, because the customer site caches
 * it with the location's pages. See
 * docs/261015-locations-as-operation-areas.md, "The search card".
 */

/**
 * How far past the districts a search reaches, in degrees (about 5 km): a
 * jetty or a beach hotel sits past the shoreline the boundary data draws,
 * as `COAST_KM` allows for a pickup.
 */
export const SEARCH_MARGIN = 0.05;

/** A zone of the location, as the search card reads it. */
export type LocationSearchZone = {
  id: string;
  /** The box around the zone and the districts it lies in. */
  box: BBox;
  /** The zones the grid prices a route to from this one, either way, for a class on sale. */
  routesTo: string[];
};

export type LocationSearch = {
  dropoffRule: DropoffRule;
  zones: LocationSearchZone[];
  /** The zone each saved address lies in, by its Google place id; one outside every zone is absent. */
  addressZones: Record<string, string>;
};

/** The box around the zones, with the margin; null for none. */
function boxAround(zones: readonly LocationSearchZone[]): BBox | null {
  return zones.length > 0
    ? widenBox(unionBox(zones.map((zone) => zone.box)), SEARCH_MARGIN)
    : null;
}

/** The zones a route on the grid reaches from the zone. */
function reachedFrom(search: LocationSearch, zoneId: string) {
  const routesTo =
    search.zones.find((zone) => zone.id === zoneId)?.routesTo ?? [];
  return search.zones.filter((zone) => routesTo.includes(zone.id));
}

/**
 * The box the pick-up suggests places in: the districts the zones lie in.
 * Null for a location with no zone, whose card searches all of Malaysia.
 */
export function pickupBox(search: LocationSearch): BBox | null {
  return boxAround(search.zones);
}

/**
 * The box the drop-off suggests places in, by the rule: none for
 * "anywhere"; the pick-up's for "inside this location"; for "only the
 * routes on the grid", the districts of the zones a route reaches from
 * the pick-up's zone, once it is known.
 */
export function dropoffBox(
  search: LocationSearch,
  pickupZoneId: string | null,
): BBox | null {
  if (search.dropoffRule === "anywhere") return null;
  if (search.dropoffRule === "grid" && pickupZoneId) {
    return boxAround(reachedFrom(search, pickupZoneId)) ?? pickupBox(search);
  }
  return pickupBox(search);
}

/** Whether the empty drop-off offers the saved address at the place: only where the rule lets a trip end. */
export function offersDropoffAddress(
  search: LocationSearch,
  placeId: string,
  pickupZoneId: string | null,
): boolean {
  if (search.dropoffRule === "anywhere") return true;
  const zoneId = search.addressZones[placeId];
  if (!zoneId) return false;
  if (search.dropoffRule === "zones" || !pickupZoneId) return true;
  return reachedFrom(search, pickupZoneId).some((zone) => zone.id === zoneId);
}

/** What the check on a picked place answers: the zone it falls in, or why it cannot be booked. */
export type PlaceCheck =
  { ok: true; zoneId: string | null } | { ok: false; message: string };
