"use server";

import { isValidPhone, normalizePhone } from "@repo/db";
import { createBooking, getAccess, prepareCarItem } from "@repo/db/server";
import { redirect } from "next/navigation";
import { parseCarOptions, parseCarSearch } from "../../../_lib/car-booking";
import { loadCarTrip } from "../_lib/trip";

export type ConfirmState = { error: string } | null;

const MAX_NAME_LENGTH = 80;

/**
 * Creates the booking. The trip and the choices arrive as the confirm page's
 * own query string, so the same parsing, resolving and pricing run again
 * here: the price the customer saw is never trusted from the browser. On
 * success the customer is sent to the booking page.
 */
export async function createCarBookingAction(
  _previous: ConfirmState,
  formData: FormData,
): Promise<ConfirmState> {
  const access = await getAccess("user");
  if (access.status !== "ok") {
    return { error: "Please sign in again to confirm your booking." };
  }

  const query = String(formData.get("trip") ?? "");
  const search = parseCarSearch(query);
  const options = parseCarOptions(query);
  if (!search || !options) {
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

  const trip = await loadCarTrip(search);
  if (!trip.ok) return { error: trip.message };

  const prepared = await prepareCarItem({ ...trip.request, ...options });
  if (!prepared.ok) return { error: prepared.error.message };

  const booking = await createBooking({
    userId: access.user.id,
    contactName,
    contactPhone,
    items: [prepared.item],
  });
  redirect(`/booking/${booking.reference}`);
}
