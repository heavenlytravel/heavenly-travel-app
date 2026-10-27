"use server";

import { isReference, normalizeReference, textOf } from "@repo/db";
import {
  cancelBookingAsCustomer,
  cancelTripAsCustomer,
  getAccess,
  type BookingChange,
} from "@repo/db/server";
import { sendBookingChangeEmail } from "@repo/email";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import {
  ACCOUNT_BOOKINGS_PATH,
  accountBookingHref,
  bookingHref,
} from "../../../../_lib/routes";

export type CancelState = { error: string } | null;

/** The longest item id a form may carry; ids are cuids. */
const ITEM_ID_MAX_LENGTH = 64;

/**
 * Runs a customer's cancel: signed in, on a well-formed reference, then
 * the transition, which checks ownership, status and the cutoff again, so
 * a stale page cannot cancel what it should not. The emails go out once
 * the response is sent, and every page showing the booking is refreshed.
 */
async function cancelAs(
  formData: FormData,
  cancel: (userId: string, reference: string) => Promise<BookingChange>,
): Promise<CancelState> {
  const access = await getAccess("user");
  if (access.status !== "ok") {
    return { error: "Please sign in again to cancel." };
  }

  const reference = normalizeReference(String(formData.get("reference") ?? ""));
  if (!isReference(reference)) {
    return { error: "This booking link is broken. Open it from My bookings." };
  }

  const result = await cancel(access.user.id, reference);
  if (!result.ok) return { error: result.error };
  after(() => sendBookingChangeEmail(result));

  revalidatePath(accountBookingHref(reference));
  revalidatePath(bookingHref(reference));
  revalidatePath(ACCOUNT_BOOKINGS_PATH);
  return null;
}

/** The customer cancels their whole booking. */
export async function cancelBookingAction(
  _previous: CancelState,
  formData: FormData,
): Promise<CancelState> {
  return cancelAs(formData, (userId, reference) =>
    cancelBookingAsCustomer({ kind: "customer", userId }, reference),
  );
}

/** The customer cancels one trip of their booking and keeps the rest. */
export async function cancelTripAction(
  _previous: CancelState,
  formData: FormData,
): Promise<CancelState> {
  const itemId = textOf(formData.get("item"));
  if (!itemId || itemId.length > ITEM_ID_MAX_LENGTH) {
    return {
      error: "This trip is no longer on the booking. Reload the booking.",
    };
  }
  return cancelAs(formData, (userId, reference) =>
    cancelTripAsCustomer({ kind: "customer", userId }, reference, itemId),
  );
}
