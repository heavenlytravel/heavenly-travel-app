"use server";

import {
  createVehicle,
  deleteVehicle,
  parseVehicleFields,
  textOf,
  updateVehicle,
} from "@repo/db/server";
import { actorOf, getAdmin } from "../../_lib/access";
import {
  type ActionState,
  FORBIDDEN,
  refusalOf,
  STALE,
  stateOf,
} from "../../_lib/action-state";
import { fleetSavedHref, revalidateFleet } from "../../_lib/fleet-actions";

/**
 * The vehicle form's actions, on a location's Vehicles tab and on the list
 * across locations. Each checks `fleet.manage` again, passes the admin as
 * the actor and lets the writer in @repo/db check the rest. Where a saved
 * vehicle opens and what it refreshes is ../../_lib/fleet-actions.
 */

export async function createVehicleAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("fleet.manage");
  if (!admin) return FORBIDDEN;
  const parsed = parseVehicleFields(Object.fromEntries(formData));
  if (!parsed.ok) return refusalOf(parsed);
  const result = await createVehicle(actorOf(admin), parsed.value);
  if (!result.ok) return stateOf(result);
  revalidateFleet("vehicles");
  return {
    href: await fleetSavedHref("vehicles", formData, parsed.value.locationId),
  };
}

/** Every field of the form, saved together. */
export async function updateVehicleAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("fleet.manage");
  if (!admin) return FORBIDDEN;
  const id = textOf(formData.get("id"));
  if (!id) return STALE;
  const parsed = parseVehicleFields(Object.fromEntries(formData));
  if (!parsed.ok) return refusalOf(parsed);
  const result = await updateVehicle(actorOf(admin), id, parsed.value);
  if (!result.ok) return stateOf(result);
  revalidateFleet("vehicles");
  return {
    href: await fleetSavedHref("vehicles", formData, parsed.value.locationId),
  };
}

/** Deletes a vehicle entered by mistake; the button then opens the tab. */
export async function deleteVehicleAction(id: string): Promise<ActionState> {
  const admin = await getAdmin("fleet.manage");
  if (!admin) return FORBIDDEN;
  if (typeof id !== "string" || !id) return STALE;
  const result = await deleteVehicle(actorOf(admin), id);
  if (result.ok) revalidateFleet("vehicles");
  return stateOf(result);
}
