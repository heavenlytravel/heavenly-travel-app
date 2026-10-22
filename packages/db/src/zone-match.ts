import {
  bboxOf,
  bboxOfRing,
  inBBox,
  pointInMultiPolygon,
  pointInRing,
  ringArea,
  type MultiPolygon,
  type Ring,
} from "./geo";

/**
 * Where a place falls among a location's zones, and which cell of the rate
 * grid a route reads, pure and browser-safe. A zone's shape is one closed
 * ring (drawn, or a circle around a place) or polygons: a district's
 * boundary or its mukims' as they are, which may be several pieces of
 * land, or a shape with other zones cut out of it. Zones never overlap, a
 * save refuses one that does; should two from before the rule, the
 * smallest wins, as districts do. See
 * docs/261015-locations-as-operation-areas.md, "Zones and zone-to-zone
 * rates".
 */

/** What matching reads of a zone: the rows of `Zone` satisfy it. */
export type ZoneLike = { id: string; name: string; shape: unknown };

/** A zone's shape as stored: one ring, or a district's polygons. */
export type ZoneShape = Ring | MultiPolygon;

const isLngLat = (value: unknown): value is [number, number] =>
  Array.isArray(value) &&
  value.length === 2 &&
  typeof value[0] === "number" &&
  typeof value[1] === "number" &&
  Number.isFinite(value[0]) &&
  Number.isFinite(value[1]) &&
  value[0] >= -180 &&
  value[0] <= 180 &&
  value[1] >= -90 &&
  value[1] <= 90;

/** A ring as stored: at least three corners of [lng, lat]. */
export function isRing(value: unknown): value is Ring {
  return Array.isArray(value) && value.length >= 3 && value.every(isLngLat);
}

/** A district's shape as stored: one or more polygons, each an outer ring then any holes. */
export function isMultiPolygon(value: unknown): value is MultiPolygon {
  return (
    Array.isArray(value) &&
    value.length >= 1 &&
    value.every(
      (polygon) =>
        Array.isArray(polygon) && polygon.length >= 1 && polygon.every(isRing),
    )
  );
}

export function isZoneShape(value: unknown): value is ZoneShape {
  return isRing(value) || isMultiPolygon(value);
}

/** Every ring of a shape, outer rings and holes alike: for drawing it and counting its corners. */
export function ringsOf(shape: ZoneShape): Ring[] {
  return isRing(shape) ? [shape] : shape.flat();
}

/** The corners of a shape, as the screens count them: a closed ring's last, its first again, not counted. */
export function cornerCount(shape: ZoneShape): number {
  return ringsOf(shape).reduce((sum, ring) => sum + ring.length - 1, 0);
}

/** A zone's shape as polygons: a drawn ring is one polygon without holes. */
export function polygonsOf(shape: ZoneShape): MultiPolygon {
  return isRing(shape) ? [[shape]] : shape;
}

/** Whether the point is inside the shape: in the ring, or in one of the polygons. */
export function pointInZoneShape(
  point: [number, number],
  shape: ZoneShape,
): boolean {
  if (isRing(shape)) {
    return inBBox(point, bboxOfRing(shape)) && pointInRing(point, shape);
  }
  return inBBox(point, bboxOf(shape)) && pointInMultiPolygon(point, shape);
}

/** The area of a shape in square degrees, its holes taken off, for picking the smallest. */
export function zoneShapeArea(shape: ZoneShape): number {
  if (isRing(shape)) return ringArea(shape);
  let area = 0;
  for (const [outer, ...holes] of shape) {
    if (!outer) continue;
    area += ringArea(outer);
    for (const hole of holes) area -= ringArea(hole);
  }
  return area;
}

/** The zone the point falls in, the smallest of several; null outside every zone. */
export function zoneAt<Z extends ZoneLike>(
  zones: readonly Z[],
  place: { lat: number; lng: number },
): Z | null {
  const point: [number, number] = [place.lng, place.lat];
  let inside: Z | null = null;
  let insideArea = Infinity;
  for (const zone of zones) {
    if (!isZoneShape(zone.shape)) continue;
    if (!pointInZoneShape(point, zone.shape)) continue;
    const area = zoneShapeArea(zone.shape);
    if (area < insideArea) {
      inside = zone;
      insideArea = area;
    }
  }
  return inside;
}

/** What the grid lookup reads of a cell: the rows of `ZoneRate` satisfy it. */
export type RateCellLike = {
  fromZoneId: string;
  toZoneId: string;
  vehicleClassId: string;
  priceSen: number;
};

/**
 * The grid's price for a class between two zones, read both ways: the cell
 * for (from, to), else the cell for (to, from). Null when neither is set.
 */
export function routeRateOf<C extends RateCellLike>(
  cells: readonly C[],
  fromZoneId: string,
  toZoneId: string,
  vehicleClassId: string,
): C | null {
  const forward = cells.find(
    (cell) =>
      cell.vehicleClassId === vehicleClassId &&
      cell.fromZoneId === fromZoneId &&
      cell.toZoneId === toZoneId,
  );
  if (forward) return forward;
  return (
    cells.find(
      (cell) =>
        cell.vehicleClassId === vehicleClassId &&
        cell.fromZoneId === toZoneId &&
        cell.toZoneId === fromZoneId,
    ) ?? null
  );
}
