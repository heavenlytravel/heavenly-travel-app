"use server";

import {
  parseMultiplier,
  setDistrictActive,
  setStateMultiplier,
  textOf,
} from "@repo/db/server";
import { revalidatePath } from "next/cache";
import { actorOf, getAdmin } from "../../_lib/access";
import {
  FORBIDDEN,
  FORBIDDEN_MESSAGE,
  stateOf,
  type ActionState,
} from "../../_lib/action-state";
import { checkPlace, type PlaceCheck } from "../../_lib/place-check";
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

/** "Test an address": places a picked address as a booking would. */
export async function testAddressAction(placeId: string): Promise<PlaceCheck> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return { ok: false, error: FORBIDDEN_MESSAGE };
  return checkPlace(placeId);
}
