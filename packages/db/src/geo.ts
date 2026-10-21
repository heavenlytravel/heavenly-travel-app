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

/** The box around all the boxes. */
export function unionBox(boxes: readonly BBox[]): BBox {
  const box: BBox = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [west, south, east, north] of boxes) {
    if (west < box[0]) box[0] = west;
    if (south < box[1]) box[1] = south;
    if (east > box[2]) box[2] = east;
    if (north > box[3]) box[3] = north;
  }
  return box;
}

/** The box grown by `margin` degrees on every side. */
export function widenBox(
  [west, south, east, north]: BBox,
  margin: number,
): BBox {
  return [west - margin, south - margin, east + margin, north + margin];
}

/** Whether two boxes share any ground or edge. */
export function boxesMeet(a: BBox, b: BBox): boolean {
  return a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];
}

export function inBBox([x, y]: LngLat, box: BBox): boolean {
  return x >= box[0] && y >= box[1] && x <= box[2] && y <= box[3];
}

/** The area of a ring in square degrees, for picking the largest or the smallest. */
export function ringArea(ring: Ring) {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += (ring[j]![0] + ring[i]![0]) * (ring[j]![1] - ring[i]![1]);
  }
  return Math.abs(sum / 2);
}

/** The bounding box of one ring. */
export function bboxOfRing(ring: Ring): BBox {
  return bboxOf([[ring]]);
}

/**
 * The circle's corners, so a drawn circle and a drawn polygon are one
 * shape: round enough, and few enough to reshape by hand.
 */
const CIRCLE_SEGMENTS = 24;

/**
 * A closed ring around a point at a radius in metres: the polygon a zone
 * drawn as a circle is stored as. Flat, with the longitude scaled by the
 * latitude, which is exact enough at the size of an airport or a town.
 */
export function circleRing(
  center: { lat: number; lng: number },
  radiusM: number,
): Ring {
  const radiusDeg = radiusM / 1000 / KM_PER_DEGREE;
  const scale = Math.cos((center.lat * Math.PI) / 180);
  const ring: Ring = [];
  for (let i = 0; i < CIRCLE_SEGMENTS; i++) {
    const angle = (2 * Math.PI * i) / CIRCLE_SEGMENTS;
    ring.push([
      center.lng + (radiusDeg * Math.cos(angle)) / scale,
      center.lat + radiusDeg * Math.sin(angle),
    ]);
  }
  ring.push(ring[0]!);
  return ring;
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
 * Douglas-Peucker on an open line: drops vertices that move it by less
 * than `tolerance` degrees, and keeps both ends. A border two shapes share
 * is simplified once this way, so both keep the same corners. Used when
 * the data files are built.
 */
export function simplifyLine(line: LngLat[], tolerance: number): LngLat[] {
  if (line.length <= 2) return line;
  const keep = new Array<boolean>(line.length).fill(false);
  keep[0] = keep[line.length - 1] = true;
  const stack: [number, number][] = [[0, line.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    let farthest = 0;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const d = distanceToSegment(line[i]!, line[first]!, line[last]!);
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
  return line.filter((_, i) => keep[i]);
}

/**
 * `simplifyLine` on a closed ring: the first and last vertex stay, so it
 * stays closed. Used once, when the data file is built.
 */
export function simplifyRing(ring: Ring, tolerance: number): Ring {
  if (ring.length <= 4) return ring;
  const out = simplifyLine(ring, tolerance);
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

/** Which side of the line a-b the point c is: positive left, negative right, zero on it. */
const turn = (a: LngLat, b: LngLat, c: LngLat) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

/** Whether c, on the line a-b, lies between a and b. */
const within = (a: LngLat, b: LngLat, c: LngLat) =>
  Math.min(a[0], b[0]) <= c[0] &&
  c[0] <= Math.max(a[0], b[0]) &&
  Math.min(a[1], b[1]) <= c[1] &&
  c[1] <= Math.max(a[1], b[1]);

/** Whether segments p1-p2 and q1-q2 cross or touch. */
function segmentsMeet(p1: LngLat, p2: LngLat, q1: LngLat, q2: LngLat) {
  const d1 = turn(q1, q2, p1);
  const d2 = turn(q1, q2, p2);
  const d3 = turn(p1, p2, q1);
  const d4 = turn(p1, p2, q2);
  if (d1 * d2 < 0 && d3 * d4 < 0) return true;
  return (
    (d1 === 0 && within(q1, q2, p1)) ||
    (d2 === 0 && within(q1, q2, p2)) ||
    (d3 === 0 && within(p1, p2, q1)) ||
    (d4 === 0 && within(p1, p2, q2))
  );
}

/** A polygon cut in two, or why it cannot be. */
export type PolygonCut =
  | { ok: true; parts: [Polygon, Polygon] }
  | { ok: false; reason: "same" | "adjacent" | "outside" };

/**
 * A polygon cut in two along the straight line between two corners of its
 * outer ring, `from` and `to` by their place in it. The rings are open,
 * their first corner not repeated at the end, and so are the parts'. Each
 * part keeps the holes that lie in it. Refused for the same corner, for two
 * next to each other (nothing between them to cut), and for a line that
 * leaves the polygon or touches its edge between the two.
 */
export function cutPolygonBetween(
  polygon: Polygon,
  from: number,
  to: number,
): PolygonCut {
  const [outer, ...holes] = polygon;
  if (!outer || from === to) return { ok: false, reason: "same" };
  const n = outer.length;
  if ((from + 1) % n === to || (to + 1) % n === from) {
    return { ok: false, reason: "adjacent" };
  }
  const a = outer[from]!;
  const b = outer[to]!;
  // Every edge but the four that end at a or b may not meet the line.
  for (const [i, corner] of outer.entries()) {
    const next = (i + 1) % n;
    if ([from, to].includes(i) || [from, to].includes(next)) continue;
    if (segmentsMeet(a, b, corner, outer[next]!)) {
      return { ok: false, reason: "outside" };
    }
  }
  for (const hole of holes) {
    for (const [i, corner] of hole.entries()) {
      if (segmentsMeet(a, b, corner, hole[(i + 1) % hole.length]!)) {
        return { ok: false, reason: "outside" };
      }
    }
  }
  const middle: LngLat = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  if (!pointInPolygon(middle, polygon)) return { ok: false, reason: "outside" };

  const [low, high] = from < to ? [from, to] : [to, from];
  const one = outer.slice(low, high + 1);
  const other = [...outer.slice(high), ...outer.slice(0, low + 1)];
  const holesIn = (ring: Ring) =>
    holes.filter((hole) => hole[0] && pointInRing(hole[0], ring));
  return {
    ok: true,
    parts: [
      [one, ...holesIn(one)],
      [other, ...holesIn(other)],
    ],
  };
}
