"use server";

import {
  GUEST_ACTOR,
  maskEmail,
  parseContact,
  parseTripOptions,
  parseTripSearch,
  RATE_LIMITED_MESSAGE,
  textOf,
  type Actor,
} from "@repo/db";
import {
  createBooking,
  getAccess,
  isBookingRateLimited,
  prepareTripItem,
} from "@repo/db/server";
import { sendBookingEmail } from "@repo/email";
import { resolveTrip } from "@repo/places/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { bookingHref, receivedHref } from "../../../../../_lib/routes";
import { bookableCategory } from "../../../../../_lib/transportation-booking";
import { CONFIRM_FIELDS } from "./fields";

export type ConfirmState = { error: string } | null;

/** The visitor's address as Vercel reports it, or null outside a proxy. */
async function requestIp(): Promise<string | null> {
  const list = await headers();
  const ip =
    list.get("x-real-ip") ?? list.get("x-forwarded-for")?.split(",")[0];
  return ip?.trim() || null;
}

/**
 * Creates the booking, signed in or not. The category and the confirm
 * page's own query string arrive in the form, so the same parsing,
 * resolving and pricing run again here: the price the customer saw is never
 * trusted from the browser. A filled honeypot and a contact or address over
 * the limit get the same answer and create nothing. A signed-in customer's
 * booking copies the account's email, so a later profile change never
 * rewrites it; a visitor's booking belongs to nobody until an account is
 * made with its email. On success the received emails go out once the
 * response is sent, and the customer is sent to the booking page, or a
 * guest to the received page. See docs/261008-guest-booking.md.
 */
export async function createTripBookingAction(
  _previous: ConfirmState,
  formData: FormData,
): Promise<ConfirmState> {
  if (textOf(formData.get(CONFIRM_FIELDS.honeypot))) {
    return { error: RATE_LIMITED_MESSAGE };
  }

  const category = bookableCategory(formData.get(CONFIRM_FIELDS.category));
  const query = String(formData.get(CONFIRM_FIELDS.trip) ?? "");
  const search = parseTripSearch(query);
  const options = category && parseTripOptions(category, query);
  if (!category || !search || !options) {
    return { error: "This booking link is incomplete. Start a new search." };
  }

  const access = await getAccess("user");
  const user = access.status === "ok" ? access.user : null;
  const contact = parseContact({
    name: formData.get(CONFIRM_FIELDS.name),
    phone: formData.get(CONFIRM_FIELDS.phone),
    email: user ? user.email : formData.get(CONFIRM_FIELDS.email),
  });
  if (!contact.ok) return { error: contact.error };

  const createdIp = await requestIp();
  const limited = await isBookingRateLimited({
    contactEmail: contact.value.contactEmail,
    createdIp,
  });
  if (limited) return { error: RATE_LIMITED_MESSAGE };

  const trip = await resolveTrip(search);
  if (!trip.ok) return { error: trip.message };

  const prepared = await prepareTripItem(category, {
    ...trip.request,
    ...options,
  });
  if (!prepared.ok) return { error: prepared.error.message };

  const actor: Actor = user
    ? { kind: "customer", userId: user.id }
    : GUEST_ACTOR;
  const booking = await createBooking(actor, {
    userId: user?.id ?? null,
    ...contact.value,
    createdIp,
    items: [prepared.item],
  });
  after(() => sendBookingEmail("received", booking));
  redirect(
    user
      ? bookingHref(booking.reference)
      : receivedHref(booking.reference, maskEmail(contact.value.contactEmail)),
  );
}
