"use server";

import {
  flagOf,
  parsePriceOverride,
  PRICE_OVERRIDE_FIELDS,
  textOf,
  tripItemParams,
  type PriceOverride,
} from "@repo/db";
import {
  addBookingNote,
  ADVANCE_PERMISSIONS,
  advanceItem,
  amendItem,
  cancelBookingAsAdmin,
  cancelItem,
  isNextItemStatus,
  overrideItemPrice,
  type BookingChange,
} from "@repo/db/server";
import { sendBookingChangeEmail } from "@repo/email";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { actorOf, getAdmin } from "../../../_lib/access";
import {
  FORBIDDEN,
  stateOf,
  type ActionState,
} from "../../../_lib/action-state";
import { BOOKINGS_PATH, bookingHref } from "../../../_lib/routes";
import { prepareFormItem } from "../_lib/trip-server";

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

/** An internal note; every team may add one. Nothing is emailed. */
export async function addNoteAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("bookings.notes");
  if (!admin) return FORBIDDEN;
  const bookingId = textOf(formData.get("bookingId"));
  if (!bookingId) return { error: "Missing booking." };
  const result = await addBookingNote(
    actorOf(admin),
    bookingId,
    String(formData.get("body") ?? ""),
  );
  if (result.ok) revalidatePath(bookingHref(bookingId));
  return stateOf(result);
}

/**
 * An agreed price on one item, or its removal when `remove` is posted.
 * Reservation and Sales only. No email: the price was agreed outside the
 * app, and the confirmed email carries the final total.
 */
export async function overrideItemPriceAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("bookings.create");
  if (!admin) return FORBIDDEN;
  const itemId = textOf(formData.get("itemId"));
  if (!itemId) return { error: "Missing item." };

  let override: PriceOverride | null = null;
  if (!flagOf(formData.get("remove"))) {
    const parsed = parsePriceOverride({
      amount: formData.get(PRICE_OVERRIDE_FIELDS.amount),
      reason: formData.get(PRICE_OVERRIDE_FIELDS.reason),
    });
    if (!parsed.ok) return { error: parsed.error };
    if (!parsed.value) {
      return { error: "Enter the agreed price and the reason." };
    }
    override = parsed.value;
  }
  return finish(await overrideItemPrice(actorOf(admin), itemId, override));
}

/**
 * Replaces one item's trip, vehicle and details with the amend form's,
 * priced again on the server. Reservation and Sales. The "Booking
 * updated" email goes out through `finish`; on success the admin lands
 * back on the booking.
 */
export async function amendItemAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("bookings.manage");
  if (!admin) return FORBIDDEN;
  const bookingId = textOf(formData.get("bookingId"));
  const itemId = textOf(formData.get("itemId"));
  if (!bookingId || !itemId) return { error: "Missing item." };

  const prepared = await prepareFormItem(tripItemParams(formData, 0));
  if (!prepared.ok) return { error: prepared.error };
  // An agreed price is its own permission, checked only when one is posted.
  if (prepared.override && !(await getAdmin("bookings.create"))) {
    return FORBIDDEN;
  }
  const result = await finish(
    await amendItem(actorOf(admin), itemId, prepared),
  );
  if (result) return result;
  redirect(bookingHref(bookingId));
}
