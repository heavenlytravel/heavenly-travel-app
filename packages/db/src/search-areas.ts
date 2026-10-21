import { db } from "./client";
import type { Prisma } from "./generated/prisma/client";
import { unionBox, widenBox, type BBox } from "./geo";
import {
  checkLocationSlug,
  isPublicState,
  locationStateOf,
} from "./location-input";
import { zoneSearchBox } from "./location-places";
import {
  SEARCH_MARGIN,
  type LocationSearch,
  type TripPlaceIssues,
} from "./location-search";
import { isPlace, type Place } from "./place";
import { dropoffAllowed, dropoffRuleOf, type DropoffRule } from "./rates-input";
import { isZoneShape, zoneAt, type ZoneShape } from "./zone-match";

/**
 * The search card's areas on a location's pages, and the check on the
 * places of a trip asked for there, on the server: each zone's box is read
 * off the district shapes by ./location-places. The card's own logic is
 * ./location-search. See docs/261015-locations-as-operation-areas.md, "The
 * search card".
 */

const forSearch = {
  select: {
    name: true,
    state: true,
    dropoffRule: true,
    zones: {
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, shape: true, takesPickups: true },
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

/** The box around the zones and the districts they lie in, with the margin; null for none. */
function boxAround(zones: readonly { shape: ZoneShape }[]): BBox | null {
  return zones.length > 0
    ? widenBox(
        unionBox(zones.map((zone) => zoneSearchBox(zone.shape))),
        SEARCH_MARGIN,
      )
    : null;
}

/**
 * The zones a one-way trip may end in under a strict rule: those that take
 * pickups for "inside this location only", any of the location's,
 * destinations included, for "only the routes on the grid".
 */
const endZonesOf = <Z extends { takesPickups: boolean }>(
  rule: DropoffRule,
  zones: readonly Z[],
) => (rule === "zones" ? zones.filter((zone) => zone.takesPickups) : zones);

function searchOf(rows: SearchRows): LocationSearch {
  const zones = zonesOf(rows);
  const rule = dropoffRuleOf(rows);
  const ends = endZonesOf(rule, zones);
  return {
    pickup: boxAround(zones.filter((zone) => zone.takesPickups)),
    dropoff: rule === "anywhere" ? null : boxAround(ends),
    dropoffRule: rule,
    dropoffPlaces:
      rule === "anywhere"
        ? []
        : rows.addresses.flatMap(({ place }) =>
            isPlace(place) && zoneAt(ends, place) ? [place.placeId] : [],
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

/**
 * Whether the places of a trip asked for on the location's pages can be
 * booked there, as the quote will judge them: the pick-up in one of the
 * location's zones that take pickups, the drop-off where the location's
 * rule lets the trip end. Null for a slug no location has, and for one the public does not
 * see unless `preview`, for staff. The quote stays the last word: the grid
 * is read for any class on sale here, not the tab's category.
 */
export async function checkTripAt(
  slug: string,
  places: { pickup: Place; dropoff: Place | null },
  { preview }: { preview: boolean },
): Promise<TripPlaceIssues | null> {
  if (!checkLocationSlug(slug).ok) return null;
  const location = await db.location.findUnique({
    where: { slug },
    ...forSearch,
  });
  if (!location) return null;
  if (!preview && !isPublicState(locationStateOf(location.state))) return null;

  const zones = zonesOf(location);
  const pickupZone = zoneAt(
    zones.filter((zone) => zone.takesPickups),
    places.pickup,
  );
  const issues: TripPlaceIssues = {
    pickup: pickupZone
      ? null
      : `We do not pick up from ${places.pickup.label} yet. Choose a pick-up in ${location.name}.`,
    dropoff: null,
  };
  if (!places.dropoff) return issues;

  const rule = dropoffRuleOf(location);
  const zone = zoneAt(endZonesOf(rule, zones), places.dropoff);
  if (rule === "grid") {
    // A pick-up outside every zone is its own reason; the drop-off need
    // only be in a zone then.
    const onGrid =
      zone !== null &&
      (!pickupZone ||
        (routesOf(location).get(pickupZone.id)?.has(zone.id) ?? false));
    if (!onGrid) {
      issues.dropoff =
        "We only drive the routes on our price list from that pick-up. Choose another drop-off.";
    }
  } else if (!dropoffAllowed(rule, zone !== null)) {
    issues.dropoff = `We only drop off within ${location.name}. Choose a drop-off there.`;
  }
  return issues;
}
