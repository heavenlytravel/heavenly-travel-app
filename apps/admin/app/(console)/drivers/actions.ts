"use server";

import {
  createDriver,
  deleteDriver,
  DRIVER_CLASSES_FIELD,
  parseDriverFields,
  textOf,
  updateDriver,
  deleteConfirmationOf,
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
 * The driver form's actions, on a location's Drivers tab and on the list
 * across locations. Each checks `fleet.manage` again, passes the admin as
 * the actor and lets the writer in @repo/db check the rest. Where a saved
 * driver opens and what it refreshes is ../../_lib/fleet-actions.
 */

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
  if (!fields.ok) return refusalOf(fields);
  const result = await createDriver(actorOf(admin), fields.value);
  if (!result.ok) return stateOf(result);
  revalidateFleet("drivers");
  return {
    href: await fleetSavedHref("drivers", formData, fields.value.locationId),
  };
}

/** Every field of the form, saved together. */
export async function updateDriverAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("fleet.manage");
  if (!admin) return FORBIDDEN;
  const id = textOf(formData.get("id"));
  if (!id) return STALE;
  const fields = parsed(formData);
  if (!fields.ok) return refusalOf(fields);
  const result = await updateDriver(actorOf(admin), id, fields.value);
  if (!result.ok) return stateOf(result);
  revalidateFleet("drivers");
  return {
    href: await fleetSavedHref("drivers", formData, fields.value.locationId),
  };
}

/**
 * Deletes a driver entered by mistake; the button then opens the tab.
 * `seen` and `typed` are what the delete's dialog showed and what the
 * admin typed (@repo/db's delete-impact).
 */
export async function deleteDriverAction(
  id: string,
  seen: string[],
  typed: string | null,
): Promise<ActionState> {
  const admin = await getAdmin("fleet.manage");
  if (!admin) return FORBIDDEN;
  const confirmation = deleteConfirmationOf(seen, typed);
  if (typeof id !== "string" || !id || !confirmation) return STALE;
  const result = await deleteDriver(actorOf(admin), id, confirmation);
  if (result.ok) revalidateFleet("drivers");
  return stateOf(result);
}
