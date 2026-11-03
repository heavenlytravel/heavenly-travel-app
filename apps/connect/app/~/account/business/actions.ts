"use server";

import { normalizeEmail } from "@repo/db";
import {
  normalizePhone,
  readBankFields,
  textOf,
  updateVendor,
} from "@repo/db/server";
import { type ActionState, refusalOf } from "@repo/console/action-state";
import { revalidatePath } from "next/cache";
import { actorOf, getMemberAccess, NOT_A_MEMBER } from "../../_lib/access";

const NOT_THE_OWNER: ActionState = {
  error: "Only the vendor's owner changes its details.",
};

/**
 * The owner saves the business's contact, address and bank details. The
 * name, the kind, the SSM or IC number, the services and the locations
 * were checked when it was approved, so they are not read here: the team
 * changes them. The writer logs what changed, the bank's number masked.
 */
export async function saveBusinessAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const member = await getMemberAccess();
  if (!member) return NOT_A_MEMBER;
  if (member.role !== "owner") return NOT_THE_OWNER;
  const values = Object.fromEntries(formData);
  const result = await updateVendor(actorOf(member.user), member.vendor.id, {
    contactName: textOf(values.contactName),
    contactPhone: normalizePhone(textOf(values.contactPhone)),
    contactEmail: normalizeEmail(textOf(values.contactEmail)),
    address: textOf(values.address),
    ...readBankFields(values),
  });
  if (!result.ok) return refusalOf(result);
  revalidatePath("/~/business");
  return { href: "/~/business" };
}
