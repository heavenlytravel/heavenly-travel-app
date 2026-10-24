import { nearestPointOnShape, type LngLat } from "./geo";
import type { OddHours, WeekendSurcharge } from "./rates-input";
import { polygonsOf, zoneAt, type RateCellLike } from "./zone-match";
import {
  nearestZoneByRoad,
  roundKm,
  trimmedKm,
  zoneCandidates,
  type NearestZone,
  type PricingZone,
  type RoadRoute,
  type RoutePoint,
  type TripRouter,
  type ZoneCandidate,
  type ZoneTripMeasure,
} from "./zone-trip";

/**
 * Where a trip's two ends fall among the locations' zones, and what the
 * trip measures, from the rows a quote loads and the router it is handed:
 * pure but for the router, so the quote tests hand it a fake one. The
 * pickup names the location, as before; an end outside every zone takes
 * its nearest zone by road, within the location's furthest extra road.
 * The drop-off maps to the location's own zones, and to the other
 * locations' zones its routes out end at when cross-location is on. When a trace is given, every step is recorded in it with its
 * geometry, for Try a trip. See docs/261023-nearest-zone-pricing.md.
 */

/** A zone as a quote reads it: its shape, a point inside it, and when it last changed. */
export type QuoteZone = PricingZone & { version: string };

/** A public location as a quote reads it. */
export type QuoteLocation = {
  id: string;
  name: string;
  slug: string;
  /** The longest extra road an end may have, in whole km. */
  maxExtraKm: number;
  /** The free extra road of each end, in whole km. */
  freeExtraKm: number;
  /** Whether its routes out to other locations' zones are sold. */
  crossLocation: boolean;
  zones: QuoteZone[];
  /** The other locations' zones its routes out end at. */
  zonesOut: QuoteZone[];
  zoneRates: (RateCellLike & { id?: string })[];
  /** The odd-hours surcharge; null when it has none. */
  oddHours: OddHours | null;
  /** The weekend and holiday surcharge; null when it has none. */
  weekend: WeekendSurcharge | null;
};

/** Nearest-zone answers kept between quotes: an address's zone by road changes only when a zone does. */
export type NearestCache = {
  get(key: string): NearestZone | null | undefined;
  set(key: string, value: NearestZone | null): void;
};

/** How a quote reaches roads: the router, and the cache of nearest zones when the app keeps one. */
export type TripRouting = { route: TripRouter; nearest?: NearestCache };

export type TripEnd = "pickup" | "dropoff";

/** A route the trace draws: its line and the part of it that was measured. */
export type TracedRoute = {
  line: LngLat[];
  distanceKm: number;
  fromKm: number;
  toKm: number;
  km: number;
};

/** One step of a quote, as Try a trip walks through it. */
export type TraceStep =
  | {
      kind: "ends";
      pickup: { at: LngLat; zone: string | null };
      dropoff: { at: LngLat; zone: string | null } | null;
    }
  | {
      kind: "candidates";
      end: TripEnd;
      at: LngLat;
      maxExtraKm: number;
      zones: { name: string; straightKm: number; closest: LngLat }[];
    }
  | {
      kind: "route-to-zone";
      end: TripEnd;
      zone: string;
      target: LngLat;
      line: LngLat[] | null;
      distanceKm: number | null;
      extraKm: number | null;
      entry: LngLat | null;
    }
  | {
      kind: "nearest";
      end: TripEnd;
      zone: string | null;
      extraKm: number | null;
      entry: LngLat | null;
      cached: boolean;
      beaten: { zone: string; extraKm: number | null }[];
    }
  | { kind: "trip"; route: TracedRoute | null }
  | { kind: "grid-trip"; route: TracedRoute | null; from: LngLat; to: LngLat };

/** What a quote recorded: its steps, and the routes it asked the router for. */
export type TripTrace = { steps: TraceStep[]; calls: number };

export function emptyTrace(): TripTrace {
  return { steps: [], calls: 0 };
}

