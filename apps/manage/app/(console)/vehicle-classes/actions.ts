"use server";

import {
  createVehicleClass,
  parseVehicleClassFields,
  textOf,
  updateVehicleClass,
} from "@repo/db/server";
import { revalidatePath } from "next/cache";
import { actorOf, getAdmin } from "../../_lib/access";
import {
  type ActionState,
  FORBIDDEN,
  refusalOf,
  STALE,
  stateOf,
} from "@repo/console/action-state";
import { VEHICLE_CLASSES_PATH } from "../../_lib/routes";
import { refreshVehicleClassesAfter } from "../../_lib/site";

/**
 * The Vehicle classes screen's actions. Each checks `coverage.manage`
 * again, passes the admin as the actor and lets the writer in @repo/db
 * check the rest. A class change moves the home's counts too, and the
 * classes the customer site's pages list. A saved class goes back to the
 * list.
 */
function revalidateClasses() {
  revalidatePath(VEHICLE_CLASSES_PATH, "layout");
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
  if (!parsed.ok) return refusalOf(parsed);
  const result = await createVehicleClass(actorOf(admin), parsed.value);
  if (!result.ok) return refusalOf(result);
  revalidateClasses();
  return { href: VEHICLE_CLASSES_PATH };
}

/** Every field of the sheet, saved together. */
export async function updateVehicleClassAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return FORBIDDEN;
  const id = textOf(formData.get("id"));
  if (!id) return STALE;
  const parsed = parseVehicleClassFields(Object.fromEntries(formData));
  if (!parsed.ok) return refusalOf(parsed);
  const result = await updateVehicleClass(actorOf(admin), id, parsed.value);
  if (!result.ok) return refusalOf(result);
  revalidateClasses();
  return { href: VEHICLE_CLASSES_PATH };
}

export async function setVehicleClassActiveAction(
  id: string,
  isActive: boolean,
): Promise<ActionState> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return FORBIDDEN;
  if (typeof id !== "string" || typeof isActive !== "boolean") return STALE;
  const result = await updateVehicleClass(actorOf(admin), id, { isActive });
  if (result.ok) revalidateClasses();
  return stateOf(result);
}
