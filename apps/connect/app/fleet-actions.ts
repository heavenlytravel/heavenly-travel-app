"use server";

import {
  createDriver,
  createGuide,
  createVehicle,
  deleteConfirmationOf,
  deleteDriver,
  deleteGuide,
  DRIVER_CLASSES_FIELD,
  getDriver,
  getGuide,
  getVehicle,
  parseDriverFields,
  parseDriverSignIn,
  GUIDE_LANGUAGES_FIELD,
  parseGuideFields,
  parseVehicleFields,
  textOf,
  updateDriver,
  updateGuide,
  updateVehicle,
  vendorFleetChoices,
} from "@repo/db/server";
import { sendDriverAddedEmail } from "@repo/email";
import { after } from "next/server";
import {
  type ActionState,
  refusalOf,
  STALE,
  stateOf,
} from "@repo/console/action-state";
import { revalidatePath } from "next/cache";
import { actorOf, getMemberAccess, NOT_A_MEMBER } from "./_lib/access";

/**
 * A vendor's own vehicles, drivers and tour guides, saved from Connect on the forms the
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
  const password = parseDriverSignIn(
    Object.fromEntries(formData),
    fields.email,
    existing?.email ?? null,
  );
  if (!password.ok) return refusalOf(password);
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
  let driverId: string;
  if (existing) {
    const result = await updateDriver(
      actor,
      existing.id,
      fields,
      password.value,
    );
    if (!result.ok) return stateOf(result);
    driverId = existing.id;
  } else {
    const result = await createDriver(actor, fields, password.value);
    if (!result.ok) return stateOf(result);
    driverId = result.id;
  }
  // Given their account by this save, the driver hears how to sign in.
  const email = fields.email;
  if (email && !existing?.userId) {
    after(() =>
      sendDriverAddedEmail({
        driverId,
        name: fields.name,
        email,
        vendorName: member.vendor.name,
      }),
    );
  }
  revalidatePath("/~/drivers");
  revalidatePath("/~");
  return { href: "/~/drivers" };
}

/**
 * Deletes one of the vendor's drivers entered by mistake, a mistyped
 * email for one, with their account when never used; then the list
 * opens. `seen` and `typed` are what the delete's dialog showed and what
 * the member typed (@repo/db's delete-impact).
 */
export async function deleteDriverAction(
  id: string,
  seen: string[],
  typed: string | null,
): Promise<ActionState> {
  const member = await getMemberAccess();
  if (!member) return NOT_A_MEMBER;
  const confirmation = deleteConfirmationOf(seen, typed);
  if (typeof id !== "string" || !id || !confirmation) return STALE;
  const driver = await getDriver(id);
  if (driver?.vendorId !== member.vendor.id) return STALE;
  const result = await deleteDriver(actorOf(member.user), id, confirmation);
  if (!result.ok) return stateOf(result);
  revalidatePath("/~/drivers");
  revalidatePath("/~");
  return null;
}

/**
 * Saves one of the vendor's tour guides, new or existing, based at a
 * location the vendor serves; then the list opens. A guide has no
 * account, so nothing is sent. See docs/261103-tour-guide.md.
 */
export async function saveGuideAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const member = await getMemberAccess();
  if (!member) return NOT_A_MEMBER;
  formData.set("vendorId", member.vendor.id);
  const id = textOf(formData.get("id"));
  const existing = id ? await getGuide(id) : null;
  if (id && existing?.vendorId !== member.vendor.id) return STALE;
  // Once saved, a guide's email is ours to change, in Manage.
  const parsed = parseGuideFields(
    Object.fromEntries(formData),
    formData.getAll(GUIDE_LANGUAGES_FIELD),
    { saved: existing?.email ?? null, locked: true },
  );
  if (!parsed.ok) return refusalOf(parsed);
  const fields = parsed.value;
  const actor = actorOf(member.user);
  const result = existing
    ? await updateGuide(actor, existing.id, fields)
    : await createGuide(actor, fields);
  if (!result.ok) return stateOf(result);
  revalidatePath("/~/guides");
  revalidatePath("/~");
  return { href: "/~/guides" };
}

/** Deletes one of the vendor's tour guides entered by mistake; then the list opens. */
export async function deleteGuideAction(
  id: string,
  seen: string[],
  typed: string | null,
): Promise<ActionState> {
  const member = await getMemberAccess();
  if (!member) return NOT_A_MEMBER;
  const confirmation = deleteConfirmationOf(seen, typed);
  if (typeof id !== "string" || !id || !confirmation) return STALE;
  const guide = await getGuide(id);
  if (guide?.vendorId !== member.vendor.id) return STALE;
  const result = await deleteGuide(actorOf(member.user), id, confirmation);
  if (!result.ok) return stateOf(result);
  revalidatePath("/~/guides");
  revalidatePath("/~");
  return null;
}