/** An end of the trip placed: its zone, and the road to it when it is outside every zone. */
export type PlacedEnd = { zone: QuoteZone; nearest: NearestZone | null };

export type TripPlacingError = {
  code: "not-served" | "dropoff-outside" | "distance-unavailable";
  /** For the customer. */
  message: string;
  /** Why, in Ops' words, for Try a trip. */
  reason: string;
};

export type TripPlacing =
  | {
      ok: true;
      location: QuoteLocation;
      pickup: PlacedEnd;
      /** Null for hourly hire. */
      dropoff: PlacedEnd | null;
      /** One-way: the full road distance, pin to pin. */
      distanceKm: number | null;
      /** Null when both ends are in zones: the cell is the price. */
      measure: ZoneTripMeasure | null;
    }
  | { ok: false; error: TripPlacingError };

const NOT_SERVED = "We do not serve that area yet. Message us on WhatsApp.";
const NO_ROUTE = "We cannot price that route right now. Try again later.";

const lngLat = (point: { lat: number; lng: number }): LngLat => [
  point.lng,
  point.lat,
];

/** The router, counting each route it is asked for into the trace. */
function counted(route: TripRouter, trace: TripTrace | undefined): TripRouter {
  if (!trace) return route;
  return (from, to) => {
    trace.calls += 1;
    return route(from, to);
  };
}

/** The location whose own zone holds the point, the smallest zone of several, with it. */
function ownZoneAt(
  locations: readonly QuoteLocation[],
  point: { lat: number; lng: number },
) {
  const zone = zoneAt(
    locations.flatMap((location) => location.zones),
    point,
  );
  if (!zone) return null;
  const location = locations.find((l) => l.zones.includes(zone))!;
  return { location, zone };
}

