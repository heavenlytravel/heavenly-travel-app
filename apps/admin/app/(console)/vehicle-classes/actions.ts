"use server";

import {
  createVehicleClass,
  parseVehicleClassFields,
  textOf,
  updateVehicleClass,
} from "@repo/db/server";
import { revalidatePath } from "next/cache";
import { actorOf, getAdmin } from "../../_lib/access";
import { FORBIDDEN, stateOf, type ActionState } from "../../_lib/action-state";
import { VEHICLE_CLASSES_PATH } from "../../_lib/routes";
import { refreshVehicleClassesAfter } from "../../_lib/site";

/**
 * The Vehicle classes screen's actions. Each checks `coverage.manage`
 * again, passes the admin as the actor and lets the writer in @repo/db
 * check the rest. A class change moves the Dashboard's count too, and the
 * classes the customer site's product pages list.
 */
function revalidateClasses() {
  revalidatePath(VEHICLE_CLASSES_PATH);
  revalidatePath("/");
  refreshVehicleClassesAfter();
}

export async function createVehicleClassAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return FORBIDDEN;
  const parsed = parseVehicleClassFields(Object.fromEntries(formData));
  if (!parsed.ok) return { error: parsed.error };
  const result = await createVehicleClass(actorOf(admin), parsed.value);
  if (result.ok) revalidateClasses();
  return stateOf(result);
}

/** Every field of the sheet, saved together. */
export async function updateVehicleClassAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return FORBIDDEN;
  const id = textOf(formData.get("id"));
  if (!id) return { error: "Missing vehicle class." };
  const parsed = parseVehicleClassFields(Object.fromEntries(formData));
  if (!parsed.ok) return { error: parsed.error };
  const result = await updateVehicleClass(actorOf(admin), id, parsed.value);
  if (result.ok) revalidateClasses();
  return stateOf(result);
}

export async function setVehicleClassActiveAction(
  id: string,
  isActive: boolean,
): Promise<ActionState> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return FORBIDDEN;
  if (typeof id !== "string" || typeof isActive !== "boolean") {
    return { error: "Choose on or off." };
  }
  const result = await updateVehicleClass(actorOf(admin), id, { isActive });
  if (result.ok) revalidateClasses();
  return stateOf(result);
}
