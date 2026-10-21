"use server";

import {
  MUKIM_KIND_LABELS,
  checkOverlaps,
  createZone,
  deleteZone,
  districtShape,
  isZoneDistrict,
  isZoneShape,
  mukimsByCode,
  mukimsOf,
  parseZoneFields,
  unionOf,
  updateZone,
  type MultiPolygon,
  type OverlapCheck,
  type ZoneFields,
  type ZoneInTheWay,
} from "@repo/db/server";
import { resolvePlace } from "@repo/places/server";
import { actorOf, getAdmin } from "../../../../_lib/access";
import {
  type ActionState,
  FORBIDDEN,
  FORBIDDEN_MESSAGE,
  STALE,
  stateOf,
} from "../../../../_lib/action-state";
import { refreshLocationAfter } from "../../../../_lib/site";
import { revalidateLocation } from "../../_lib/revalidate";
import type { MukimChoice } from "./zones/map-shapes";

/**
 * The Coverage tab's actions: the zones. Each checks `coverage.manage` again,
 * passes the admin as the actor and lets the writer in @repo/db check the
 * rest. Arguments passed directly, not through a form, are checked for
 * their type here: an action is reachable by direct POST. A change to the
 * zones refreshes the location's pages on the customer site, whose search
 * card keeps to the districts the zones lie in, and those of the other
 * locations whose routes end at a zone changed; the quote reads the rows.
 */

/**
 * A zone write's answer: the zone's id, or why not, with the zones it
 * overlaps when that is why.
 */
export type ZoneSaved =
  | { ok: true; id: string }
  | { ok: false; error: string; overlaps?: ZoneInTheWay[] };

/**
 * The zones in the way the admin chose to trim, as the last refusal named
 * them, by id; none to keep every other zone as it is.
 */
function cutFromOf(cutFrom: unknown): string[] | undefined | null {
  if (cutFrom === undefined || cutFrom === null) return undefined;
  return Array.isArray(cutFrom) &&
    cutFrom.length > 0 &&
    cutFrom.every((id) => typeof id === "string")
    ? cutFrom
    : null;
}

/** Some of a district's mukims put together, or why not. */
async function mukimShapeOf(
  districtCode: string,
  codes: readonly string[],
): Promise<{ ok: true; shape: MultiPolygon } | { ok: false; error: string }> {
  const mukims = await mukimsByCode(districtCode, codes);
  if (!mukims || mukims.length === 0) {
    return { ok: false, error: "Tick the mukims again from the list." };
  }
  return { ok: true, shape: unionOf(mukims.map((mukim) => mukim.polygons)) };
}

/**
 * What the zone maker posts a shape as: JSON text, not arrays. React counts
 * the arrays a server action's arguments hold, and a coastline of many
 * rings passes its limit; text is one value. Null for text that is not JSON.
 */
function fromJson(text: unknown): unknown {
  if (typeof text !== "string") return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/**
 * The zone as posted, with a district or its mukims kept as they are read
 * again from their codes, so the boundary is always the data's and never
 * the browser's. Every other shape, a circle around a place included, is
 * the admin's own drawing, reshaped on the map, and is stored as posted
 * once it is a shape.
 */
async function zoneFieldsOf(
  text: unknown,
): Promise<{ ok: true; value: ZoneFields } | { ok: false; error: string }> {
  const parsed = parseZoneFields(fromJson(text));
  if (!parsed.ok) return parsed;
  const { drawnFrom } = parsed.value;
  if (!isZoneDistrict(drawnFrom)) return parsed;
  const district = districtShape(drawnFrom.districtCode);
  if (!district) return { ok: false, error: "Pick a district from the list." };
  if (!drawnFrom.mukimCodes) {
    return {
      ok: true,
      value: {
        ...parsed.value,
        shape: district.polygons,
        drawnFrom: { districtCode: district.code, label: district.name },
      },
    };
  }
  const mukims = await mukimShapeOf(district.code, drawnFrom.mukimCodes);
  if (!mukims.ok) return mukims;
  return {
    ok: true,
    value: {
      ...parsed.value,
      shape: mukims.shape,
      drawnFrom: {
        districtCode: district.code,
        mukimCodes: drawnFrom.mukimCodes,
        label: district.name,
      },
    },
  };
}

/**
 * `fields` is the zone's name, shape and origin as JSON text; `cutFrom`,
 * the zones in the way to trim, when the admin chose that.
 */
export async function createZoneAction(
  locationId: string,
  fields: string,
  cutFrom?: string[],
): Promise<ZoneSaved> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return { ok: false, error: FORBIDDEN_MESSAGE };
  const chosen = cutFromOf(cutFrom);
  if (typeof locationId !== "string" || chosen === null) {
    return { ok: false, error: "The zone could not be read. Reload." };
  }
  const zone = await zoneFieldsOf(fields);
  if (!zone.ok) return zone;
  const result = await createZone(
    actorOf(admin),
    locationId,
    zone.value,
    chosen,
  );
  if (!result.ok) return result;
  revalidateLocation();
  refreshLocationAfter(locationId, ...result.alsoChanged);
  return { ok: true, id: result.id };
}

