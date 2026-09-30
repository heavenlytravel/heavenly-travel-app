"use server";

import { isTripCategory, parseTripSearch, textOf } from "@repo/db";
import { getAdmin } from "../../../_lib/access";
import { FORBIDDEN_MESSAGE } from "../../../_lib/action-state";
import { CATEGORY_FIELD, type TripQuoteView } from "./trip-form";
import { quoteTripView } from "./trip-server";

const INCOMPLETE_TRIP =
  "Fill in the trip first: pick-up, drop-off or hours, date and time.";

/**
 * "Get prices" on the item editor: every class of the category priced for
 * the trip, for an admin who may enter or amend a booking. Nothing is
 * written; the create and amend actions price the trip again themselves.
 */
export async function quoteTripAction(
  input: Record<string, string>,
): Promise<TripQuoteView> {
  const admin =
    (await getAdmin("bookings.create")) ?? (await getAdmin("bookings.manage"));
  if (!admin) return { ok: false, error: FORBIDDEN_MESSAGE };
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: INCOMPLETE_TRIP };
  }
  const category = textOf(input[CATEGORY_FIELD]);
  const search = parseTripSearch(input);
  if (!isTripCategory(category) || !search) {
    return { ok: false, error: INCOMPLETE_TRIP };
  }
  return quoteTripView(category, search);
}
