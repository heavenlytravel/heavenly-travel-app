import type { BBox, MultiPolygon } from "./geo";

/**
 * The areas below a district, with their boundaries: Peninsular Malaysia's
 * mukims and the towns (bandar, pekan) cut out of them, and Sarawak's land
 * and town districts. Sabah and Putrajaya have none. From
 * data/malaysia-mukims.json, built by scripts/build-mukims.ts from
 * geoBoundaries.org. Only the zone maker reads them, so the file, a few
 * megabytes, is loaded the first time it asks and never by the customer
 * site. Server only. See docs/261015-locations-as-operation-areas.md,
 * "Zones and zone-to-zone rates".
 */

export const MUKIM_KINDS = [
  "mukim",
  "bandar",
  "pekan",
  "land-district",
  "town-district",
] as const;
export type MukimKind = (typeof MUKIM_KINDS)[number];

export const MUKIM_KIND_LABELS: Record<MukimKind, string> = {
  mukim: "Mukim",
  bandar: "Bandar",
  pekan: "Pekan",
  "land-district": "Land district",
  "town-district": "Town district",
};

export type MukimShape = {
  /** The district's code and the slug of the kind and the name: "langkawi:mukim-kedawang". */
  code: string;
  /** As the screens name it: "Kedawang". */
  name: string;
  kind: MukimKind;
  /** The district it lies in. */
  districtCode: string;
  bbox: BBox;
  polygons: MultiPolygon;
};

type MukimData = { attribution: string; mukims: MukimShape[] };

let byDistrict: Promise<Map<string, MukimShape[]>> | null = null;

function load() {
  byDistrict ??= import("../data/malaysia-mukims.json").then(
    ({ default: data }) => {
      const map = new Map<string, MukimShape[]>();
      for (const mukim of (data as MukimData).mukims) {
        const list = map.get(mukim.districtCode);
        if (list) list.push(mukim);
        else map.set(mukim.districtCode, [mukim]);
      }
      return map;
    },
  );
  return byDistrict;
}

/** The areas of a district by name; none for a district with no areas below it. */
export async function mukimsOf(districtCode: string): Promise<MukimShape[]> {
  return (await load()).get(districtCode) ?? [];
}

/**
 * The areas of the district with the codes, in the district's order; null
 * when a code is not one of the district's.
 */
export async function mukimsByCode(
  districtCode: string,
  codes: readonly string[],
): Promise<MukimShape[] | null> {
  const all = await mukimsOf(districtCode);
  const wanted = new Set(codes);
  const found = all.filter((mukim) => wanted.has(mukim.code));
  return found.length === wanted.size ? found : null;
}
