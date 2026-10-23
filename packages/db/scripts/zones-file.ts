// The file db:export-zones writes and db:import-zones reads: one location's
// zones and rate grid, by the location's slug, the zones' names and the
// classes' slugs, so it reads the same in any database.
import { readFileSync, writeFileSync } from "node:fs";

export type ZonesFile = {
  /** The location's slug. */
  location: string;
  exportedAt: string;
  /** In the location's order: `{ name, shape, drawnFrom }` as the zone editor saves them. */
  zones: { name: string; shape: unknown; drawnFrom: unknown }[];
  rates: ZonesFileRate[];
};

export type ZonesFileRate = {
  /** A zone of the location, by name. */
  from: string;
  /** A zone of the location, or of `toLocation` for a route out of it. */
  to: string;
  /** Another location's slug; absent when `to` is the location's own. */
  toLocation?: string;
  /** A class's slug. */
  vehicleClass: string;
  priceSen: number;
};

/** Where the file of the location by the slug is, from packages/db. */
function pathOf(slug: string) {
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error(`"${slug}" is not a location's slug.`);
  }
  return `data/zones/${slug}.json`;
}

/** Writes the file, a zone or a rate a line, and answers where. */
export function writeZonesFile(file: ZonesFile): string {
  const lines = (items: readonly unknown[]) =>
    items.map((item) => `    ${JSON.stringify(item)}`).join(",\n");
  const path = pathOf(file.location);
  writeFileSync(
    path,
    `{\n  "location": ${JSON.stringify(file.location)},\n  "exportedAt": ${JSON.stringify(file.exportedAt)},\n  "zones": [\n${lines(file.zones)}\n  ],\n  "rates": [\n${lines(file.rates)}\n  ]\n}\n`,
  );
  return path;
}

function isRate(value: unknown): value is ZonesFileRate {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.from === "string" &&
    typeof r.to === "string" &&
    (r.toLocation === undefined || typeof r.toLocation === "string") &&
    typeof r.vehicleClass === "string" &&
    Number.isInteger(r.priceSen) &&
    (r.priceSen as number) >= 0
  );
}

/** Reads the file of the location by the slug; throws when it is not one. */
export function readZonesFile(slug: string): ZonesFile {
  const path = pathOf(slug);
  const file = JSON.parse(readFileSync(path, "utf8")) as Record<
    string,
    unknown
  >;
  const { zones, rates } = file;
  if (
    file.location !== slug ||
    !Array.isArray(zones) ||
    !zones.every(
      (zone) =>
        typeof zone === "object" &&
        zone !== null &&
        typeof (zone as { name?: unknown }).name === "string",
    ) ||
    !Array.isArray(rates) ||
    !rates.every(isRate)
  ) {
    throw new Error(`${path} is not a zones file of ${slug}.`);
  }
  return file as ZonesFile;
}
