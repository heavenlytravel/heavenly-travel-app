import { db } from "./client";
import type { Prisma } from "./generated/prisma/client";
import { distanceToShapeKm, unionBox, widenBox, type BBox } from "./geo";
import {
  checkLocationSlug,
  isPublicState,
  LOCATION_STATES,
  locationStateOf,
} from "./location-input";
import { zoneSearchBox } from "./location-places";
import {
  SEARCH_MARGIN,
  type LocationSearch,
  type TripPlaceIssues,
} from "./location-search";
import { isPlace, type Place } from "./place";
import { reachableZones } from "./rates-input";
import {
  isZoneShape,
  polygonsOf,
  zoneAt,
  type ZoneLike,
  type ZoneShape,
} from "./zone-match";

/**
 * The search card's areas on a location's pages, and the check on the
 * places of a trip asked for there, on the server: each zone's box is read
 * off the district shapes by ./location-places. The card's own logic is
 * ./location-search. See docs/261015-locations-as-operation-areas.md, "The
 * search card", and docs/261023-nearest-zone-pricing.md.
 */

const zoneFields = { id: true, name: true, shape: true } as const;

const forSearch = {
  select: {
    name: true,
    state: true,
    maxExtraKm: true,
    crossLocation: true,
    zones: {
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: zoneFields,
    },
    addresses: { select: { place: true } },
  },
} satisfies Prisma.LocationDefaultArgs;

type SearchRows = Prisma.LocationGetPayload<typeof forSearch>;

/** The location by its slug, and the other locations' zones its routes out end at. */
function searchRowsOf(slug: string) {
  return Promise.all([
    db.location.findUnique({ where: { slug }, ...forSearch }),
    db.zone.findMany({
      where: {
        location: { slug: { not: slug } },
        ratesTo: { some: { location: { slug } } },
      },
      select: zoneFields,
    }),
  ]);
}

/** The zones of the other public locations: a drop-off in one is theirs, unless a route out reaches it. */
function otherZones(slug: string) {
  return db.zone.findMany({
    where: {
      location: {
        slug: { not: slug },
        state: { in: LOCATION_STATES.filter(isPublicState) },
      },
    },
    select: zoneFields,
  });
}

type ShapedZone = ZoneLike & { shape: ZoneShape };

/** The zones with a shape. */
const zonesOf = (zones: SearchRows["zones"]): ShapedZone[] =>
  zones.flatMap((zone) =>
    isZoneShape(zone.shape) ? [{ ...zone, shape: zone.shape }] : [],
  );

/**
 * Whether a place is in one of the zones, or near enough in a straight
 * line for its road to reach one within the furthest extra road. No road
 * is shorter than the straight line, so a place this refuses the quote
 * would refuse too; one it lets through, the quote judges by road.
 */
function withinReach(
  place: { lat: number; lng: number },
  zones: readonly ShapedZone[],
  maxExtraKm: number,
) {
  if (zoneAt(zones, place)) return true;
  return zones.some(
    (zone) =>
      distanceToShapeKm([place.lng, place.lat], polygonsOf(zone.shape)) <=
      maxExtraKm,
  );
}

/** The box around the zones' boxes, with the margin; null for none. */
function boxAround(boxes: readonly BBox[]): BBox | null {
  return boxes.length > 0 ? widenBox(unionBox(boxes), SEARCH_MARGIN) : null;
}

function searchOf(
  rows: SearchRows,
  elsewhere: SearchRows["zones"],
): LocationSearch {
  const zones = zonesOf(rows.zones);
  const ends = reachableZones(rows.crossLocation, zones, zonesOf(elsewhere));
  // Each zone's box once, the district shapes' arithmetic: the pick-up's
  // zones are among the drop-off's.
  const boxes = new Map<string, BBox>();
  const boxOf = (zone: { id: string; shape: ZoneShape }) => {
    let box = boxes.get(zone.id);
    if (!box) boxes.set(zone.id, (box = zoneSearchBox(zone.shape)));
    return box;
  };
  return {
    pickup: boxAround(zones.map(boxOf)),
    dropoff: boxAround(ends.map(boxOf)),
    dropoffPlaces: rows.addresses.flatMap(({ place }) =>
      isPlace(place) && withinReach(place, ends, rows.maxExtraKm)
        ? [place.placeId]
        : [],
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
  const [location, elsewhere] = await searchRowsOf(slug);
  return location ? searchOf(location, elsewhere) : null;
}

/**
 * Whether the places of a trip asked for on the location's pages can be
 * booked there, as far as can be told without a road: the pick-up in one
 * of the location's zones or near enough to one, the drop-off near enough
 * to a zone the location's trips may end in, a route out of it included,
 * and not in another location's zone it does not price to. Null for a
 * slug no location has, and for one the public does not see unless
 * `preview`, for staff. The quote stays the last word: it measures by
 * road, and reads the grid.
 */
export async function checkTripAt(
  slug: string,
  places: { pickup: Place; dropoff: Place | null },
  { preview }: { preview: boolean },
): Promise<TripPlaceIssues | null> {
  if (!checkLocationSlug(slug).ok) return null;
  const [location, elsewhere] = await searchRowsOf(slug);
  if (!location) return null;
  if (!preview && !isPublicState(locationStateOf(location.state))) return null;

  const zones = zonesOf(location.zones);
  const issues: TripPlaceIssues = {
    pickup: withinReach(places.pickup, zones, location.maxExtraKm)
      ? null
      : `We do not pick up from ${places.pickup.label} yet. Choose a pick-up in ${location.name}.`,
    dropoff: null,
  };
  if (!places.dropoff) return issues;

  const ends = reachableZones(
    location.crossLocation,
    zones,
    zonesOf(elsewhere),
  );
  const theirs =
    !zoneAt(ends, places.dropoff) &&
    zoneAt(zonesOf(await otherZones(slug)), places.dropoff) !== null;
  if (theirs || !withinReach(places.dropoff, ends, location.maxExtraKm)) {
    issues.dropoff = `We do not drive from ${location.name} to ${places.dropoff.label} yet. Choose another drop-off.`;
  }
  return issues;
}
