import { difference, intersection, union } from "polyclip-ts";
import {
  bboxOf,
  boxesMeet,
  ringArea,
  type MultiPolygon,
  type Polygon,
} from "./geo";
import { polygonsOf, type ZoneShape } from "./zone-match";

/**
 * The shape arithmetic zones need, on the server only (the clipping library
 * stays out of the browser): areas put together into one outline, a zone's
 * own pieces joined where they overlap, how much two shapes overlap, and a
 * shape with others cut out of it. Shapes are in
 * degrees; areas come out in square kilometres, flat with the longitude
 * scaled by the latitude, exact enough at the size of a district. See
 * docs/261015-locations-as-operation-areas.md, "Zones and zone-to-zone
 * rates".
 */

const KM_PER_DEGREE = 111.32;

/**
 * Overlap smaller than this, about 45 m by 45 m, is the rounding of two
 * borders drawn to meet, not ground two zones both claim.
 */
export const OVERLAP_TOLERANCE_KM2 = 0.002;

/** Corners stored to about 10 cm. */
const DECIMALS = 6;

const rounded = (shape: MultiPolygon): MultiPolygon =>
  shape.map((polygon) =>
    polygon.map((ring) =>
      ring.map(([lng, lat]) => [
        Number(lng.toFixed(DECIMALS)),
        Number(lat.toFixed(DECIMALS)),
      ]),
    ),
  );

/** The shapes as one: the borders they share are gone, holes where none covers. */
export function unionOf(shapes: readonly ZoneShape[]): MultiPolygon {
  const [first, ...rest] = shapes.map(polygonsOf);
  if (!first) return [];
  return rounded(union(first, ...rest));
}

/**
 * A zone's pieces put together where they overlap or meet, as the zone
 * maker's Merge does: pieces apart stay apart.
 */
export function joinPieces(pieces: MultiPolygon): MultiPolygon {
  return unionOf(pieces.map((piece) => [piece]));
}

/**
 * The shape with its pieces that overlap joined, so no ground of the zone
 * is drawn twice; the shape as it is when none do. Every other piece stays
 * as drawn, the two parts of a cut, which only meet, included.
 */
export function joinOverlaps(shape: ZoneShape): ZoneShape {
  const pieces = polygonsOf(shape);
  // Pieces that overlap, directly or through a chain of others, share a group.
  const group = pieces.map((_, i) => i);
  const root = (i: number): number =>
    group[i] === i ? i : (group[i] = root(group[i]!));
  for (const [i, piece] of pieces.entries()) {
    for (const [j, other] of pieces.entries()) {
      if (j > i && shapesOverlap([piece], [other])) group[root(j)] = root(i);
    }
  }
  const groups = new Map<number, Polygon[]>();
  for (const [i, piece] of pieces.entries()) {
    groups.set(root(i), [...(groups.get(root(i)) ?? []), piece]);
  }
  if (groups.size === pieces.length) return shape;
  return [...groups.values()].flatMap((together) =>
    together.length === 1 ? together : joinPieces(together),
  );
}

/** The area of polygons, their holes taken off, in square kilometres. */
export function areaKm2(shape: MultiPolygon): number {
  if (shape.length === 0) return 0;
  const [, south, , north] = bboxOf(shape);
  const scale = Math.cos((((south + north) / 2) * Math.PI) / 180);
  let degrees = 0;
  for (const [outer, ...holes] of shape) {
    if (!outer) continue;
    degrees += ringArea(outer);
    for (const hole of holes) degrees -= ringArea(hole);
  }
  return degrees * KM_PER_DEGREE * KM_PER_DEGREE * scale;
}

/** How much ground two shapes both cover, in square kilometres. */
export function overlapKm2(a: ZoneShape, b: ZoneShape): number {
  const pa = polygonsOf(a);
  const pb = polygonsOf(b);
  if (!boxesMeet(bboxOf(pa), bboxOf(pb))) return 0;
  return areaKm2(intersection(pa, pb));
}

/** Whether two shapes cover the same ground, past the rounding of borders drawn to meet. */
export function shapesOverlap(a: ZoneShape, b: ZoneShape): boolean {
  return overlapKm2(a, b) > OVERLAP_TOLERANCE_KM2;
}

/**
 * The shape with the others cut out of it, to the polygons that are left;
 * none when nothing is. Slivers thinner than the overlap's tolerance go too.
 */
export function cutOut(
  shape: ZoneShape,
  others: readonly ZoneShape[],
): MultiPolygon {
  if (others.length === 0) return polygonsOf(shape);
  const left = difference(polygonsOf(shape), ...others.map(polygonsOf));
  return rounded(left).filter(
    (polygon) => areaKm2([polygon]) > OVERLAP_TOLERANCE_KM2,
  );
}
