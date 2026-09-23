"use server";

import { isItemStatus } from "@repo/db";
import {
  advanceItem,
  cancelBookingAsAdmin,
  cancelItem,
  type BookingChange,
} from "@repo/db/server";
import { revalidatePath } from "next/cache";
import { getAdmin } from "../../../_lib/access";
import { BOOKINGS_PATH, bookingHref } from "../../../_lib/routes";

export type ActionState = { error: string } | null;

const FORBIDDEN: ActionState = { error: "Sign in as an admin to do this." };

/**
 * Every transition re-checks the session (actions are reachable by direct
 * POST) and lets the booking core check the status. The result's `event`
 * is where the confirmed and cancelled emails hook in with step 6.
 */
async function finish(result: BookingChange): Promise<ActionState> {
  if (!result.ok) return { error: result.error };
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
  if (!(await getAdmin())) return FORBIDDEN;
  const itemId = String(formData.get("itemId") ?? "");
  const to = formData.get("to");
  if (!itemId || !isItemStatus(to)) return { error: "Missing item or step." };
  return finish(await advanceItem(itemId, to));
}

export async function cancelItemAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getAdmin())) return FORBIDDEN;
  const itemId = String(formData.get("itemId") ?? "");
  if (!itemId) return { error: "Missing item." };
  return finish(await cancelItem(itemId));
}

export async function cancelBookingAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getAdmin())) return FORBIDDEN;
  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) return { error: "Missing booking." };
  return finish(await cancelBookingAsAdmin(bookingId));
}
