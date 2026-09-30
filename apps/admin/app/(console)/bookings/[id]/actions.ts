"use server";

import {
  ADVANCE_PERMISSIONS,
  advanceItem,
  cancelBookingAsAdmin,
  cancelItem,
  isNextItemStatus,
  type BookingChange,
} from "@repo/db/server";
import { sendBookingChangeEmail } from "@repo/email";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { actorOf, getAdmin } from "../../../_lib/access";
import { FORBIDDEN, type ActionState } from "../../../_lib/action-state";
import { BOOKINGS_PATH, bookingHref } from "../../../_lib/routes";

/**
 * Every transition re-checks the session and the permission (actions are
 * reachable by direct POST), passes the admin as the actor for the log and
 * lets the booking core check the status. The result's `event` sends the
 * confirmed or cancelled emails once the response is out.
 */
async function finish(result: BookingChange): Promise<ActionState> {
  if (!result.ok) return { error: result.error };
  after(() => sendBookingChangeEmail(result));
  revalidatePath(bookingHref(result.booking.id));
  revalidatePath(BOOKINGS_PATH);
  revalidatePath("/");
  return null;
}

/** Confirm, assign or complete one item: one step forward, named explicitly. */
export async function advanceItemAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const itemId = String(formData.get("itemId") ?? "");
  const to = formData.get("to");
  if (!itemId || !isNextItemStatus(to)) {
    return { error: "Missing item or step." };
  }
  const admin = await getAdmin(ADVANCE_PERMISSIONS[to]);
  if (!admin) return FORBIDDEN;
  return finish(await advanceItem(actorOf(admin), itemId, to));
}

export async function cancelItemAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("bookings.manage");
  if (!admin) return FORBIDDEN;
  const itemId = String(formData.get("itemId") ?? "");
  if (!itemId) return { error: "Missing item." };
  return finish(await cancelItem(actorOf(admin), itemId));
}

export async function cancelBookingAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("bookings.manage");
  if (!admin) return FORBIDDEN;
  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) return { error: "Missing booking." };
  return finish(await cancelBookingAsAdmin(actorOf(admin), bookingId));
}
