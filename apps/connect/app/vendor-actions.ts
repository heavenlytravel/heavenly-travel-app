"use server";

import {
  answerAsVendor,
  isDeclineReason,
  isPartRole,
  nameForVendor,
  textOf,
} from "@repo/db/server";
import { sendDriverEmailFor } from "@repo/email";
import { type ActionState, refusalOf, STALE } from "@repo/console/action-state";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { actorOf, getMemberAccess, NOT_A_MEMBER } from "./_lib/access";

/**
 * A vendor's answers in Connect, by its owner or staff: naming the vehicle
 * or driver an offer left to it, and accepting or declining the offer.
 * Each asks who is signed in again, since actions are reachable by direct
 * POST; the writers in @repo/db check the offer is this vendor's.
 */

/** Names the vendor's vehicle or driver for a role of an offer. */
export async function nameRecordAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const member = await getMemberAccess();
  if (!member) return NOT_A_MEMBER;
  const offerId = textOf(formData.get("offerId"));
  const role = textOf(formData.get("role"));
  const recordId = textOf(formData.get("recordId"));
  if (!offerId || !isPartRole(role)) return STALE;
  if (!recordId) {
    return { error: `Choose the ${role}.`, field: "recordId" };
  }
  const result = await nameForVendor(
    actorOf(member.user),
    member.vendor.id,
    offerId,
    role,
    recordId,
  );
  if (!result.ok) return refusalOf(result);
  revalidatePath("/");
  return null;
}

/** Accept or decline an offer, every part of it together. */
export async function answerVendorOfferAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const member = await getMemberAccess();
  if (!member) return NOT_A_MEMBER;
  const offerId = textOf(formData.get("offerId"));
  if (!offerId) return STALE;
  const reason = textOf(formData.get("reason"));
  let answer: Parameters<typeof answerAsVendor>[3];
  if (textOf(formData.get("answer")) === "accept") answer = { accept: true };
  else if (isDeclineReason(reason)) {
    answer = { accept: false, reason, note: textOf(formData.get("note")) };
  } else return { error: "Choose why.", field: "reason" };
  const result = await answerAsVendor(
    actorOf(member.user),
    member.vendor.id,
    offerId,
    answer,
  );
  if (!result.ok) return refusalOf(result);
  for (const id of result.assigned ?? []) after(() => sendDriverEmailFor(id));
  revalidatePath("/");
  return null;
}
