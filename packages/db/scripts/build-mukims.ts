// Usage: pnpm --filter @repo/db db:build-mukims <folder with the geoBoundaries download>
//
// Turns the geoBoundaries ADM3 file for Malaysia into data/malaysia-mukims.json:
// the areas below the districts (Peninsular Malaysia's mukims and the towns cut
// out of them, Sarawak's land and town districts; Sabah has none), each with the
// district it lies in and its boundary, simplified to about 50 m. The district is
// found by where the area sits among data/malaysia-districts.json, so build that
// first. The TopoJSON file is read, not the GeoJSON: a border two areas share is
// one arc there, simplified once, so neighbours keep the same edge and a zone
// made of several merges into one outline with no slivers between them. Run it
// again only when geoBoundaries publishes a new release. See
// docs/260930-coverage.md.
//
// The folder holds `geoBoundaries-MYS-ADM3-all/` as downloaded from
// https://www.geoboundaries.org, licence CC BY 4.0.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DISTRICT_DATA, districtCodeAt } from "../src/district-index";
import {
  bboxOf,
  distanceToShapeKm,
  pointInMultiPolygon,
  pointOnSurface,
  ringArea,
  simplifyLine,
  type LngLat,
  type MultiPolygon,
  type Polygon,
  type Ring,
} from "../src/geo";
import type { MukimKind, MukimShape } from "../src/mukim-index";
import { slugify } from "../src/slug";

/** About 50 m at the equator, as the districts. */
const TOLERANCE_DEGREES = 0.0005;
const DECIMALS = 5;
/**
 * A piece of an area this far from its district's outline is a slip in the
 * data, not an island of it: Kedawang has a speck 100 km out in the
 * Andaman Sea. Pulau Payar, Langkawi's farthest island, is 20 km out.
 */
const STRAY_KM = 40;
/**
 * Rocks smaller than this, about 100 m across, are left out: no one is
 * picked up there, and Kuah's 80 islets alone would pass a zone's corner
 * limit. An area keeps its largest piece, however small.
 */
const ISLET_KM2 = 0.01;
const KM2_PER_SQUARE_DEGREE = 111.32 * 111.32;

type Topology = {
  transform: { scale: [number, number]; translate: [number, number] };
  arcs: [number, number][][];
  objects: Record<string, { geometries: TopoGeometry[] }>;
};
type TopoGeometry = { properties: { shapeName: string } } & (
  | { type: "Polygon"; arcs: number[][] }
  | { type: "MultiPolygon"; arcs: number[][][] }
);

const folder = process.argv[2];
if (!folder) {
  console.error("Pass the folder that holds the geoBoundaries download.");
  process.exit(1);
}

const topology = JSON.parse(
  readFileSync(
    join(
      folder,
      "geoBoundaries-MYS-ADM3-all",
      "geoBoundaries-MYS-ADM3.topojson",
    ),
    "utf8",
  ),
) as Topology;

const round = (n: number) => Number(n.toFixed(DECIMALS));

/** At least three corners and back: a closed arc that keeps fewer is no ring. */
const RING_POINTS = 4;

// Each arc decoded from its quantised deltas, simplified once and rounded:
// the shapes that share it share these exact corners. A closed arc is a
// whole border on its own, a small town inside a mukim or an island; one
// that would simplify away keeps finer corners instead, so the town stays.
const {
  scale: [sx, sy],
  translate: [tx, ty],
} = topology.transform;
const arcs: LngLat[][] = topology.arcs.map((encoded) => {
  let x = 0;
  let y = 0;
  const line = encoded.map(([dx, dy]): LngLat => {
    x += dx;
    y += dy;
    return [x * sx + tx, y * sy + ty];
  });
  const first = line[0]!;
  const last = line[line.length - 1]!;
  const closed = first[0] === last[0] && first[1] === last[1];
  let simplified = simplifyLine(line, TOLERANCE_DEGREES);
  if (closed && simplified.length < RING_POINTS) {
    simplified = simplifyLine(line, TOLERANCE_DEGREES / 10);
    if (simplified.length < RING_POINTS) simplified = line;
  }
  return simplified.map(([lng, lat]): LngLat => [round(lng), round(lat)]);
});

/** A ring from its arcs, in order; a negative index is an arc read backwards. */
function ringOf(indexes: number[]): Ring | null {
  const ring: Ring = [];
  for (const index of indexes) {
    const arc = index >= 0 ? arcs[index]! : [...arcs[~index]!].reverse();
    for (const [i, point] of arc.entries()) {
      // Each arc starts where the one before it ended.
      if (i === 0 && ring.length > 0) continue;
      const last = ring[ring.length - 1];
      if (last && last[0] === point[0] && last[1] === point[1]) continue;
      ring.push(point);
    }
  }
  // Rounding can still fold a speck of an island flat.
  return ring.length >= RING_POINTS && ringArea(ring) > 0 ? ring : null;
}

function polygonOf(rings: number[][]): Polygon | null {
  const [outer, ...holes] = rings.map(ringOf);
  if (!outer) return null;
  return [outer, ...holes.filter((hole): hole is Ring => hole !== null)];
}

function shapeOf(geometry: TopoGeometry): MultiPolygon {
  const polygons =
    geometry.type === "Polygon" ? [geometry.arcs] : geometry.arcs;
  return polygons
    .map(polygonOf)
    .filter((polygon): polygon is Polygon => polygon !== null);
}

