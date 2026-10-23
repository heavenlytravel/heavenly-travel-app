// The file db:export-zones writes and db:import-zones reads: one location's
// zones by the location's slug and the zones' names, so it reads the same
// in any database.
import { readFileSync, writeFileSync } from "node:fs";

export type ZonesFile = {
  /** The location's slug. */
  location: string;
  exportedAt: string;
  /** In the location's order: `{ name, shape, drawnFrom }` as the zone editor saves them. */
  zones: { name: string; shape: unknown; drawnFrom: unknown }[];
};

/** Where the file of the location by the slug is, from packages/db. */
function pathOf(slug: string) {
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error(`"${slug}" is not a location's slug.`);
  }
  return `data/zones/${slug}.json`;
}

/** Writes the file, a zone a line, and answers where. */
export function writeZonesFile(file: ZonesFile): string {
  const zones = file.zones
    .map((zone) => `    ${JSON.stringify(zone)}`)
    .join(",\n");
  const path = pathOf(file.location);
  writeFileSync(
    path,
    `{\n  "location": ${JSON.stringify(file.location)},\n  "exportedAt": ${JSON.stringify(file.exportedAt)},\n  "zones": [\n${zones}\n  ]\n}\n`,
  );
  return path;
}

/** Reads the file of the location by the slug; throws when it is not one. */
export function readZonesFile(slug: string): ZonesFile {
  const path = pathOf(slug);
  const file = JSON.parse(readFileSync(path, "utf8")) as Record<
    string,
    unknown
  >;
  const { zones } = file;
  if (
    file.location !== slug ||
    !Array.isArray(zones) ||
    !zones.every(
      (zone) =>
        typeof zone === "object" &&
        zone !== null &&
        typeof (zone as { name?: unknown }).name === "string",
    )
  ) {
    throw new Error(`${path} is not a zones file of ${slug}.`);
  }
  return file as ZonesFile;
}
