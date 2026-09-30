// Usage: pnpm --filter @repo/db db:build-districts <folder with the geoBoundaries downloads>
//
// Turns the geoBoundaries files for Malaysia into data/malaysia-districts.json:
// the 16 states and territories from ADM1 and the districts from ADM2, each
// district with its state (found by where it sits), a point surely inside it
// (for the null places provider) and its boundary, simplified to about 50 m.
// Run it again only when geoBoundaries publishes a new release. See
// docs/260930-coverage.md.
//
// The folder holds `geoBoundaries-MYS-ADM1-all/` and `geoBoundaries-MYS-ADM2-all/`
// as downloaded from https://www.geoboundaries.org, licence CC BY 4.0.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  bboxOf,
  pointInMultiPolygon,
  pointOnSurface,
  simplifyRing,
  type LngLat,
  type MultiPolygon,
} from "../src/geo";
import { slugify } from "../src/slug";

type Feature = {
  properties: { shapeName: string; shapeISO?: string; shapeID: string };
  geometry:
    | { type: "Polygon"; coordinates: LngLat[][] }
    | { type: "MultiPolygon"; coordinates: LngLat[][][] };
};

/** About 50 m at the equator. */
const TOLERANCE_DEGREES = 0.0005;
const DECIMALS = 5;

/** geoBoundaries spellings the site does not use. */
const NAMES: Record<string, string> = {
  Malacca: "Melaka",
  "Ulu Langat": "Hulu Langat",
  "Ulu Selangor": "Hulu Selangor",
  Kulaijaya: "Kulai",
  "Nabawan / Persiangan": "Nabawan",
};

const folder = process.argv[2];
if (!folder) {
  console.error("Pass the folder that holds the geoBoundaries downloads.");
  process.exit(1);
}

function read(level: "ADM1" | "ADM2"): Feature[] {
  const file = join(
    folder!,
    `geoBoundaries-MYS-${level}-all`,
    `geoBoundaries-MYS-${level}_simplified.geojson`,
  );
  return (JSON.parse(readFileSync(file, "utf8")) as { features: Feature[] })
    .features;
}

const round = (n: number) => Number(n.toFixed(DECIMALS));

function shapeOf(feature: Feature, tolerance: number): MultiPolygon {
  const polygons =
    feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
  return polygons.map((polygon) =>
    polygon.map((ring) =>
      simplifyRing(ring, tolerance).map(
        ([x, y]) => [round(x), round(y)] as LngLat,
      ),
    ),
  );
}

const nameOf = (feature: Feature) =>
  NAMES[feature.properties.shapeName] ?? feature.properties.shapeName;

const states = read("ADM1").map((feature) => ({
  code: feature.properties.shapeISO!,
  name: nameOf(feature),
  shape: shapeOf(feature, 0),
}));
for (const state of states) {
  if (!/^MY-\d\d$/.test(state.code)) {
    throw new Error(`State ${state.name} has no ISO code`);
  }
}

function stateAt(point: LngLat) {
  return states.find((state) => pointInMultiPolygon(point, state.shape));
}

type District = {
  code: string;
  name: string;
  stateCode: string;
  point: LngLat;
  bbox: [number, number, number, number];
  polygons: MultiPolygon;
};

const districts: District[] = [];
for (const feature of read("ADM2")) {
  const polygons = shapeOf(feature, TOLERANCE_DEGREES);
  const point = pointOnSurface(polygons).map(round) as LngLat;
  const state = stateAt(point);
  if (!state) throw new Error(`${nameOf(feature)} sits in no state`);
  districts.push({
    code: slugify(nameOf(feature)),
    name: nameOf(feature),
    stateCode: state.code,
    point,
    bbox: bboxOf(polygons),
    polygons,
  });
}

// A territory with no district of its own (Putrajaya) is its own district.
for (const state of states) {
  if (districts.some((d) => d.stateCode === state.code)) continue;
  const polygons = shapeOf(
    {
      properties: { shapeName: state.name, shapeID: "" },
      geometry: toGeometry(state.shape),
    },
    TOLERANCE_DEGREES,
  );
  districts.push({
    code: slugify(state.name),
    name: state.name,
    stateCode: state.code,
    point: pointOnSurface(polygons).map(round) as LngLat,
    bbox: bboxOf(polygons),
    polygons,
  });
  console.log(`${state.name} has no ADM2 unit; added as its own district.`);
}

function toGeometry(shape: MultiPolygon): Feature["geometry"] {
  return { type: "MultiPolygon", coordinates: shape };
}

const codes = new Set<string>();
for (const district of districts) {
  if (codes.has(district.code)) {
    throw new Error(`Two districts share the code ${district.code}`);
  }
  codes.add(district.code);
}

const stateOrder = new Map(states.map((s, i) => [s.code, i]));
districts.sort(
  (a, b) =>
    stateOrder.get(a.stateCode)! - stateOrder.get(b.stateCode)! ||
    a.name.localeCompare(b.name),
);

const output = {
  attribution:
    "Administrative boundaries courtesy of geoBoundaries.org (CC BY 4.0), Malaysia ADM1 and ADM2, boundaries representative of 2020, file built December 2023.",
  states: states
    .map(({ code, name }) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name)),
  districts,
};

const target = join(
  import.meta.dirname,
  "..",
  "data",
  "malaysia-districts.json",
);
writeFileSync(target, JSON.stringify(output));
const vertices = districts.reduce(
  (n, d) => n + d.polygons.flat().reduce((m, ring) => m + ring.length, 0),
  0,
);
console.log(
  `${output.states.length} states, ${districts.length} districts, ${vertices} vertices -> ${target}`,
);