const titleCase = (text: string) =>
  text
    .toLowerCase()
    .replace(/(\S)\(/g, "$1 (")
    .replace(
      /(^|[\s(/-])(\p{L})/gu,
      (_, before, letter) => `${before}${letter.toUpperCase()}`,
    );

/**
 * The kind and the name in a geoBoundaries name: "MUKIM KEDAWANG", "BANDAR
 * KUAH", "PEKAN TELOK DATAI", "LUNDU TOWN DISTRICT", "MATANG LAND DISTRICT".
 * A numbered mukim keeps the word: "MUKIM 17" is "Mukim 17". A town named
 * only "BANDAR" takes its district's name.
 */
function kindAndName(
  shapeName: string,
  districtName: string,
): { kind: MukimKind; name: string } {
  const text = shapeName.replace(/\s+/g, " ").trim();
  const prefixed = /^(MUKIM|BANDAR|PEKAN)(?: (.+))?$/.exec(text);
  if (prefixed) {
    const kind = prefixed[1]!.toLowerCase() as MukimKind;
    const rest = prefixed[2];
    if (!rest) return { kind, name: districtName };
    return {
      kind,
      name: /^\d+$/.test(rest) ? `Mukim ${rest}` : titleCase(rest),
    };
  }
  const land = /^(.+) LAND DISTRICT$/.exec(text);
  if (land) return { kind: "land-district", name: titleCase(land[1]!) };
  const town = /^(.+) TOWN(?: DISTRICT)?$/.exec(text);
  if (town) return { kind: "town-district", name: titleCase(town[1]!) };
  throw new Error(`Cannot read the kind of ${shapeName}`);
}

const districtByCode = new Map(DISTRICT_DATA.districts.map((d) => [d.code, d]));

/** The district the point is in, else the nearest one, however far. */
function districtAt(shapeName: string, [lng, lat]: LngLat) {
  const code = districtCodeAt(lat, lng);
  if (code) return districtByCode.get(code)!;
  let nearest = DISTRICT_DATA.districts[0]!;
  let distance = Infinity;
  for (const district of DISTRICT_DATA.districts) {
    const km = distanceToShapeKm([lng, lat], district.polygons);
    if (km < distance) {
      distance = km;
      nearest = district;
    }
  }
  console.log(
    `${shapeName}: in no district, placed in the nearest, ${nearest.name}, ${distance.toFixed(1)} km off`,
  );
  return nearest;
}

const byCode = new Map<string, MukimShape>();
for (const geometry of Object.values(topology.objects)[0]!.geometries) {
  const { shapeName } = geometry.properties;
  let polygons = shapeOf(geometry);
  if (polygons.length === 0) {
    console.log(`${shapeName}: nothing left at 50 m, left out`);
    continue;
  }
  const district = districtAt(shapeName, pointOnSurface(polygons));

  polygons = polygons.filter((polygon) => {
    const inside = pointOnSurface([polygon]);
    const stray =
      !pointInMultiPolygon(inside, district.polygons) &&
      distanceToShapeKm(inside, district.polygons) > STRAY_KM;
    if (stray) {
      console.log(
        `${shapeName}: dropped a piece ${distanceToShapeKm(inside, district.polygons).toFixed(0)} km from ${district.name}`,
      );
    }
    return !stray;
  });
  if (polygons.length === 0) {
    console.log(
      `${shapeName}: every piece far from ${district.name}, left out`,
    );
    continue;
  }
  const largestArea = Math.max(...polygons.map((p) => ringArea(p[0]!)));
  polygons = polygons.filter((polygon) => {
    const area = ringArea(polygon[0]!);
    const km2 =
      area *
      KM2_PER_SQUARE_DEGREE *
      Math.cos((polygon[0]![0]![1] * Math.PI) / 180);
    return area === largestArea || km2 >= ISLET_KM2;
  });

  const { kind, name } = kindAndName(shapeName, district.name);
  const code = `${district.code}:${kind}-${slugify(name)}`;
  const same = byCode.get(code);
  if (same) {
    // One area in two rows of the file: one area here, with every piece.
    console.log(`${shapeName}: a second row for ${code}, joined to the first`);
    same.polygons.push(...polygons);
    same.bbox = bboxOf(same.polygons);
    continue;
  }
  byCode.set(code, {
    code,
    name,
    kind,
    districtCode: district.code,
    bbox: bboxOf(polygons),
    polygons,
  });
}

const districtOrder = new Map(
  DISTRICT_DATA.districts.map((district, i) => [district.code, i]),
);
const mukims = [...byCode.values()].sort(
  (a, b) =>
    districtOrder.get(a.districtCode)! - districtOrder.get(b.districtCode)! ||
    a.name.localeCompare(b.name) ||
    a.kind.localeCompare(b.kind),
);

const output = {
  attribution:
    "Administrative boundaries courtesy of geoBoundaries.org (CC BY 4.0), Malaysia ADM3, boundaries representative of 2021, file built December 2023.",
  mukims,
};

const target = join(import.meta.dirname, "..", "data", "malaysia-mukims.json");
writeFileSync(target, JSON.stringify(output));

const cornersOf = (shape: MultiPolygon) =>
  shape.flat().reduce((sum, ring) => sum + ring.length - 1, 0);
const districts = new Set(mukims.map((mukim) => mukim.districtCode));
const largest = mukims.reduce((a, b) =>
  cornersOf(b.polygons) > cornersOf(a.polygons) ? b : a,
);
console.log(
  `${mukims.length} areas in ${districts.size} districts, ${mukims.reduce((n, m) => n + cornersOf(m.polygons), 0)} corners; the most, ${cornersOf(largest.polygons)}, ${largest.code} -> ${target}`,
);
