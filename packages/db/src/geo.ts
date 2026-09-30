/**
 * The little geometry coverage needs, pure and browser-safe: is a point
 * inside a district, and where is a point that is surely inside one. Shapes
 * are GeoJSON-shaped: a ring is a closed list of [lng, lat], a polygon is an
 * outer ring then holes, a multipolygon is a list of polygons. Degrees are
 * treated as flat, which is fine at district size.
 */

/** GeoJSON order: longitude first. */
export type LngLat = [lng: number, lat: number];
export type Ring = LngLat[];
/** The outer ring first, then any holes. */
export type Polygon = Ring[];
export type MultiPolygon = Polygon[];
/** [minLng, minLat, maxLng, maxLat] */
export type BBox = [number, number, number, number];

/** Ray casting: crossings of a ray to the east, odd means inside. */
export function pointInRing([x, y]: LngLat, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    const crosses =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

/** Inside the outer ring and outside every hole. */
export function pointInPolygon(point: LngLat, polygon: Polygon): boolean {
  const [outer, ...holes] = polygon;
  if (!outer || !pointInRing(point, outer)) return false;
  return !holes.some((hole) => pointInRing(point, hole));
}

export function pointInMultiPolygon(
  point: LngLat,
  shape: MultiPolygon,
): boolean {
  return shape.some((polygon) => pointInPolygon(point, polygon));
}

export function bboxOf(shape: MultiPolygon): BBox {
  const box: BBox = [Infinity, Infinity, -Infinity, -Infinity];
  for (const polygon of shape) {
    for (const [x, y] of polygon[0] ?? []) {
      if (x < box[0]) box[0] = x;
      if (y < box[1]) box[1] = y;
      if (x > box[2]) box[2] = x;
      if (y > box[3]) box[3] = y;
    }
  }
  return box;
}

export function inBBox([x, y]: LngLat, box: BBox): boolean {
  return x >= box[0] && y >= box[1] && x <= box[2] && y <= box[3];
}

/** Twice the signed area of a ring, for picking the largest. */
function ringArea(ring: Ring) {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += (ring[j]![0] + ring[i]![0]) * (ring[j]![1] - ring[i]![1]);
  }
  return Math.abs(sum / 2);
}

function centroidOf(ring: Ring): LngLat {
  let x = 0;
  let y = 0;
  for (const [px, py] of ring) {
    x += px;
    y += py;
  }
  return [x / ring.length, y / ring.length];
}

/**
 * A point inside the shape, for a place that must resolve to it: a scan
 * line through the largest polygon at its centroid's latitude, cut where it
 * crosses the boundary, and the middle of the widest inside stretch. A
 * centroid alone can fall outside a crescent-shaped district.
 */
export function pointOnSurface(shape: MultiPolygon): LngLat {
  const largest = shape.reduce<Polygon | null>(
    (best, polygon) =>
      best === null || ringArea(polygon[0]!) > ringArea(best[0]!)
        ? polygon
        : best,
    null,
  );
  if (!largest) throw new RangeError("an empty shape has no surface");
  const centroid = centroidOf(largest[0]!);
  if (pointInPolygon(centroid, largest)) return centroid;

  const y = centroid[1];
  const xs: number[] = [];
  for (const ring of largest) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]!;
      const [xj, yj] = ring[j]!;
      if (yi > y !== yj > y) xs.push(((xj - xi) * (y - yi)) / (yj - yi) + xi);
    }
  }
  xs.sort((a, b) => a - b);
  let best: LngLat = centroid;
  let width = -1;
  for (let i = 0; i + 1 < xs.length; i += 2) {
    const span = xs[i + 1]! - xs[i]!;
    if (span > width) {
      width = span;
      best = [(xs[i]! + xs[i + 1]!) / 2, y];
    }
  }
  return best;
}

function distanceToSegment(p: LngLat, a: LngLat, b: LngLat) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length2 = dx * dx + dy * dy;
  const t =
    length2 === 0
      ? 0
      : Math.max(
          0,
          Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length2),
        );
  const x = a[0] + t * dx - p[0];
  const y = a[1] + t * dy - p[1];
  return Math.sqrt(x * x + y * y);
}

/**
 * Douglas-Peucker: drops vertices that move the line by less than
 * `tolerance` degrees. Keeps the first and last vertex, so a closed ring
 * stays closed. Used once, when the data file is built.
 */
export function simplifyRing(ring: Ring, tolerance: number): Ring {
  if (ring.length <= 4) return ring;
  const keep = new Array<boolean>(ring.length).fill(false);
  keep[0] = keep[ring.length - 1] = true;
  const stack: [number, number][] = [[0, ring.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    let farthest = 0;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const d = distanceToSegment(ring[i]!, ring[first]!, ring[last]!);
      if (d > farthest) {
        farthest = d;
        index = i;
      }
    }
    if (index !== -1 && farthest > tolerance) {
      keep[index] = true;
      stack.push([first, index], [index, last]);
    }
  }
  const out = ring.filter((_, i) => keep[i]);
  // A ring needs three distinct corners; keep the original otherwise.
  return out.length >= 4 ? out : ring;
}

/** Kilometres per degree of latitude; longitude shrinks by cos(lat). */
const KM_PER_DEGREE = 111.32;

/**
 * Distance in kilometres from a point to the nearest edge of a shape,
 * measured flat with the longitude scaled by the latitude, which is close
 * enough within a few kilometres of Malaysia's coast. Zero inside is not
 * assumed: callers check containment first.
 */
export function distanceToShapeKm(point: LngLat, shape: MultiPolygon): number {
  const scale = Math.cos((point[1] * Math.PI) / 180);
  const scaled = ([x, y]: LngLat): LngLat => [x * scale, y];
  const p = scaled(point);
  let best = Infinity;
  for (const polygon of shape) {
    for (const ring of polygon) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const d = distanceToSegment(p, scaled(ring[i]!), scaled(ring[j]!));
        if (d < best) best = d;
      }
    }
  }
  return best * KM_PER_DEGREE;
}

/** The area of a bounding box in square degrees, for picking the smallest of nested shapes. */
export function bboxArea(box: BBox) {
  return (box[2] - box[0]) * (box[3] - box[1]);
}
