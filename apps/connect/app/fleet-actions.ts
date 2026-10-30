"use server";

import {
  createDriver,
  createVehicle,
  DRIVER_CLASSES_FIELD,
  getDriver,
  getVehicle,
  parseDriverFields,
  parseVehicleFields,
  textOf,
  updateDriver,
  updateVehicle,
  vendorFleetChoices,
} from "@repo/db/server";
import {
  type ActionState,
  refusalOf,
  STALE,
  stateOf,
} from "@repo/console/action-state";
import { revalidatePath } from "next/cache";
import { actorOf, getMemberAccess, NOT_A_MEMBER } from "./_lib/access";

/**
 * A vendor's own vehicles and drivers, saved from Connect on the forms the
 * admin uses. The vendor is always the member's, whatever the form sent;
 * a record of another vendor's is not theirs to change. A vehicle is of a
 * class on sale where it is based, and a driver may drive only classes on
 * sale where the vendor serves. Then the writers in @repo/db check the
 * rest, as for the admin. See docs/261028-fulfilment-vendors-and-connect.md,
 * "A vendor's vehicles and drivers".
 */

const NOT_ON_SALE = {
  error:
    "We do not sell that class at that location. Choose a class from the list.",
  field: "vehicleClassId",
};

export async function saveVehicleAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const member = await getMemberAccess();
  if (!member) return NOT_A_MEMBER;
  formData.set("vendorId", member.vendor.id);
  const parsed = parseVehicleFields(Object.fromEntries(formData));
  if (!parsed.ok) return refusalOf(parsed);
  const fields = parsed.value;
  const id = textOf(formData.get("id"));
  const existing = id ? await getVehicle(id) : null;
  if (id && existing?.vendorId !== member.vendor.id) return STALE;
  const choices = await vendorFleetChoices(member.vendor.id);
  const keepsClass =
    existing?.vehicleModel.vehicleClassId === fields.vehicleClassId &&
    existing.locationId === fields.locationId;
  if (
    !keepsClass &&
    !choices.classesAt[fields.locationId]?.includes(fields.vehicleClassId)
  ) {
    return NOT_ON_SALE;
  }
  const actor = actorOf(member.user);
  const result = existing
    ? await updateVehicle(actor, existing.id, fields)
    : await createVehicle(actor, fields);
  if (!result.ok) return stateOf(result);
  revalidatePath("/~/vehicles");
  return { href: "/~/vehicles" };
}

export async function saveDriverAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const member = await getMemberAccess();
  if (!member) return NOT_A_MEMBER;
  formData.set("vendorId", member.vendor.id);
  const parsed = parseDriverFields(
    Object.fromEntries(formData),
    formData.getAll(DRIVER_CLASSES_FIELD),
  );
  if (!parsed.ok) return refusalOf(parsed);
  const fields = parsed.value;
  const id = textOf(formData.get("id"));
  const existing = id ? await getDriver(id) : null;
  if (id && existing?.vendorId !== member.vendor.id) return STALE;
  const choices = await vendorFleetChoices(member.vendor.id);
  const onSale = new Set(choices.classes.map((c) => c.id));
  const kept = new Set(existing?.vehicleClasses.map((c) => c.id) ?? []);
  if (fields.vehicleClassIds.some((c) => !onSale.has(c) && !kept.has(c))) {
    return {
      error: "Tick only the classes we sell where you serve.",
      field: DRIVER_CLASSES_FIELD,
    };
  }
  const actor = actorOf(member.user);
  const result = existing
    ? await updateDriver(actor, existing.id, fields)
    : await createDriver(actor, fields);
  if (!result.ok) return stateOf(result);
  revalidatePath("/~/drivers");
  revalidatePath("/~");
  return { href: "/~/drivers" };
}
