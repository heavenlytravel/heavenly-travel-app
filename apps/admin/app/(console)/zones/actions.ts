"use server";

import {
  addZoneDistrict,
  createZone,
  parseZoneDistrictFields,
  parseZoneFields,
  removeZoneDistrict,
  resolveZone,
  textOf,
  updateZone,
} from "@repo/db/server";
import { resolvePlace } from "@repo/places/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actorOf, getAdmin } from "../../_lib/access";
import {
  FORBIDDEN,
  FORBIDDEN_MESSAGE,
  stateOf,
  type ActionState,
} from "../../_lib/action-state";
import { ZONES_PATH, zoneHref } from "../../_lib/routes";

/**
 * The Zones screen's actions. Each checks `coverage.manage` again, passes
 * the admin as the actor and lets the writer in @repo/db check the rest.
 * A zone change moves the Dashboard's count too, so "/" is refreshed.
 */
function revalidateZone(id: string) {
  revalidatePath(zoneHref(id));
  revalidatePath(ZONES_PATH);
  revalidatePath("/");
}

/** Makes the zone and opens its page. */
export async function createZoneAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return FORBIDDEN;
  const result = await createZone(actorOf(admin), textOf(formData.get("name")));
  if (!result.ok) return { error: result.error };
  revalidatePath(ZONES_PATH);
  redirect(zoneHref(result.id));
}

/** The name and the multiplier, saved together. */
export async function updateZoneAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return FORBIDDEN;
  const id = textOf(formData.get("id"));
  if (!id) return { error: "Missing zone." };
  const parsed = parseZoneFields(Object.fromEntries(formData));
  if (!parsed.ok) return { error: parsed.error };
  const result = await updateZone(actorOf(admin), id, parsed.value);
  if (result.ok) revalidateZone(id);
  return stateOf(result);
}

export async function setZoneActiveAction(
  id: string,
  isActive: boolean,
): Promise<ActionState> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return FORBIDDEN;
  if (typeof id !== "string" || typeof isActive !== "boolean") {
    return { error: "Choose on or off." };
  }
  const result = await updateZone(actorOf(admin), id, { isActive });
  if (result.ok) revalidateZone(id);
  return stateOf(result);
}

export async function addZoneDistrictAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return FORBIDDEN;
  const zoneId = textOf(formData.get("zoneId"));
  if (!zoneId) return { error: "Missing zone." };
  const parsed = parseZoneDistrictFields(Object.fromEntries(formData));
  if (!parsed.ok) return { error: parsed.error };
  const result = await addZoneDistrict(actorOf(admin), zoneId, parsed.value);
  if (result.ok) revalidateZone(zoneId);
  return stateOf(result);
}

export async function removeZoneDistrictAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return FORBIDDEN;
  const zoneId = textOf(formData.get("zoneId"));
  const districtId = textOf(formData.get("districtId"));
  if (!zoneId || !districtId) return { error: "Missing district." };
  const result = await removeZoneDistrict(actorOf(admin), zoneId, districtId);
  if (result.ok) revalidateZone(zoneId);
  return stateOf(result);
}

/** What "Test an address" learns about a place the admin picked. */
export type AddressTest =
  | { ok: false; error: string }
  | {
      ok: true;
      address: string;
      /** The town Google carries for the place, which is what a district row lists. */
      town: string | null;
      state: string | null;
      /** The zone the place resolves to, and the district row that placed it. */
      match: { zoneId: string; zoneName: string; district: string } | null;
    };

/** Resolves a picked place through Google and `resolveZone`, as a booking would. */
export async function testAddressAction(placeId: string): Promise<AddressTest> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return { ok: false, error: FORBIDDEN_MESSAGE };
  if (typeof placeId !== "string" || !placeId) {
    return { ok: false, error: "Pick a place from the list." };
  }
  const place = await resolvePlace(placeId);
  if (!place) {
    return { ok: false, error: "Google did not return that place." };
  }
  const match = await resolveZone(place);
  return {
    ok: true,
    address: place.address,
    town: place.district ?? place.locality,
    state: place.state,
    match: match
      ? {
          zoneId: match.zone.id,
          zoneName: match.zone.name,
          district: match.district.district,
        }
      : null,
  };
}
