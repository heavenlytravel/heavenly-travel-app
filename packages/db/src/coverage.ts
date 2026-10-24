import { db } from "./client";
import { districtCodeAt } from "./district-index";
import type { District, Prisma, State, Zone } from "./generated/prisma/client";
import { pointOnSurface } from "./geo";
import { isPublicState, LOCATION_STATES } from "./location-input";
import { oddHoursOf, weekendOf } from "./rates-input";
import type { QuoteLocation, QuoteZone } from "./zone-quote";
import {
  isZoneShape,
  polygonsOf,
  zoneAt,
  zoneShapeArea,
  type ZoneShape,
} from "./zone-match";

export type { District, State };

/**
 * Coverage: where the site serves a pickup. A location draws its zones,
 * and a pickup is served by a location that is public when it falls in
 * one of its zones, or when its nearest zone by road is one; that
 * location's offerings, zones and rates price the trip.
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

const withZones = {
  include: {
    zones: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
  },
} satisfies Prisma.LocationDefaultArgs;

/** The states a location serves pickups in. */
const PUBLIC_STATES = LOCATION_STATES.filter(isPublicState);

/** A zone as a quote reads it, its shape checked and a point inside it found. */
function quoteZoneOf(zone: Zone): QuoteZone | null {
  if (!isZoneShape(zone.shape)) return null;
  return {
    id: zone.id,
    name: zone.name,
    shape: zone.shape,
    inside: pointOnSurface(polygonsOf(zone.shape)),
    version: zone.updatedAt.toISOString(),
  };
}

/**
 * Every public location as a quote reads it: its zones, its whole grid,
 * the other locations' zones its routes out end at, its two settings on
 * where trips may go and its surcharge. A quote places both ends of a trip
 * among them (./zone-quote). `alsoId` adds one location whatever its
 * state, for Try a trip on a location not yet live. See
 * docs/261023-nearest-zone-pricing.md.
 */
export async function listQuoteLocations(
  alsoId?: string,
): Promise<QuoteLocation[]> {
  const locations = await db.location.findMany({
    where: {
      OR: [
        { state: { in: PUBLIC_STATES } },
        ...(alsoId ? [{ id: alsoId }] : []),
      ],
    },
    include: { ...withZones.include, zoneRates: true },
  });
  const own = new Set(locations.flatMap((l) => l.zones.map((z) => z.id)));
  const outIds = [
    ...new Set(
      locations.flatMap((l) =>
        l.zoneRates.flatMap((rate) =>
          l.zones.some((z) => z.id === rate.toZoneId) ? [] : [rate.toZoneId],
        ),
      ),
    ),
  ];
  // A route out may end at a zone of a location the public does not see.
  const missing = outIds.filter((id) => !own.has(id));
  const far = new Map(
    [
      ...locations.flatMap((l) => l.zones),
      ...(missing.length > 0
        ? await db.zone.findMany({ where: { id: { in: missing } } })
        : []),
    ].map((zone) => [zone.id, zone]),
  );
  const zonesOf = (zones: readonly Zone[]) =>
    zones.flatMap((zone) => quoteZoneOf(zone) ?? []);
  return locations.map((location) => {
    const ownIds = new Set(location.zones.map((z) => z.id));
    const outs = [
      ...new Set(
        location.zoneRates.flatMap((rate) =>
          ownIds.has(rate.toZoneId) ? [] : [rate.toZoneId],
        ),
      ),
    ].flatMap((id) => far.get(id) ?? []);
    return {
      id: location.id,
      name: location.name,
      slug: location.slug,
      maxExtraKm: location.maxExtraKm,
      freeExtraKm: location.freeExtraKm,
      crossLocation: location.crossLocation,
      zones: zonesOf(location.zones),
      zonesOut: zonesOf(outs),
      zoneRates: location.zoneRates,
      oddHours: oddHoursOf(location),
      weekend: weekendOf(location),
    };
  });
}

/** A pickup placed by its point: the zone it falls in and the location that zone is. */
export type ServedAt = {
  location: Prisma.LocationGetPayload<typeof withZones>;
  zone: Zone;
};

/**
 * The location whose zone holds a point, among the locations that are
 * public. Zones never overlap; of two from before that rule, the smallest
 * wins. Null when no zone holds the point. A quote serves a pickup outside
 * every zone too, by its nearest zone by road; this is where the point
 * itself falls, for "Test an address".
 */
export async function locationAt(place: {
  lat: number;
  lng: number;
}): Promise<ServedAt | null> {
  const locations = await db.location.findMany({
    where: { state: { in: PUBLIC_STATES } },
    ...withZones,
  });
  let best: {
    location: ServedAt["location"];
    zone: Zone;
    area: number;
  } | null = null;
  for (const location of locations) {
    const zone = zoneAt(location.zones, place);
    if (!zone) continue;
    // `zoneAt` answered the zone, so its shape is a shape.
    const area = zoneShapeArea(zone.shape as ZoneShape);
    if (!best || area < best.area) best = { location, zone, area };
  }
  return best ? { location: best.location, zone: best.zone } : null;
}
