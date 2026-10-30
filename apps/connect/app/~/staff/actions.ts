"use server";

import { addVendorStaff, removeVendorStaff, textOf } from "@repo/db/server";
import { type ActionState, STALE, stateOf } from "@repo/console/action-state";
import { revalidatePath } from "next/cache";
import {
  actorOf,
  getMemberAccess,
  NOT_A_MEMBER,
  type MemberAccess,
} from "../../_lib/access";

/**
 * The owner's staff actions: add an account by its email, remove one.
 * Only the vendor's owner; the writers check the rest.
 */

const NOT_THE_OWNER: ActionState = {
  error: "Only the vendor's owner adds and removes its staff.",
};

async function ownerOf(): Promise<
  { refused: ActionState } | { member: MemberAccess }
> {
  const member = await getMemberAccess();
  if (!member) return { refused: NOT_A_MEMBER };
  if (member.role !== "owner") return { refused: NOT_THE_OWNER };
  return { member };
}

export async function addStaffAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const owner = await ownerOf();
  if ("refused" in owner) return owner.refused;
  const { member } = owner;
  const result = await addVendorStaff(
    actorOf(member.user),
    member.vendor.id,
    textOf(formData.get("email")),
  );
  if (result.ok) revalidatePath("/~/staff");
  return stateOf(result);
}

export async function removeStaffAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const owner = await ownerOf();
  if ("refused" in owner) return owner.refused;
  const { member } = owner;
  const memberId = textOf(formData.get("memberId"));
  if (!memberId) return STALE;
  const result = await removeVendorStaff(
    actorOf(member.user),
    member.vendor.id,
    memberId,
  );
  if (result.ok) revalidatePath("/~/staff");
  return stateOf(result);
}
