import { db } from "./client";
import type { Prisma } from "./generated/prisma/client";
import { distanceToShapeKm, unionBox, widenBox, type BBox } from "./geo";
import { checkLocationSlug } from "./location-input";
import { zoneSearchBox } from "./location-places";
import { SEARCH_MARGIN, type LocationSearch } from "./location-search";
import { isPlace } from "./place";
import { reachableZones } from "./rates-input";
import {
  isZoneShape,
  polygonsOf,
  zoneAt,
  type ZoneLike,
  type ZoneShape,
} from "./zone-match";

/**
 * Where the search card on a location's pages starts, on the server: each
 * zone's box is read off the district shapes by ./location-places, and
 * each saved address is held to the zones a trip from the location may
 * start or end in. The card's own logic is ./location-search. See
 * docs/261015-locations-as-operation-areas.md, "The search card", and
 * docs/261023-nearest-zone-pricing.md.
 */

const zoneFields = { id: true, name: true, shape: true } as const;

const forSearch = {
  select: {
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
  // The saved addresses within reach of the zones a trip may start in, or
  // end in by the location's drop-off rule.
  const placesWithin = (reach: readonly ShapedZone[]) =>
    rows.addresses.flatMap(({ place }) =>
      isPlace(place) && withinReach(place, reach, rows.maxExtraKm)
        ? [place.placeId]
        : [],
    );
  return {
    near: boxAround(zones.map((zone) => zoneSearchBox(zone.shape))),
    pickupPlaces: placesWithin(zones),
    dropoffPlaces: placesWithin(ends),
  };
}

/**
 * Where the search card on the location's pages starts; null for a slug
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
