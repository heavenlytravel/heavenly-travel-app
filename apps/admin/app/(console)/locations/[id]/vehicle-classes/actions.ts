"use server";

import {
  createOffering,
  parseOfferingFields,
  parseVehicleClassFields,
  textOf,
  updateOffering,
  type OfferingClassChoice,
} from "@repo/db/server";
import { redirect } from "next/navigation";
import { actorOf, getAdmin } from "../../../../_lib/access";
import {
  FORBIDDEN,
  stateOf,
  type ActionState,
} from "../../../../_lib/action-state";
import { locationTabHref } from "../../../../_lib/routes";
import {
  refreshLocationAfter,
  refreshVehicleClassesAfter,
} from "../../../../_lib/site";
import { revalidateLocation } from "../../_lib/revalidate";
import { SOURCE_FIELD } from "./offering-form";

/**
 * The Vehicle classes tab's actions. Each checks `coverage.manage` again,
 * passes the admin as the actor and lets the writer in @repo/db check the
 * rest. A change to what a location sells refreshes its pages on the
 * customer site, which list the classes with their starting prices.
 */

/**
 * "Add class": the rates, and either the catalogue class picked or the
 * fields of a new one. A saved offering opens the tab.
 */
export async function createOfferingAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return FORBIDDEN;
  const locationId = textOf(formData.get("locationId"));
  if (!locationId) return { error: "Missing location." };
  const values = Object.fromEntries(formData);

  let choice: OfferingClassChoice;
  if (textOf(values[SOURCE_FIELD]) === "new") {
    // A class created here starts active in the catalogue; the offering's
    // own switch is the `isActive` field below.
    const parsed = parseVehicleClassFields({ ...values, isActive: true });
    if (!parsed.ok) return { error: parsed.error };
    choice = { newClass: parsed.value };
  } else {
    const vehicleClassId = textOf(values.vehicleClassId);
    if (!vehicleClassId) return { error: "Pick a class from the catalogue." };
    choice = { vehicleClassId };
  }
  const rates = parseOfferingFields(values);
  if (!rates.ok) return { error: rates.error };

  const result = await createOffering(
    actorOf(admin),
    locationId,
    choice,
    rates.value,
  );
  if (!result.ok) return stateOf(result);
  revalidateLocation(locationId);
  refreshLocationAfter(locationId);
  if ("newClass" in choice) refreshVehicleClassesAfter();
  redirect(locationTabHref(locationId, "vehicle-classes"));
}

/** The rates and the switch of one offering, saved together. */
export async function updateOfferingAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return FORBIDDEN;
  const id = textOf(formData.get("id"));
  const locationId = textOf(formData.get("locationId"));
  if (!id || !locationId) return { error: "Missing offering." };
  const parsed = parseOfferingFields(Object.fromEntries(formData));
  if (!parsed.ok) return { error: parsed.error };

  const result = await updateOffering(actorOf(admin), id, parsed.value);
  if (result.ok) {
    revalidateLocation(locationId);
    refreshLocationAfter(locationId);
  }
  return stateOf(result);
}

export async function setOfferingActiveAction(
  locationId: string,
  id: string,
  isActive: boolean,
): Promise<ActionState> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return FORBIDDEN;
  if (
    typeof locationId !== "string" ||
    typeof id !== "string" ||
    typeof isActive !== "boolean"
  ) {
    return { error: "Choose on or off." };
  }
  const result = await updateOffering(actorOf(admin), id, { isActive });
  if (result.ok) {
    revalidateLocation(locationId);
    refreshLocationAfter(locationId);
  }
  return stateOf(result);
}