/** A short key for the zones asked about, which changes whenever one of them does. */
function zonesKey(candidates: readonly ZoneCandidate[], maxExtraKm: number) {
  let hash = 2166136261;
  const text = `${maxExtraKm}|${candidates
    .map(({ zone }) => `${zone.id}@${(zone as QuoteZone).version}`)
    .join(",")}`;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

const pointKey = (point: RoutePoint) =>
  point.placeId || `${point.lat.toFixed(6)},${point.lng.toFixed(6)}`;

/** Why no zone was found for an end, in Ops' words. */
function noZoneReason(
  candidates: readonly ZoneCandidate[],
  tried: readonly { extraKm: number | null }[],
  maxExtraKm: number,
) {
  if (candidates.length === 0) {
    return `no zone within the furthest extra road of ${maxExtraKm} km, even in a straight line`;
  }
  const roads = tried.flatMap((t) => (t.extraKm === null ? [] : [t.extraKm]));
  if (roads.length === 0) {
    return "no road reaches a zone: the road would cross the sea";
  }
  return `beyond the furthest extra road: ${Math.min(...roads).toFixed(1)} km, the limit is ${maxExtraKm} km`;
}

/**
 * The nearest zone by road for an end outside every zone, among the
 * candidates, from the cache when it has the answer. Each step is traced.
 */
async function nearestFor(
  end: TripEnd,
  address: RoutePoint,
  candidates: readonly ZoneCandidate[],
  maxExtraKm: number,
  routing: TripRouting,
  route: TripRouter,
  trace: TripTrace | undefined,
): Promise<{ nearest: NearestZone | null; reason: string }> {
  const at = lngLat(address);
  trace?.steps.push({
    kind: "candidates",
    end,
    at,
    maxExtraKm,
    zones: candidates.map(({ zone, straightKm }) => ({
      name: zone.name,
      straightKm: roundKm(straightKm),
      closest: nearestPointOnShape(at, polygonsOf(zone.shape)),
    })),
  });
  const name = (id: string) =>
    candidates.find((c) => c.zone.id === id)?.zone.name ?? null;
  const key = `${pointKey(address)}|${zonesKey(candidates, maxExtraKm)}`;
  const kept = routing.nearest?.get(key);
  if (kept !== undefined) {
    trace?.steps.push({
      kind: "nearest",
      end,
      zone: kept ? name(kept.zoneId) : null,
      extraKm: kept?.extraKm ?? null,
      entry: kept?.entry ?? null,
      cached: true,
      beaten: [],
    });
    return {
      nearest: kept,
      reason: kept ? "" : noZoneReason(candidates, [], maxExtraKm),
    };
  }
  const tried: { zone: string; extraKm: number | null }[] = [];
  const nearest = await nearestZoneByRoad(
    address,
    candidates,
    route,
    (attempt) => {
      tried.push({ zone: attempt.zone.name, extraKm: attempt.extraKm });
      trace?.steps.push({
        kind: "route-to-zone",
        end,
        zone: attempt.zone.name,
        target: attempt.zone.inside,
        line: attempt.route?.line ?? null,
        distanceKm: attempt.route?.distanceKm ?? null,
        extraKm: attempt.extraKm,
        entry: attempt.entry,
      });
    },
  );
  const winner = nearest ? name(nearest.zoneId) : null;
  trace?.steps.push({
    kind: "nearest",
    end,
    zone: winner,
    extraKm: nearest?.extraKm ?? null,
    entry: nearest?.entry ?? null,
    cached: false,
    beaten: tried.filter((t) => t.zone !== winner),
  });
  routing.nearest?.set(key, nearest);
  return {
    nearest,
    reason: nearest ? "" : noZoneReason(candidates, tried, maxExtraKm),
  };
}

const traced = (
  road: RoadRoute,
  part: { fromKm: number; toKm: number; km: number },
): TracedRoute => ({
  line: road.line,
  distanceKm: road.distanceKm,
  fromKm: part.fromKm,
  toKm: part.toKm,
  km: roundKm(part.km),
});

/**
 * Both ends of a trip placed, and the trip measured when an end is
 * outside every zone, or why it cannot be priced. `pinned` keeps the
 * pickup to one location, as Try a trip does on a location's tab.
 */
export async function placeTrip(
  locations: readonly QuoteLocation[],
  trip: { pickup: RoutePoint; dropoff: RoutePoint | null },
  routing: TripRouting,
  { pinned, trace }: { pinned?: QuoteLocation | null; trace?: TripTrace } = {},
): Promise<TripPlacing> {
  const route = counted(routing.route, trace);
  const fail = (
    code: TripPlacingError["code"],
    reason: string,
    message = NOT_SERVED,
  ): TripPlacing => ({ ok: false, error: { code, message, reason } });

  // The pickup: in a zone, or its nearest by road. It names the location.
  const pool = pinned ? [pinned] : locations;
  const pickupIn = ownZoneAt(pool, trip.pickup);
  const dropoffAt = trip.dropoff;
  trace?.steps.push({
    kind: "ends",
    pickup: { at: lngLat(trip.pickup), zone: pickupIn?.zone.name ?? null },
    dropoff: dropoffAt
      ? {
          at: lngLat(dropoffAt),
          zone: ownZoneAt(locations, dropoffAt)?.zone.name ?? null,
        }
      : null,
  });
  let location: QuoteLocation;
  let pickup: PlacedEnd;
  if (pickupIn) {
    location = pickupIn.location;
    pickup = { zone: pickupIn.zone, nearest: null };
  } else {
    const elsewhere = pinned ? ownZoneAt(locations, trip.pickup) : null;
    if (elsewhere) {
      return fail(
        "not-served",
        `the pickup is in ${elsewhere.location.name}'s zone ${elsewhere.zone.name}`,
      );
    }
    const candidates = pool
      .flatMap((l) => zoneCandidates(trip.pickup, l.zones, l.maxExtraKm))
      .sort((x, y) => x.straightKm - y.straightKm);
    const found = await nearestFor(
      "pickup",
      trip.pickup,
      candidates,
      Math.max(0, ...pool.map((l) => l.maxExtraKm)),
      routing,
      route,
      trace,
    );
    if (!found.nearest) return fail("not-served", found.reason);
    const zoneId = found.nearest.zoneId;
    location = pool.find((l) => l.zones.some((z) => z.id === zoneId))!;
    pickup = {
      zone: location.zones.find((z) => z.id === zoneId)!,
      nearest: found.nearest,
    };
  }

  if (!dropoffAt) {
    return {
      ok: true,
      location,
      pickup,
      dropoff: null,
      distanceKm: null,
      measure: null,
    };
  }

  // The drop-off: in a zone the location prices to, or its nearest by road.
  const reach = location.crossLocation
    ? [...location.zones, ...location.zonesOut]
    : location.zones;
  const dropoffIn = zoneAt(reach, dropoffAt);
  let dropoff: PlacedEnd;
  if (dropoffIn) {
    dropoff = { zone: dropoffIn, nearest: null };
  } else {
    const other = ownZoneAt(locations, dropoffAt);
    if (other && other.location.id !== location.id) {
      return fail(
        "dropoff-outside",
        location.crossLocation
          ? `the drop-off is in ${other.location.name}'s zone ${other.zone.name}, and ${location.name} has no route out to it`
          : `the drop-off is in ${other.location.name}, and cross-location is off`,
      );
    }
    const found = await nearestFor(
      "dropoff",
      dropoffAt,
      zoneCandidates(dropoffAt, reach, location.maxExtraKm),
      location.maxExtraKm,
      routing,
      route,
      trace,
    );
    if (!found.nearest) return fail("dropoff-outside", found.reason);
    dropoff = {
      zone: reach.find((z) => z.id === found.nearest!.zoneId)!,
      nearest: found.nearest,
    };
  }

  // The trip, pin to pin: its full distance for the receipt, and, with an
  // end outside every zone, the part measured from the zone edges.
  const full = await route(trip.pickup, dropoffAt);
  if (!full) {
    trace?.steps.push({ kind: "trip", route: null });
    return fail(
      "distance-unavailable",
      "the router found no road between the two pins",
      NO_ROUTE,
    );
  }
  const distanceKm = roundKm(full.distanceKm);
  if (!pickup.nearest && !dropoff.nearest) {
    trace?.steps.push({
      kind: "trip",
      route: traced(full, { fromKm: 0, toKm: full.distanceKm, km: distanceKm }),
    });
    return { ok: true, location, pickup, dropoff, distanceKm, measure: null };
  }

  const tripPart = trimmedKm(
    full,
    pickup.nearest ? null : pickup.zone.shape,
    dropoff.nearest ? null : dropoff.zone.shape,
  );
  trace?.steps.push({ kind: "trip", route: traced(full, tripPart) });

  // The grid trip: the same, between the two stand-ins, the address in a
  // zone or the entry spot of an address outside every zone.
  const standIn = (at: RoutePoint, end: PlacedEnd): RoutePoint =>
    end.nearest ? { lng: end.nearest.entry[0], lat: end.nearest.entry[1] } : at;
  const from = standIn(trip.pickup, pickup);
  const to = standIn(dropoffAt, dropoff);
  const grid = await route(from, to);
  if (!grid) {
    trace?.steps.push({
      kind: "grid-trip",
      route: null,
      from: lngLat(from),
      to: lngLat(to),
    });
    return fail(
      "distance-unavailable",
      "the router found no road between the two stand-ins",
      NO_ROUTE,
    );
  }
  const gridPart = trimmedKm(grid, pickup.zone.shape, dropoff.zone.shape);
  trace?.steps.push({
    kind: "grid-trip",
    route: traced(grid, gridPart),
    from: lngLat(from),
    to: lngLat(to),
  });

  const endOf = (end: PlacedEnd) => ({
    zone: end.zone.name,
    nearest: end.nearest !== null,
    extraKm: end.nearest?.extraKm ?? 0,
  });
  return {
    ok: true,
    location,
    pickup,
    dropoff,
    distanceKm,
    measure: {
      pickup: endOf(pickup),
      dropoff: endOf(dropoff),
      gridTripKm: roundKm(gridPart.km),
      tripKm: roundKm(tripPart.km),
    },
  };
}
