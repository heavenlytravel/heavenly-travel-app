"use server";

import {
  createVehicle,
  deleteVehicle,
  getLocationSlug,
  parseVehicleFields,
  textOf,
  updateVehicle,
} from "@repo/db/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actorOf, getAdmin } from "../../../../_lib/access";
import {
  FORBIDDEN,
  stateOf,
  type ActionState,
} from "../../../../_lib/action-state";
import {
  LOCATIONS_PATH,
  VEHICLE_CLASSES_PATH,
  VEHICLES_PATH,
  locationTabHref,
} from "../../../../_lib/routes";
import { refreshVehicleClassesAfter } from "../../../../_lib/site";
import { revalidateLocation } from "../../_lib/revalidate";

/**
 * The Vehicles tab's actions. Each checks `fleet.manage` again, passes the
 * admin as the actor and lets the writer in @repo/db check the rest. A
 * saved vehicle opens the Vehicles tab of the location it is based at,
 * which a move changes. A vehicle can add a model
 * to its class, and changes the models a location's customers see, so the
 * catalogue and the customer site's class cards refresh too.
 */
function revalidateVehicles() {
  revalidateLocation();
  revalidatePath(VEHICLES_PATH);
  revalidatePath(VEHICLE_CLASSES_PATH, "layout");
  refreshVehicleClassesAfter();
}

async function openVehiclesOf(locationId: string): Promise<never> {
  const slug = await getLocationSlug(locationId);
  redirect(slug ? locationTabHref(slug, "vehicles") : LOCATIONS_PATH);
}

export async function createVehicleAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("fleet.manage");
  if (!admin) return FORBIDDEN;
  const parsed = parseVehicleFields(Object.fromEntries(formData));
  if (!parsed.ok) return { error: parsed.error };
  const result = await createVehicle(actorOf(admin), parsed.value);
  if (!result.ok) return stateOf(result);
  revalidateVehicles();
  return openVehiclesOf(parsed.value.locationId);
}

/** Every field of the form, saved together. */
export async function updateVehicleAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("fleet.manage");
  if (!admin) return FORBIDDEN;
  const id = textOf(formData.get("id"));
  if (!id) return { error: "Missing vehicle." };
  const parsed = parseVehicleFields(Object.fromEntries(formData));
  if (!parsed.ok) return { error: parsed.error };
  const result = await updateVehicle(actorOf(admin), id, parsed.value);
  if (!result.ok) return stateOf(result);
  revalidateVehicles();
  return openVehiclesOf(parsed.value.locationId);
}

/** Deletes a vehicle entered by mistake; the button then opens the tab. */
export async function deleteVehicleAction(id: string): Promise<ActionState> {
  const admin = await getAdmin("fleet.manage");
  if (!admin) return FORBIDDEN;
  if (typeof id !== "string" || !id) return { error: "Missing vehicle." };
  const result = await deleteVehicle(actorOf(admin), id);
  if (result.ok) revalidateVehicles();
  return stateOf(result);
}