/** `fields` and `cutFrom` as for `createZoneAction`. */
export async function updateZoneAction(
  locationId: string,
  zoneId: string,
  fields: string,
  cutFrom?: string[],
): Promise<ZoneSaved> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return { ok: false, error: FORBIDDEN_MESSAGE };
  const chosen = cutFromOf(cutFrom);
  if (
    typeof locationId !== "string" ||
    typeof zoneId !== "string" ||
    chosen === null
  ) {
    return { ok: false, error: "The zone could not be read. Reload." };
  }
  const zone = await zoneFieldsOf(fields);
  if (!zone.ok) return zone;
  const result = await updateZone(actorOf(admin), zoneId, zone.value, chosen);
  if (!result.ok) return result;
  revalidateLocation();
  refreshLocationAfter(locationId, ...result.alsoChanged);
  return { ok: true, id: zoneId };
}

export async function deleteZoneAction(
  locationId: string,
  zoneId: string,
): Promise<ActionState> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return FORBIDDEN;
  if (typeof locationId !== "string" || typeof zoneId !== "string") {
    return STALE;
  }
  const result = await deleteZone(actorOf(admin), zoneId);
  if (result.ok) {
    revalidateLocation();
    refreshLocationAfter(locationId, ...result.alsoChanged);
  }
  return stateOf(result);
}

/** Where a place is, for the circle's preview on the map. */
export type PlacePoint =
  | { ok: false; error: string }
  | { ok: true; label: string; lat: number; lng: number };

export async function placePointAction(placeId: string): Promise<PlacePoint> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return { ok: false, error: FORBIDDEN_MESSAGE };
  if (typeof placeId !== "string" || !placeId) {
    return { ok: false, error: "Pick a place from the list." };
  }
  const place = await resolvePlace(placeId);
  if (!place) return { ok: false, error: "Google did not return that place." };
  return { ok: true, label: place.label, lat: place.lat, lng: place.lng };
}

/**
 * A district's boundary, for the preview of a zone that is the district,
 * and its mukims with theirs, to tick and to draw on the map; none for a
 * district with no mukims, as in Sabah.
 */
export type DistrictPolygons =
  | { ok: false; error: string }
  | {
      ok: true;
      label: string;
      polygons: MultiPolygon;
      mukims: MukimChoice[];
    };

export async function districtPolygonsAction(
  code: string,
): Promise<DistrictPolygons> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return { ok: false, error: FORBIDDEN_MESSAGE };
  const district = typeof code === "string" ? districtShape(code) : undefined;
  if (!district) return { ok: false, error: "Pick a district from the list." };
  const mukims = await mukimsOf(district.code);
  return {
    ok: true,
    label: district.name,
    polygons: district.polygons,
    mukims: mukims.map((mukim) => ({
      code: mukim.code,
      name: mukim.name,
      kind: MUKIM_KIND_LABELS[mukim.kind],
      polygons: mukim.polygons,
    })),
  };
}

/** Some of a district's mukims as one shape, for the preview of a zone made of them. */
export type MukimPolygons =
  { ok: false; error: string } | { ok: true; polygons: MultiPolygon };

export async function mukimPolygonsAction(
  districtCode: string,
  codes: string[],
): Promise<MukimPolygons> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return { ok: false, error: FORBIDDEN_MESSAGE };
  if (
    typeof districtCode !== "string" ||
    !Array.isArray(codes) ||
    !codes.every((code) => typeof code === "string")
  ) {
    return { ok: false, error: "Tick the mukims again from the list." };
  }
  const shape = await mukimShapeOf(districtCode, codes);
  return shape.ok ? { ok: true, polygons: shape.shape } : shape;
}

/**
 * What the zone being made overlaps, and both ways out as the save would
 * take them, or why the shape could not be read.
 */
export type OverlapAnswer =
  { ok: false; error: string } | ({ ok: true } & OverlapCheck);

/**
 * `shapeText` is the shape as JSON text, as the zone's fields are. The zone
 * maker asks after every change of the shape, so an overlap shows while
 * the zone is drawn, its ways out ready, not first on the save.
 */
export async function checkOverlapsAction(
  locationId: string,
  shapeText: string,
  zoneId: string | null,
): Promise<OverlapAnswer> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return { ok: false, error: FORBIDDEN_MESSAGE };
  const shape = fromJson(shapeText);
  if (
    typeof locationId !== "string" ||
    !isZoneShape(shape) ||
    (zoneId !== null && typeof zoneId !== "string")
  ) {
    return { ok: false, error: "The zone could not be read. Reload." };
  }
  return {
    ok: true,
    ...(await checkOverlaps(locationId, shape, zoneId ?? undefined)),
  };
}
