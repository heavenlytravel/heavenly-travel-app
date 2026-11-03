"use server";

import {
  createGuide,
  deleteConfirmationOf,
  deleteGuide,
  getGuide,
  GUIDE_LANGUAGES_FIELD,
  parseGuideFields,
  textOf,
  updateGuide,
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
 * The tour guide form's actions, under `~` and under a location. Each
 * checks `fleet.manage` again, passes the admin as the actor and lets the
 * writer in @repo/db check the rest. A guide has no account. Where a
 * saved guide opens and what it refreshes is _lib/fleet-actions.
 */

export async function createGuideAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("fleet.manage");
  if (!admin) return FORBIDDEN;
  const fields = parseGuideFields(
    Object.fromEntries(formData),
    formData.getAll(GUIDE_LANGUAGES_FIELD),
  );
  if (!fields.ok) return refusalOf(fields);
  const result = await createGuide(actorOf(admin), fields.value);
  if (!result.ok) return stateOf(result);
  revalidateFleet("guides");
  return {
    href: await fleetSavedHref("guides", formData, fields.value.locationId),
  };
}

/** Every field of the form, saved together. */
export async function updateGuideAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("fleet.manage");
  if (!admin) return FORBIDDEN;
  const id = textOf(formData.get("id"));
  const guide = id ? await getGuide(id) : null;
  if (!guide) return STALE;
  const fields = parseGuideFields(
    Object.fromEntries(formData),
    formData.getAll(GUIDE_LANGUAGES_FIELD),
  );
  if (!fields.ok) return refusalOf(fields);
  const result = await updateGuide(actorOf(admin), id, fields.value);
  if (!result.ok) return stateOf(result);
  revalidateFleet("guides");
  return {
    href: await fleetSavedHref("guides", formData, fields.value.locationId),
  };
}

/**
 * Deletes a tour guide entered by mistake; the button then opens the
 * list. `seen` and `typed` are what the delete's dialog showed and what
 * the admin typed (@repo/db's delete-impact).
 */
export async function deleteGuideAction(
  id: string,
  seen: string[],
  typed: string | null,
): Promise<ActionState> {
  const admin = await getAdmin("fleet.manage");
  if (!admin) return FORBIDDEN;
  const confirmation = deleteConfirmationOf(seen, typed);
  if (typeof id !== "string" || !id || !confirmation) return STALE;
  const result = await deleteGuide(actorOf(admin), id, confirmation);
  if (result.ok) revalidateFleet("guides");
  return stateOf(result);
}
