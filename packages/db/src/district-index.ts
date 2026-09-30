import data from "../data/malaysia-districts.json";
import {
  bboxArea,
  distanceToShapeKm,
  inBBox,
  pointInMultiPolygon,
  type BBox,
  type LngLat,
  type MultiPolygon,
} from "./geo";

/**
 * Malaysia's states and districts with their boundaries, from
 * data/malaysia-districts.json (built by scripts/build-districts.ts from
 * geoBoundaries.org). Loaded once per process; half a megabyte, so it stays
 * on the server. The database holds the switch and the multiplier per row;
 * this holds the shapes. See docs/260930-coverage.md.
 */

export type StateShape = { code: string; name: string };

export type DistrictShape = {
  /** The slug of the name, the key the database rows use too. */
  code: string;
  name: string;
  /** ISO 3166-2: "MY-10" for Selangor. */
  stateCode: string;
  /** A point surely inside the district, for the null places provider. */
  point: LngLat;
  bbox: BBox;
  polygons: MultiPolygon;
};

export const DISTRICT_DATA = data as {
  attribution: string;
  states: StateShape[];
  districts: DistrictShape[];
};

/**
 * How far off the coast a point may be and still count as the nearest
 * district: a jetty, a beach hotel or a pier sits past the shoreline the
 * boundary data draws.
 */
export const COAST_KM = 3;
const COAST_DEGREES = COAST_KM / 100;

const byCode = new Map(DISTRICT_DATA.districts.map((d) => [d.code, d]));

export function districtShape(code: string): DistrictShape | undefined {
  return byCode.get(code);
}

const nearBBox = ([x, y]: LngLat, box: BBox) =>
  x >= box[0] - COAST_DEGREES &&
  y >= box[1] - COAST_DEGREES &&
  x <= box[2] + COAST_DEGREES &&
  y <= box[3] + COAST_DEGREES;

/**
 * The district a coordinate falls in. Of nested shapes (Sepang's boundary
 * wraps Putrajaya's) the smallest wins. A point in no district but within
 * `COAST_KM` of one, which is where jetties and beach hotels sit, takes the
 * nearest. Null further out to sea or outside Malaysia.
 */
export function districtCodeAt(lat: number, lng: number): string | null {
  const point: LngLat = [lng, lat];
  let inside: DistrictShape | null = null;
  for (const district of DISTRICT_DATA.districts) {
    if (
      inBBox(point, district.bbox) &&
      pointInMultiPolygon(point, district.polygons) &&
      (inside === null || bboxArea(district.bbox) < bboxArea(inside.bbox))
    ) {
      inside = district;
    }
  }
  if (inside) return inside.code;

  let nearest: DistrictShape | null = null;
  let distance = COAST_KM;
  for (const district of DISTRICT_DATA.districts) {
    if (!nearBBox(point, district.bbox)) continue;
    const km = distanceToShapeKm(point, district.polygons);
    if (km < distance) {
      distance = km;
      nearest = district;
    }
  }
  return nearest?.code ?? null;
}
