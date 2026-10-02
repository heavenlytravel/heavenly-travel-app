"use server";

import {
  parseMultiplier,
  resolveDistrict,
  setDistrictActive,
  setStateMultiplier,
  textOf,
} from "@repo/db/server";
import { resolvePlace } from "@repo/places/server";
import { revalidatePath } from "next/cache";
import { actorOf, getAdmin } from "../../_lib/access";
import {
  FORBIDDEN,
  FORBIDDEN_MESSAGE,
  stateOf,
  type ActionState,
} from "../../_lib/action-state";
import { COVERAGE_PATH, stateHref } from "../../_lib/routes";

/**
 * The Coverage screen's actions. Each checks `coverage.manage` again,
 * passes the admin as the actor and lets the writer in @repo/db check the
 * rest. A district switch moves the Dashboard's count too.
 */
function revalidateState(code: string) {
  revalidatePath(stateHref(code));
  revalidatePath(COVERAGE_PATH);
  revalidatePath("/");
}

export async function setStateMultiplierAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return FORBIDDEN;
  const code = textOf(formData.get("code"));
  if (!code) return { error: "Missing state." };
  const parsed = parseMultiplier(Object.fromEntries(formData));
  if (!parsed.ok) return { error: parsed.error };
  const result = await setStateMultiplier(actorOf(admin), code, parsed.value);
  if (result.ok) revalidateState(code);
  return stateOf(result);
}

export async function setDistrictActiveAction(
  stateCode: string,
  code: string,
  isActive: boolean,
): Promise<ActionState> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return FORBIDDEN;
  if (
    typeof stateCode !== "string" ||
    typeof code !== "string" ||
    typeof isActive !== "boolean"
  ) {
    return { error: "Choose on or off." };
  }
  const result = await setDistrictActive(actorOf(admin), code, isActive);
  if (result.ok) revalidateState(stateCode);
  return stateOf(result);
}

/** What "Test an address" learns about a place the admin picked. */
export type AddressTest =
  | { ok: false; error: string }
  | {
      ok: true;
      address: string;
      lat: number;
      lng: number;
      /** The district the point falls in, or null at sea or outside Malaysia. */
      district: {
        code: string;
        name: string;
        isActive: boolean;
        stateCode: string;
        stateName: string;
      } | null;
    };

/** Places a picked address by its coordinates, exactly as a booking would. */
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
  const district = await resolveDistrict(place);
  return {
    ok: true,
    address: place.address,
    lat: place.lat,
    lng: place.lng,
    district: district
      ? {
          code: district.code,
          name: district.name,
          isActive: district.isActive,
          stateCode: district.state.code,
          stateName: district.state.name,
        }
      : null,
  };
}
