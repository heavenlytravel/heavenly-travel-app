"use server";

import {
  createVehicleClass,
  parseVehicleClassFields,
  textOf,
  updateVehicleClass,
} from "@repo/db/server";
import { actorOf, getAdmin } from "../../../../../_lib/access";
import {
  type ActionState,
  FORBIDDEN,
  refusalOf,
  STALE,
  stateOf,
} from "@repo/console/action-state";
import { revalidateLocation } from "../../../../../_lib/revalidate";
import { classesHref } from "../../../../../_lib/routes";
import { refreshVehicleClassesAfter } from "../../../../../_lib/site";

/**
 * The class catalogue's actions. Each checks `coverage.manage` again,
 * passes the admin as the actor and lets the writer in @repo/db check the
 * rest. A class change moves every console page that reads the classes,
 * the dashboard's counts with them, and the classes the customer site's
 * pages list. A saved class goes back to the catalogue.
 */
function revalidateClasses() {
  revalidateLocation();
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
  return { href: classesHref(null) };
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
  return { href: classesHref(null) };
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
