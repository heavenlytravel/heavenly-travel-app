"use server";

import {
  createVehicleClass,
  createVehicleModel,
  deleteVehicleModel,
  parseVehicleClassFields,
  parseVehicleModelFields,
  textOf,
  updateVehicleClass,
  updateVehicleModel,
} from "@repo/db/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actorOf, getAdmin } from "../../_lib/access";
import { FORBIDDEN, stateOf, type ActionState } from "../../_lib/action-state";
import { VEHICLE_CLASSES_PATH, vehicleClassHref } from "../../_lib/routes";
import { refreshVehicleClassesAfter } from "../../_lib/site";

/**
 * The Vehicle classes screen's actions, a class's models with them. Each
 * checks `coverage.manage` again, passes the admin as the actor and lets
 * the writer in @repo/db check the rest. A class change moves the home's
 * counts too, and the classes and models the customer site's pages list.
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

/** "Add model": its fields and photos. A saved model opens its class. */
export async function createVehicleModelAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return FORBIDDEN;
  const classId = textOf(formData.get("vehicleClassId"));
  if (!classId) return { error: "Missing vehicle class." };
  const parsed = parseVehicleModelFields(Object.fromEntries(formData));
  if (!parsed.ok) return { error: parsed.error };
  const result = await createVehicleModel(
    actorOf(admin),
    classId,
    parsed.value,
  );
  if (!result.ok) return stateOf(result);
  revalidateClasses();
  redirect(vehicleClassHref(classId));
}

/** Every field of a model and its photos, saved together. A saved model opens its class. */
export async function updateVehicleModelAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return FORBIDDEN;
  const id = textOf(formData.get("id"));
  const classId = textOf(formData.get("vehicleClassId"));
  if (!id || !classId) return { error: "Missing model." };
  const parsed = parseVehicleModelFields(Object.fromEntries(formData));
  if (!parsed.ok) return { error: parsed.error };
  const result = await updateVehicleModel(actorOf(admin), id, parsed.value);
  if (!result.ok) return stateOf(result);
  revalidateClasses();
  redirect(vehicleClassHref(classId));
}

/** Deletes a model no vehicle is of; the button then opens its class. */
export async function deleteVehicleModelAction(
  id: string,
): Promise<ActionState> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return FORBIDDEN;
  if (typeof id !== "string" || !id) return { error: "Missing model." };
  const result = await deleteVehicleModel(actorOf(admin), id);
  if (result.ok) revalidateClasses();
  return stateOf(result);
}
