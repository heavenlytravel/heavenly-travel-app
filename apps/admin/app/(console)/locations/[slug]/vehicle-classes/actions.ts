"use server";

import {
  createOffering,
  getLocationSlug,
  parseOfferingFields,
  parseVehicleClassFields,
  textOf,
  updateOffering,
  type OfferingClassChoice,
} from "@repo/db/server";
import { actorOf, getAdmin } from "../../../../_lib/access";
import {
  type ActionState,
  FORBIDDEN,
  refusalOf,
  STALE,
  stateOf,
} from "../../../../_lib/action-state";
import { LOCATIONS_PATH, locationTabHref } from "../../../../_lib/routes";
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

/** Where a saved offering goes back to: the tab, at the location's slug, which the form does not carry. */
async function tabHref(locationId: string) {
  const slug = await getLocationSlug(locationId);
  return slug ? locationTabHref(slug, "vehicle-classes") : LOCATIONS_PATH;
}

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
  if (!locationId) return STALE;
  const values = Object.fromEntries(formData);

  let choice: OfferingClassChoice;
  if (textOf(values[SOURCE_FIELD]) === "new") {
    // A class created here starts active in the catalogue; the offering's
    // own switch is the `isActive` field below.
    const parsed = parseVehicleClassFields({ ...values, isActive: true });
    if (!parsed.ok) return refusalOf(parsed);
    choice = { newClass: parsed.value };
  } else {
    const vehicleClassId = textOf(values.vehicleClassId);
    if (!vehicleClassId) {
      return {
        error: "Choose a class from the catalogue.",
        field: "vehicleClassId",
      };
    }
    choice = { vehicleClassId };
  }
  const rates = parseOfferingFields(values);
  if (!rates.ok) return refusalOf(rates);

  const result = await createOffering(
    actorOf(admin),
    locationId,
    choice,
    rates.value,
  );
  if (!result.ok) return stateOf(result);
  revalidateLocation();
  refreshLocationAfter(locationId);
  if ("newClass" in choice) refreshVehicleClassesAfter();
  return { href: await tabHref(locationId) };
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
  if (!id || !locationId) return STALE;
  const parsed = parseOfferingFields(Object.fromEntries(formData));
  if (!parsed.ok) return refusalOf(parsed);

  const result = await updateOffering(actorOf(admin), id, parsed.value);
  if (!result.ok) return refusalOf(result);
  revalidateLocation();
  refreshLocationAfter(locationId);
  return { href: await tabHref(locationId) };
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
  )
    return STALE;
  const result = await updateOffering(actorOf(admin), id, { isActive });
  if (result.ok) {
    revalidateLocation();
    refreshLocationAfter(locationId);
  }
  return stateOf(result);
}
