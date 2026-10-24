import { distanceToShapeKm, type LngLat } from "./geo";
import {
  pointInZoneShape,
  polygonsOf,
  ringsOf,
  type ZoneShape,
} from "./zone-match";

/**
 * Nearest-zone pricing, pure and browser-safe but for the router it is
 * handed: every one-way trip is one cell of the rate grid, plus the road
 * past a zone's edge when the trip really goes past it. An end inside a
 * zone uses that zone; an end outside every zone takes the first zone its
 * road reaches, its nearest by road. Distances are measured from the zone
 * edges, on the lines the router answers. See
 * docs/261023-nearest-zone-pricing.md.
 */

/** A road as the router answers it: its length in km, and its line on the map. */
export type RoadRoute = { distanceKm: number; line: LngLat[] };

/** Where a route starts or ends: a point, and the place there when there is one; "" for none. */
export type RoutePoint = { lat: number; lng: number; placeId?: string };

/** The road between two points, or null when no road joins them. */
export type TripRouter = (
  from: RoutePoint,
  to: RoutePoint,
) => Promise<RoadRoute | null>;

/** A zone as nearest-zone pricing reads it: its shape, and a point inside it to route to. */
export type PricingZone = {
  id: string;
  name: string;
  shape: ZoneShape;
  /** A point surely inside the shape, [lng, lat]. */
  inside: LngLat;
};

const EARTH_KM = 6371.0088;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** The great-circle distance between two points, in km. */
export function kmBetween(a: LngLat, b: LngLat): number {
  const dLat = toRadians(b[1] - a[1]);
  const dLng = toRadians(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a[1])) *
      Math.cos(toRadians(b[1])) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The length of a line, in km. */
export function lineKm(line: readonly LngLat[]): number {
  let km = 0;
  for (let i = 1; i < line.length; i++) km += kmBetween(line[i - 1]!, line[i]!);
  return km;
}

/** Where segment a-b meets segment c-d, as the share of a-b; null when they do not meet. */
function crossingShare(a: LngLat, b: LngLat, c: LngLat, d: LngLat) {
  const rx = b[0] - a[0];
  const ry = b[1] - a[1];
  const sx = d[0] - c[0];
  const sy = d[1] - c[1];
  const denominator = rx * sy - ry * sx;
  if (denominator === 0) return null;
  const qx = c[0] - a[0];
  const qy = c[1] - a[1];
  const t = (qx * sy - qy * sx) / denominator;
  const u = (qx * ry - qy * rx) / denominator;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : null;
}

/** A stretch of a route, from and to a distance along it in the router's km. */
export type Stretch = [fromKm: number, toKm: number];

/**
 * The stretches of a route inside a shape, in order, in the router's km:
 * the line's own length is scaled to the distance the router answered, so
 * the parts add up to it. Each segment is cut where it crosses the shape's
 * rings, and each piece is tested at its middle, so a line through a
 * corner or along an edge is still read right.
 */
export function stretchesInside(route: RoadRoute, shape: ZoneShape): Stretch[] {
  const { line } = route;
  const total = lineKm(line);
  if (line.length === 0) return [];
  const scale = total > 0 ? route.distanceKm / total : 0;
  const rings = ringsOf(shape);
  const inside = (point: LngLat) => pointInZoneShape(point, shape);

  const stretches: Stretch[] = [];
  let state = inside(line[0]!);
  let start = 0;
  let along = 0;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    const length = kmBetween(a, b);
    const cuts: number[] = [];
    for (const ring of rings) {
      for (let j = 1; j < ring.length; j++) {
        const t = crossingShare(a, b, ring[j - 1]!, ring[j]!);
        if (t !== null) cuts.push(t);
      }
    }
    if (cuts.length > 0) {
      const marks = [0, ...cuts.sort((x, y) => x - y), 1];
      for (let k = 1; k < marks.length; k++) {
        const from = marks[k - 1]!;
        const to = marks[k]!;
        if (to - from < 1e-12) continue;
        const middle = (from + to) / 2;
        const now = inside([
          a[0] + (b[0] - a[0]) * middle,
          a[1] + (b[1] - a[1]) * middle,
        ]);
        if (now === state) continue;
        const km = along + from * length;
        if (now) start = km;
        else stretches.push([start * scale, km * scale]);
        state = now;
      }
    }
    along += length;
  }
  if (state) stretches.push([start * scale, along * scale]);
  return stretches;
}

