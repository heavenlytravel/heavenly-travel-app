"use server";

import {
  createDriver,
  deleteDriver,
  DRIVER_CLASSES_FIELD,
  getDriver,
  parseDriverFields,
  parseDriverSignIn,
  textOf,
  updateDriver,
  deleteConfirmationOf,
} from "@repo/db/server";
import { actorOf, getAdmin } from "../../../../_lib/access";
import {
  type ActionState,
  FORBIDDEN,
  refusalOf,
  STALE,
  stateOf,
} from "@repo/console/action-state";
import {
  fleetSavedHref,
  revalidateFleet,
} from "../../../../_lib/fleet-actions";

/**
 * The driver form's actions, under `~` and under a location. Each
 * checks `fleet.manage` again, passes the admin as the actor and lets the
 * writer in @repo/db check the rest. A driver's email gives them an
 * account; no email is sent from here yet, as for every console email.
 * Where a saved driver opens and what it refreshes is _lib/fleet-actions.
 */

/** The driver's fields and the password for their new account, read and checked against the email saved. */
function parsed(formData: FormData, savedEmail: string | null) {
  const values = Object.fromEntries(formData);
  const fields = parseDriverFields(
    values,
    formData.getAll(DRIVER_CLASSES_FIELD),
  );
  if (!fields.ok) return fields;
  const password = parseDriverSignIn(values, fields.value.email, savedEmail);
  if (!password.ok) return password;
  return { ok: true as const, fields: fields.value, password: password.value };
}

export async function createDriverAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("fleet.manage");
  if (!admin) return FORBIDDEN;
  const read = parsed(formData, null);
  if (!read.ok) return refusalOf(read);
  const result = await createDriver(actorOf(admin), read.fields, read.password);
  if (!result.ok) return stateOf(result);
  revalidateFleet("drivers");
  return {
    href: await fleetSavedHref("drivers", formData, read.fields.locationId),
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
  const driver = id ? await getDriver(id) : null;
  if (!driver) return STALE;
  const read = parsed(formData, driver.email);
  if (!read.ok) return refusalOf(read);
  const result = await updateDriver(
    actorOf(admin),
    id,
    read.fields,
    read.password,
  );
  if (!result.ok) return stateOf(result);
  revalidateFleet("drivers");
  return {
    href: await fleetSavedHref("drivers", formData, read.fields.locationId),
  };
}

/**
 * Deletes a driver entered by mistake, and their account when never
 * used; the button then opens the list. `seen` and `typed` are what the
 * delete's dialog showed and what the admin typed (@repo/db's
 * delete-impact).
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
