"use server";

import {
  createDriver,
  deleteDriver,
  DRIVER_CLASSES_FIELD,
  getLocationSlug,
  parseDriverFields,
  textOf,
  updateDriver,
} from "@repo/db/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actorOf, getAdmin } from "../../_lib/access";
import {
  FORBIDDEN,
  stateOf,
  type ActionState,
} from "../../_lib/action-state";
import {
  DRIVERS_PATH,
  FLEET_BACK_FIELD,
  FLEET_BACK_TO_LIST,
  LOCATIONS_PATH,
  locationTabHref,
} from "../../_lib/routes";
import { revalidateLocation } from "../locations/_lib/revalidate";

/**
 * The driver form's actions, on a location's Drivers tab and on the list
 * across locations. Each checks `fleet.manage` again, passes the admin as
 * the actor and lets the writer in @repo/db check the rest. A saved
 * driver opens the Drivers tab of the location they are based at, which a
 * move changes, or the list they were added from.
 */
function revalidateDrivers() {
  revalidateLocation();
  revalidatePath(DRIVERS_PATH);
}

async function openAfterSave(
  formData: FormData,
  locationId: string,
): Promise<never> {
  if (formData.get(FLEET_BACK_FIELD) === FLEET_BACK_TO_LIST) {
    redirect(DRIVERS_PATH);
  }
  const slug = await getLocationSlug(locationId);
  redirect(slug ? locationTabHref(slug, "drivers") : LOCATIONS_PATH);
}

function parsed(formData: FormData) {
  return parseDriverFields(
    Object.fromEntries(formData),
    formData.getAll(DRIVER_CLASSES_FIELD),
  );
}

export async function createDriverAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("fleet.manage");
  if (!admin) return FORBIDDEN;
  const fields = parsed(formData);
  if (!fields.ok) return { error: fields.error };
  const result = await createDriver(actorOf(admin), fields.value);
  if (!result.ok) return stateOf(result);
  revalidateDrivers();
  return openAfterSave(formData, fields.value.locationId);
}

/** Every field of the form, saved together. */
export async function updateDriverAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("fleet.manage");
  if (!admin) return FORBIDDEN;
  const id = textOf(formData.get("id"));
  if (!id) return { error: "Missing driver." };
  const fields = parsed(formData);
  if (!fields.ok) return { error: fields.error };
  const result = await updateDriver(actorOf(admin), id, fields.value);
  if (!result.ok) return stateOf(result);
  revalidateDrivers();
  return openAfterSave(formData, fields.value.locationId);
}

/** Deletes a driver entered by mistake; the button then opens the tab. */
export async function deleteDriverAction(id: string): Promise<ActionState> {
  const admin = await getAdmin("fleet.manage");
  if (!admin) return FORBIDDEN;
  if (typeof id !== "string" || !id) return { error: "Missing driver." };
  const result = await deleteDriver(actorOf(admin), id);
  if (result.ok) revalidateDrivers();
  return stateOf(result);
}
