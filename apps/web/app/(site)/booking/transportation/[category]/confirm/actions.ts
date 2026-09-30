"use server";

import { isValidPhone, normalizePhone } from "@repo/db";
import { createBooking, getAccess, prepareTripItem } from "@repo/db/server";
import { sendBookingEmail } from "@repo/email";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { bookingHref } from "../../../../../_lib/routes";
import {
  bookableCategory,
  parseTripOptions,
  parseTripSearch,
} from "../../../../../_lib/transportation-booking";
import { loadTrip } from "../_lib/trip";

export type ConfirmState = { error: string } | null;

const MAX_NAME_LENGTH = 80;

/**
 * Creates the booking. The category and the confirm page's own query string
 * arrive in the form, so the same parsing, resolving and pricing run again
 * here: the price the customer saw is never trusted from the browser. On
 * success the received emails go out once the response is sent, and the
 * customer is sent to the booking page.
 */
export async function createTripBookingAction(
  _previous: ConfirmState,
  formData: FormData,
): Promise<ConfirmState> {
  const access = await getAccess("user");
  if (access.status !== "ok") {
    return { error: "Please sign in again to confirm your booking." };
  }

  const category = bookableCategory(formData.get("category"));
  const query = String(formData.get("trip") ?? "");
  const search = parseTripSearch(query);
  const options = category && parseTripOptions(category, query);
  if (!category || !search || !options) {
    return { error: "This booking link is incomplete. Start a new search." };
  }

  const contactName = String(formData.get("name") ?? "")
    .trim()
    .slice(0, MAX_NAME_LENGTH);
  const contactPhone = normalizePhone(String(formData.get("phone") ?? ""));
  if (!contactName)
    return { error: "Enter the name the driver should ask for." };
  if (!isValidPhone(contactPhone)) {
    return { error: "Enter a phone number we can reach you on." };
  }

  const trip = await loadTrip(search);
  if (!trip.ok) return { error: trip.message };

  const prepared = await prepareTripItem(category, {
    ...trip.request,
    ...options,
  });
  if (!prepared.ok) return { error: prepared.error.message };

  const booking = await createBooking(
    { kind: "customer", userId: access.user.id },
    {
      userId: access.user.id,
      contactName,
      contactPhone,
      items: [prepared.item],
    },
  );
  after(() => sendBookingEmail("received", booking));
  redirect(bookingHref(booking.reference));
}
