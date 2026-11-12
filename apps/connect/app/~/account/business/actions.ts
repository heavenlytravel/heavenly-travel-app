"use server";

import {
  parseVendorFields,
  updateVendor,
  VENDOR_LOCATIONS_FIELD,
} from "@repo/db/server";
import { type ActionState, refusalOf } from "@repo/console/action-state";
import { revalidatePath } from "next/cache";
import { actorOf, getMemberAccess, NOT_A_MEMBER } from "../../../_lib/access";

const NOT_THE_OWNER: ActionState = {
  error: "Only the vendor's owner changes its details.",
};

/**
 * The owner saves the business: company or individual, its name and
 * registration, the contact, the address, the locations it serves and the
 * bank. What it offers is not read here: the team changes it. The writer
 * logs what changed, the bank's number masked, and refuses a location
 * still holding one of its vehicles or drivers.
 */
export async function saveBusinessAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const member = await getMemberAccess();
  if (!member) return NOT_A_MEMBER;
  if (member.role !== "owner") return NOT_THE_OWNER;
  // Read as the staff form is, with the service it has, which is kept.
  const parsed = parseVendorFields(
    Object.fromEntries(formData),
    member.vendor.services,
    formData.getAll(VENDOR_LOCATIONS_FIELD),
  );
  if (!parsed.ok) return refusalOf(parsed);
  // Its service is the one it has, so the writer sees no change to it.
  const result = await updateVendor(
    actorOf(member.user),
    member.vendor.id,
    parsed.value,
  );
  if (!result.ok) return refusalOf(result);
  revalidatePath("/~/account/business");
  return { href: "/~/account/business" };
}
