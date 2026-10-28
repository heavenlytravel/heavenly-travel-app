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
import { after } from "next/server";
import { actorOf, getAdmin } from "../../../_lib/access";
import {
  type ActionState,
  FORBIDDEN,
  refusalOf,
  STALE,
  stateOf,
} from "../../../_lib/action-state";
import {
  BOOKINGS_PATH,
  LOCATION_ROUTE,
  bookingHref,
} from "../../../_lib/routes";
import { prepareFormItem } from "../_lib/trip-server";

/**
 * Every transition re-checks the session and the permission (actions are
 * reachable by direct POST), passes the admin as the actor for the log and
 * lets the booking core check the status. The result's `event` sends the
 * confirmed or cancelled emails once the response is out. A change moves
 * the queue, the home's counts and every location's pages, whose sidebar
 * counts the queue and which open the booking inside the location.
 */
async function finish(result: BookingChange): Promise<ActionState> {
  if (!result.ok) return refusalOf(result);
  after(() => sendBookingChangeEmail(result));
  revalidatePath(bookingHref(result.booking.id));
  revalidatePath(BOOKINGS_PATH);
  revalidatePath(LOCATION_ROUTE, "layout");
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
    return STALE;
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
  if (!itemId) return STALE;
  return finish(await cancelItem(actorOf(admin), itemId));
}

export async function cancelBookingAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("bookings.manage");
  if (!admin) return FORBIDDEN;
  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) return STALE;
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
  if (!bookingId) return STALE;
  const result = await addBookingNote(
    actorOf(admin),
    bookingId,
    String(formData.get("body") ?? ""),
  );
  if (result.ok) {
    revalidatePath(bookingHref(bookingId));
    revalidatePath(LOCATION_ROUTE, "layout");
  }
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
  if (!itemId) return STALE;

  let override: PriceOverride | null = null;
  if (!flagOf(formData.get("remove"))) {
    const parsed = parsePriceOverride({
      amount: formData.get(PRICE_OVERRIDE_FIELDS.amount),
      reason: formData.get(PRICE_OVERRIDE_FIELDS.reason),
    });
    if (!parsed.ok) return refusalOf(parsed);
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
 * back on the booking, inside the location when the form was opened there.
 */
export async function amendItemAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("bookings.manage");
  if (!admin) return FORBIDDEN;
  const bookingId = textOf(formData.get("bookingId"));
  const itemId = textOf(formData.get("itemId"));
  if (!bookingId || !itemId) return STALE;

  const prepared = await prepareFormItem(tripItemParams(formData, 0));
  if (!prepared.ok) return refusalOf(prepared);
  // An agreed price is its own permission, checked only when one is posted.
  if (prepared.override && !(await getAdmin("bookings.create"))) {
    return FORBIDDEN;
  }
  const result = await finish(
    await amendItem(actorOf(admin), itemId, prepared),
  );
  if (result) return result;
  return {
    href: bookingHref(
      bookingId,
      textOf(formData.get("locationSlug")) || undefined,
    ),
  };
}
