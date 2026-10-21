import { db } from "./client";
import type { Prisma } from "./generated/prisma/client";
import {
  checkLocationSlug,
  isPublicState,
  locationStateOf,
} from "./location-input";
import { zoneSearchBox } from "./location-places";
import type { LocationSearch, PlaceCheck } from "./location-search";
import { isPlace, type Place } from "./place";
import { dropoffAllowed, dropoffRuleOf } from "./rates-input";
import { isZoneShape, zoneAt } from "./zone-match";

/**
 * The search card's areas on a location's pages, and the check on a place
 * picked there, on the server: each zone's box is read off the district
 * shapes by ./location-places. The card's own logic is ./location-search. See docs/261015-locations-as-operation-areas.md,
 * "The search card".
 */

const forSearch = {
  select: {
    name: true,
    state: true,
    dropoffRule: true,
    zones: {
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, shape: true },
    },
    zoneRates: {
      select: { fromZoneId: true, toZoneId: true, vehicleClassId: true },
    },
    offerings: {
      where: { isActive: true, vehicleClass: { isActive: true } },
      select: { vehicleClassId: true },
    },
    addresses: { select: { place: true } },
  },
} satisfies Prisma.LocationDefaultArgs;

type SearchRows = Prisma.LocationGetPayload<typeof forSearch>;

/**
 * The zones a route on the grid runs to from each zone, either way, for a
 * class the location has on sale: what "only the routes on the grid" lets
 * a trip from it end in.
 */
function routesOf(rows: SearchRows): Map<string, Set<string>> {
  const onSale = new Set(rows.offerings.map((o) => o.vehicleClassId));
  const routes = new Map<string, Set<string>>();
  const add = (from: string, to: string) => {
    const set = routes.get(from) ?? new Set<string>();
    set.add(to);
    routes.set(from, set);
  };
  for (const cell of rows.zoneRates) {
    if (!onSale.has(cell.vehicleClassId)) continue;
    add(cell.fromZoneId, cell.toZoneId);
    add(cell.toZoneId, cell.fromZoneId);
  }
  return routes;
}

/** The location's zones with a shape. */
const zonesOf = (rows: SearchRows) =>
  rows.zones.flatMap((zone) =>
    isZoneShape(zone.shape) ? [{ ...zone, shape: zone.shape }] : [],
  );

function searchOf(rows: SearchRows): LocationSearch {
  const zones = zonesOf(rows);
  const routes = routesOf(rows);
  return {
    dropoffRule: dropoffRuleOf(rows),
    zones: zones.map((zone) => ({
      id: zone.id,
      box: zoneSearchBox(zone.shape),
      routesTo: [...(routes.get(zone.id) ?? [])],
    })),
    addressZones: Object.fromEntries(
      rows.addresses.flatMap(({ place }) => {
        if (!isPlace(place)) return [];
        const zone = zoneAt(zones, place);
        return zone ? [[place.placeId, zone.id]] : [];
      }),
    ),
  };
}

/**
 * What the search card on the location's pages keeps to; null for a slug
 * no location has. The public pages and the staff preview read the same:
 * a location's zones are its zones, whatever its state.
 */
export async function getLocationSearch(
  slug: string,
): Promise<LocationSearch | null> {
  if (!checkLocationSlug(slug).ok) return null;
  const location = await db.location.findUnique({
    where: { slug },
    ...forSearch,
  });
  return location ? searchOf(location) : null;
}

/** Where a picked place is checked: the pick-up, or the drop-off after the pick-up's zone, when it is known. */
export type PlaceCheckRequest =
  { role: "pickup" } | { role: "dropoff"; pickupZoneId: string | null };

/**
 * Whether a place picked in the search card on the location's pages can
 * be booked there, as the quote will judge it: a pick-up in one of the
 * location's zones, a drop-off where the location's rule lets the trip
 * end. Null for a slug no location has, and for one the public does not
 * see unless `preview`, for staff. The quote stays the last word: the
 * grid is read for any class on sale here, not the tab's category.
 */
export async function checkPlaceAt(
  slug: string,
  place: Place,
  request: PlaceCheckRequest,
  { preview }: { preview: boolean },
): Promise<PlaceCheck | null> {
  if (!checkLocationSlug(slug).ok) return null;
  const location = await db.location.findUnique({
    where: { slug },
    ...forSearch,
  });
  if (!location) return null;
  if (!preview && !isPublicState(locationStateOf(location.state))) return null;

  const zone = zoneAt(zonesOf(location), place);
  if (request.role === "pickup") {
    return zone
      ? { ok: true, zoneId: zone.id }
      : {
          ok: false,
          message: `We do not pick up from ${place.label} yet. Choose a pick-up in ${location.name}.`,
        };
  }

  const rule = dropoffRuleOf(location);
  const onGrid =
    rule !== "grid" ||
    !request.pickupZoneId ||
    (zone !== null &&
      (routesOf(location).get(request.pickupZoneId)?.has(zone.id) ?? false));
  if (rule === "grid" && (!zone || !onGrid)) {
    return {
      ok: false,
      message:
        "We only drive the routes on our price list from that pick-up. Choose another drop-off.",
    };
  }
  if (!dropoffAllowed(rule, zone !== null)) {
    return {
      ok: false,
      message: `We only drop off within ${location.name}. Choose a drop-off there.`,
    };
  }
  return { ok: true, zoneId: zone?.id ?? null };
}
