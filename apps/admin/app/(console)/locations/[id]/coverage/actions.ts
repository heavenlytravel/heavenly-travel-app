"use server";

import {
  circleRing,
  createZone,
  deleteZone,
  districtShape,
  isZoneCircle,
  isZoneDistrict,
  parseZoneFields,
  updateZone,
  type MultiPolygon,
  type ZoneFields,
} from "@repo/db/server";
import { resolvePlace } from "@repo/places/server";
import { actorOf, getAdmin } from "../../../../_lib/access";
import {
  FORBIDDEN,
  FORBIDDEN_MESSAGE,
  stateOf,
  type ActionState,
} from "../../../../_lib/action-state";
import { revalidateLocation } from "../../_lib/revalidate";

/**
 * The Coverage tab's actions: the zones. Each checks `coverage.manage` again,
 * passes the admin as the actor and lets the writer in @repo/db check the
 * rest. Arguments passed directly, not through a form, are checked for
 * their type here: an action is reachable by direct POST. Nothing here is
 * public, so the customer site is not refreshed: the quote reads the rows.
 */

/** A zone write's answer: the zone's id, or why not. */
export type ZoneSaved = { ok: true; id: string } | { ok: false; error: string };

/**
 * The zone as posted, with a circle's ring drawn again here from the place
 * and the radius, and a district's polygons read again from its code: the
 * browser's preview is never trusted for the shape.
 */
async function zoneFieldsOf(
  input: unknown,
): Promise<{ ok: true; value: ZoneFields } | { ok: false; error: string }> {
  const parsed = parseZoneFields(input);
  if (!parsed.ok) return parsed;
  const { drawnFrom } = parsed.value;
  if (isZoneDistrict(drawnFrom)) {
    const district = districtShape(drawnFrom.districtCode);
    if (!district)
      return { ok: false, error: "Pick a district from the list." };
    return {
      ok: true,
      value: {
        ...parsed.value,
        shape: district.polygons,
        drawnFrom: { districtCode: district.code, label: district.name },
      },
    };
  }
  if (!isZoneCircle(drawnFrom)) return parsed;
  const place = await resolvePlace(drawnFrom.placeId);
  if (!place) {
    return {
      ok: false,
      error: "Google did not return the place of the circle.",
    };
  }
  return {
    ok: true,
    value: {
      ...parsed.value,
      shape: circleRing(place, drawnFrom.radiusM),
      drawnFrom: { ...drawnFrom, label: place.label },
    },
  };
}

export async function createZoneAction(
  locationId: string,
  input: unknown,
): Promise<ZoneSaved> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return { ok: false, error: FORBIDDEN_MESSAGE };
  if (typeof locationId !== "string") {
    return { ok: false, error: "Missing location." };
  }
  const fields = await zoneFieldsOf(input);
  if (!fields.ok) return fields;
  const result = await createZone(actorOf(admin), locationId, fields.value);
  if (result.ok) revalidateLocation(locationId);
  return result;
}

export async function updateZoneAction(
  locationId: string,
  zoneId: string,
  input: unknown,
): Promise<ZoneSaved> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return { ok: false, error: FORBIDDEN_MESSAGE };
  if (typeof locationId !== "string" || typeof zoneId !== "string") {
    return { ok: false, error: "Missing zone." };
  }
  const fields = await zoneFieldsOf(input);
  if (!fields.ok) return fields;
  const result = await updateZone(actorOf(admin), zoneId, fields.value);
  if (result.ok) revalidateLocation(locationId);
  return result.ok ? { ok: true, id: zoneId } : result;
}

export async function deleteZoneAction(
  locationId: string,
  zoneId: string,
): Promise<ActionState> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return FORBIDDEN;
  if (typeof locationId !== "string" || typeof zoneId !== "string") {
    return { error: "Missing zone." };
  }
  const result = await deleteZone(actorOf(admin), zoneId);
  if (result.ok) revalidateLocation(locationId);
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

/** A district's boundary, for the preview of a zone that is the district. */
export type DistrictPolygons =
  | { ok: false; error: string }
  | { ok: true; label: string; polygons: MultiPolygon };

export async function districtPolygonsAction(
  code: string,
): Promise<DistrictPolygons> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return { ok: false, error: FORBIDDEN_MESSAGE };
  const district = typeof code === "string" ? districtShape(code) : undefined;
  if (!district) return { ok: false, error: "Pick a district from the list." };
  return { ok: true, label: district.name, polygons: district.polygons };
}