/** Where the route first enters the stretches, at or after `afterKm`; null when it never does. */
export function firstEntryKm(
  stretches: readonly Stretch[],
  afterKm = 0,
): number | null {
  for (const [from, to] of stretches) {
    if (to >= afterKm) return Math.max(from, afterKm);
  }
  return null;
}

/** Where the route last leaves the stretches: the end of the last one; 0 when there are none. */
export function lastExitKm(stretches: readonly Stretch[]): number {
  return stretches.at(-1)?.[1] ?? 0;
}

/** The point at a distance along the route, in the router's km. */
export function pointAtKm(route: RoadRoute, km: number): LngLat {
  const { line } = route;
  const total = lineKm(line);
  if (line.length === 0) throw new RangeError("a route has a line");
  const target = route.distanceKm > 0 ? (km / route.distanceKm) * total : 0;
  let along = 0;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    const length = kmBetween(a, b);
    if (along + length >= target && length > 0) {
      const share = (target - along) / length;
      return [a[0] + (b[0] - a[0]) * share, a[1] + (b[1] - a[1]) * share];
    }
    along += length;
  }
  return line.at(-1)!;
}

/** The part of a route between two distances along it, in the router's km: what a map draws of it. */
export function lineBetweenKm(
  route: RoadRoute,
  fromKm: number,
  toKm: number,
): LngLat[] {
  const { line } = route;
  if (line.length === 0 || toKm <= fromKm) return [];
  const total = lineKm(line);
  const scale = route.distanceKm > 0 ? total / route.distanceKm : 0;
  const from = fromKm * scale;
  const to = toKm * scale;
  const part: LngLat[] = [pointAtKm(route, fromKm)];
  let along = 0;
  for (let i = 1; i < line.length; i++) {
    along += kmBetween(line[i - 1]!, line[i]!);
    if (along > from && along < to) part.push(line[i]!);
  }
  part.push(pointAtKm(route, toKm));
  return part;
}

/**
 * The part of a route measured for a trip: from where it last leaves the
 * zone it starts in, when it starts in one, to where it next enters the
 * zone it ends in, when it ends in one. Null for no zone at that end: the
 * route's own start or end. Km in the router's.
 */
export function trimmedKm(
  route: RoadRoute,
  fromShape: ZoneShape | null,
  toShape: ZoneShape | null,
): { fromKm: number; toKm: number; km: number } {
  const fromKm = fromShape ? lastExitKm(stretchesInside(route, fromShape)) : 0;
  const toKm = toShape
    ? (firstEntryKm(stretchesInside(route, toShape), fromKm) ??
      route.distanceKm)
    : route.distanceKm;
  return { fromKm, toKm, km: Math.max(0, toKm - fromKm) };
}

/** Kilometres kept to the metre: what the receipt stores and the fare is worked from. */
export const roundKm = (km: number) => Math.round(km * 1000) / 1000;

/** An end of a trip outside every zone, and the zone its road reaches first. */
export type NearestZone = {
  zoneId: string;
  /** The road from the address to the zone's edge, in km. */
  extraKm: number;
  /** Where that road meets the zone's edge, [lng, lat]. */
  entry: LngLat;
};

/** A zone asked about for an address, with its location's furthest extra road. */
export type ZoneCandidate = {
  zone: PricingZone;
  straightKm: number;
  maxExtraKm: number;
};

/**
 * The zones that may be an address's nearest by road, nearest in a
 * straight line first: those within the furthest extra road in a straight
 * line, which no road can beat.
 */
