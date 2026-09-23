"use server";

import { isReference, normalizeReference } from "@repo/db";
import { cancelBookingAsCustomer, getAccess } from "@repo/db/server";
import { revalidatePath } from "next/cache";
import {
  ACCOUNT_BOOKINGS_PATH,
  accountBookingHref,
  bookingHref,
} from "../../../_lib/routes";

export type CancelState = { error: string } | null;

/**
 * The customer cancels their own booking. Ownership, status and the cutoff
 * are all checked again inside the transition, so a stale page cannot
 * cancel what it should not. The cancelled email arrives with step 6.
 */
export async function cancelBookingAction(
  _previous: CancelState,
  formData: FormData,
): Promise<CancelState> {
  const access = await getAccess("user");
  if (access.status !== "ok") {
    return { error: "Please sign in again to cancel this booking." };
  }

  const reference = normalizeReference(String(formData.get("reference") ?? ""));
  if (!isReference(reference)) return { error: "Booking not found." };

  const result = await cancelBookingAsCustomer(reference, access.user.id);
  if (!result.ok) return { error: result.error };

  revalidatePath(accountBookingHref(reference));
  revalidatePath(bookingHref(reference));
  revalidatePath(ACCOUNT_BOOKINGS_PATH);
  return null;
}
