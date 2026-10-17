import { db } from "./client";
import { districtCodeAt } from "./district-index";
import type { District, Prisma, State } from "./generated/prisma/client";
import { isPublicState, locationStateOf } from "./location-input";
import { zoneAt, zoneShapeArea, type ZoneShape } from "./zone-match";

export type { District, State };

/**
 * Coverage: where the site serves a pickup. A location draws its zones,
 * and a pickup is served when it falls in a zone of a location that is
 * public; that location's offerings, zones and rates price the trip.
 * Malaysia's states and districts are a fixed list, seeded from
 * data/malaysia-districts.json: a location ticks the states it lies in,
 * and a booking records the district its pickup fell in. See
 * docs/261015-locations-as-operation-areas.md, "Coverage is the zones".
 */

/** Every state, by name, for the location form's picker. */
export function listStates(): Promise<State[]> {
  return db.state.findMany({ orderBy: { name: "asc" } });
}

const withState = {
  include: { state: true },
} satisfies Prisma.DistrictDefaultArgs;

/** A district with its state. */
export type DistrictWithState = Prisma.DistrictGetPayload<typeof withState>;

/** Every district with its state, by state then name. */
export function listDistricts(): Promise<DistrictWithState[]> {
  return db.district.findMany({
    ...withState,
    orderBy: [{ state: { name: "asc" } }, { name: "asc" }],
  });
}

/**
 * The district a place falls in, for the record, or null when the point
 * is in no district: at sea, or a place the seed has not created yet.
 */
export async function resolveDistrict(place: {
  lat: number;
  lng: number;
}): Promise<DistrictWithState | null> {
  const code = districtCodeAt(place.lat, place.lng);
  if (!code) return null;
  return db.district.findUnique({ where: { code }, ...withState });
}

/** What pricing reads of a location: its zones, its grid and its rules. */
export const forQuote = {
  include: {
    zones: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    zoneRates: true,
  },
} satisfies Prisma.LocationDefaultArgs;

export type LocationForQuote = Prisma.LocationGetPayload<typeof forQuote>;

/** A served pickup: the zone it fell in and the location that zone is. */
export type ServedAt = {
  location: LocationForQuote;
  zone: LocationForQuote["zones"][number];
};

/**
 * The location that serves a pickup at the place: the one whose zone the
 * point falls in, among the locations that are public. Of zones that
 * overlap, the smallest wins, as it does within one location. Null when
 * no zone holds the point: the area is not served.
 */
export async function locationAt(place: {
  lat: number;
  lng: number;
}): Promise<ServedAt | null> {
  const locations = await db.location.findMany(forQuote);
  let served: ServedAt | null = null;
  let servedArea = Infinity;
  for (const location of locations) {
    if (!isPublicState(locationStateOf(location.state))) continue;
    const zone = zoneAt(location.zones, place);
    if (!zone) continue;
    // `zoneAt` answered the zone, so its shape is a shape.
    const area = zoneShapeArea(zone.shape as ZoneShape);
    if (area < servedArea) {
      served = { location, zone };
      servedArea = area;
    }
  }
  return served;
}