export function zoneCandidates(
  address: { lat: number; lng: number },
  zones: readonly PricingZone[],
  maxExtraKm: number,
): ZoneCandidate[] {
  const point: LngLat = [address.lng, address.lat];
  return zones
    .map((zone) => ({
      zone,
      straightKm: distanceToShapeKm(point, polygonsOf(zone.shape)),
      maxExtraKm,
    }))
    .filter((candidate) => candidate.straightKm <= maxExtraKm)
    .sort((a, b) => a.straightKm - b.straightKm);
}

/** What routing to one candidate zone found: its extra road, or no road to it. */
export type ZoneTry = {
  zone: PricingZone;
  straightKm: number;
  route: RoadRoute | null;
  /** The road to the zone's edge; null when no road reaches it. */
  extraKm: number | null;
  entry: LngLat | null;
};

/**
 * The zone an address outside every zone takes: the first its road
 * reaches, by road. The candidates are routed to in straight-line order,
 * to a point inside each, and the road's first entry into the zone is its
 * edge. It stops when the next candidate is further in a straight line
 * than the shortest extra road found, since no road is shorter than the
 * straight line, so no zone left unasked could be nearer. Null when no
 * road reaches a zone within its location's furthest extra road. `tried`
 * hears each route as it is made.
 */
export async function nearestZoneByRoad(
  address: RoutePoint,
  candidates: readonly ZoneCandidate[],
  route: TripRouter,
  tried?: (attempt: ZoneTry) => void,
): Promise<NearestZone | null> {
  let best: NearestZone | null = null;
  for (const { zone, straightKm, maxExtraKm } of candidates) {
    if (best && straightKm > best.extraKm) break;
    const road = await route(address, {
      lng: zone.inside[0],
      lat: zone.inside[1],
    });
    const entryKm = road
      ? firstEntryKm(stretchesInside(road, zone.shape))
      : null;
    const extraKm = entryKm === null ? null : roundKm(entryKm);
    const entry = road && entryKm !== null ? pointAtKm(road, entryKm) : null;
    tried?.({ zone, straightKm, route: road, extraKm, entry });
    if (extraKm === null || entry === null || extraKm > maxExtraKm) continue;
    if (!best || extraKm < best.extraKm) {
      best = { zoneId: zone.id, extraKm, entry };
    }
  }
  return best;
}

/** An end of a priced trip: its zone, whether it is the nearest by road, and the road past its edge. */
export type ZoneTripEnd = { zone: string; nearest: boolean; extraKm: number };

/** What a trip with an end outside every zone measured, as its receipt keeps it. */
export type ZoneTripMeasure = {
  pickup: ZoneTripEnd;
  dropoff: ZoneTripEnd;
  /** From the first zone's edge or entry spot to the second's, in km. */
  gridTripKm: number;
  /** From the first zone's edge or address to the second's, in km. */
  tripKm: number;
};

/** The receipt's account of nearest-zone pricing: the measure, the rate and what it added. */
export type ZoneTripCharge = ZoneTripMeasure & {
  /** The class's rate per extra km when priced. */
  perKmSen: number;
  /** The free extra road of each end outside every zone, in whole km. */
  freeKm: number;
  /** The km charged at the rate: whole km since the free extra road; 0 when none. */
  chargedKm: number;
  /** 0 when the trip was not longer than the grid trip. */
  extraSen: number;
};

/**
 * Whether the extra is capped at what the trip adds over the grid trip.
 * Off: the whole extra road, as agreed with the CEO on 2026-10-23. The cap
 * is proposed and open (docs/261023-nearest-zone-pricing.md, "A trip that
 * does not pass through the nearest zone"); the answer is this one line.
 */
export const EXTRA_CAPPED = false;

/**
 * The km of extra road charged for a trip longer than its grid trip: the
 * extra road past the free km, or, capped, the smaller of it and what the
 * trip adds over the grid trip.
 */
