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
import { actorOf, getAdmin } from "../../../../../_lib/access";
import {
  type ActionState,
  FORBIDDEN,
  refusalOf,
  STALE,
  stateOf,
} from "../../../../../_lib/action-state";
import {
  OFFERING_FROM_PARAM,
  dashboardHref,
  offeringBackHref,
  offeringFromOf,
} from "../../../../../_lib/routes";
import {
  refreshLocationAfter,
  refreshVehicleClassesAfter,
} from "../../../../../_lib/site";
import { revalidateLocation } from "../../../../../_lib/revalidate";
import { SOURCE_FIELD } from "./offering-form";

/**
 * The actions on what a location sells, its classes. Each checks
 * `coverage.manage` again, passes the admin as the actor and lets the
 * writer in @repo/db check the rest. A change drops every console page
 * from the cache and refreshes the location's pages on the customer
 * site, which list the classes with their starting prices.
 */

/**
 * Where a saved offering goes back to: the page the form came from, the
 * classes or Rates' class rates, at the location's slug, which the form
 * does not carry; the dashboard when the location went meanwhile.
 */
async function backHref(locationId: string, formData: FormData) {
  const slug = await getLocationSlug(locationId);
  return slug
    ? offeringBackHref(slug, offeringFromOf(formData.get(OFFERING_FROM_PARAM)))
    : dashboardHref(null);
}

/**
 * "Add class": the rates, and either the catalogue class picked or the
 * fields of a new one. A saved offering goes back.
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
  return { href: await backHref(locationId, formData) };
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
  return { href: await backHref(locationId, formData) };
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