export function chargedExtraKm(extraKm: number, addedKm: number): number {
  return EXTRA_CAPPED ? roundKm(Math.min(extraKm, addedKm)) : extraKm;
}

/** The extra road both ends add: the road past the edge of each end outside every zone. */
export function extraKmOf(measure: ZoneTripMeasure): number {
  return roundKm(
    (measure.pickup.nearest ? measure.pickup.extraKm : 0) +
      (measure.dropoff.nearest ? measure.dropoff.extraKm : 0),
  );
}

/** The extra road both ends pay for: each end's road past its first `freeKm`. */
export function payableExtraKmOf(
  measure: ZoneTripMeasure,
  freeKm: number,
): number {
  const past = (end: ZoneTripEnd) =>
    end.nearest ? Math.max(0, end.extraKm - freeKm) : 0;
  return roundKm(past(measure.pickup) + past(measure.dropoff));
}

/** Km up to the next whole km: 0.3 is 1, 2 is 2. Rounded to the metre first, so 2.0000001 is 2. */
export const wholeKmUp = (km: number) => Math.ceil(roundKm(km));

/**
 * The km of extra road a trip is charged: none unless it is longer than
 * its grid trip; then each end's road past the free km, rounded up to the
 * whole km.
 */
export function chargedKmOf(measure: ZoneTripMeasure, freeKm: number): number {
  if (!(measure.tripKm > measure.gridTripKm)) return 0;
  return wholeKmUp(
    chargedExtraKm(
      payableExtraKmOf(measure, freeKm),
      measure.tripKm - measure.gridTripKm,
    ),
  );
}

/**
 * What the extra road adds for a class: the km charged at the rate per
 * extra km. `freeKm` is the location's free extra road, a whole km.
 */
export function zoneTripCharge(
  measure: ZoneTripMeasure,
  perKmSen: number,
  freeKm = 0,
): ZoneTripCharge {
  if (!(perKmSen >= 0)) throw new RangeError("perKmSen must be zero or more");
  if (!(freeKm >= 0)) throw new RangeError("freeKm must be zero or more");
  const chargedKm = chargedKmOf(measure, freeKm);
  return {
    pickup: { ...measure.pickup },
    dropoff: { ...measure.dropoff },
    gridTripKm: measure.gridTripKm,
    tripKm: measure.tripKm,
    perKmSen,
    freeKm,
    chargedKm,
    extraSen: Math.round(perKmSen * chargedKm),
  };
}

function isZoneTripEnd(value: unknown): value is ZoneTripEnd {
  if (typeof value !== "object" || value === null) return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.zone === "string" &&
    typeof e.nearest === "boolean" &&
    typeof e.extraKm === "number"
  );
}

/**
 * A stored `zoneTrip` read back; null for anything else, as on receipts
 * from before it. Receipts from before the free extra road and whole km
 * kept neither: theirs was the whole extra road, unrounded.
 */
export function zoneTripChargeOf(value: unknown): ZoneTripCharge | null {
  if (typeof value !== "object" || value === null) return null;
  const z = value as Record<string, unknown>;
  if (
    !isZoneTripEnd(z.pickup) ||
    !isZoneTripEnd(z.dropoff) ||
    typeof z.gridTripKm !== "number" ||
    typeof z.tripKm !== "number" ||
    typeof z.perKmSen !== "number" ||
    typeof z.extraSen !== "number"
  ) {
    return null;
  }
  return {
    pickup: z.pickup,
    dropoff: z.dropoff,
    gridTripKm: z.gridTripKm,
    tripKm: z.tripKm,
    perKmSen: z.perKmSen,
    freeKm: typeof z.freeKm === "number" ? z.freeKm : 0,
    chargedKm:
      typeof z.chargedKm === "number"
        ? z.chargedKm
        : z.tripKm > z.gridTripKm
          ? extraKmOf({
              pickup: z.pickup,
              dropoff: z.dropoff,
              gridTripKm: z.gridTripKm,
              tripKm: z.tripKm,
            })
          : 0,
    extraSen: z.extraSen,
  };
}
