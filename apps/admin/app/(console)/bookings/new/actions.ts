"use server";

import {
  formatLocalDateTime,
  isTripCategory,
  parseContact,
  parsePriceOverride,
  parseTripOptions,
  parseTripSearch,
  PRICE_OVERRIDE_FIELDS,
  textOf,
  unavailableReason,
} from "@repo/db";
import {
  createBooking,
  findUserByEmail,
  prepareTripItem,
  quoteTrip,
} from "@repo/db/server";
import { sendBookingEmail } from "@repo/email";
import { resolveTrip } from "@repo/places/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { actorOf, getAdmin } from "../../../_lib/access";
import {
  FORBIDDEN,
  FORBIDDEN_MESSAGE,
  type ActionState,
} from "../../../_lib/action-state";
import { BOOKINGS_PATH, bookingHref } from "../../../_lib/routes";
import {
  CATEGORY_FIELD,
  CONTACT_FIELDS,
  type TripQuoteView,
} from "./manual-booking";

/**
 * The manual booking's two steps. Both check `bookings.create` again and
 * run the website's own resolving and pricing, so a booking entered here
 * can never differ from one the site would have made for the same trip.
 */

const INCOMPLETE_TRIP =
  "Fill in the trip first: pick-up, drop-off or hours, date and time.";

/** Prices every class of the category for the trip, as the options page does. */
export async function quoteTripAction(
  input: Record<string, string>,
): Promise<TripQuoteView> {
  const admin = await getAdmin("bookings.create");
  if (!admin) return { ok: false, error: FORBIDDEN_MESSAGE };
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: INCOMPLETE_TRIP };
  }
  const category = textOf(input[CATEGORY_FIELD]);
  const search = parseTripSearch(input);
  if (!isTripCategory(category) || !search) {
    return { ok: false, error: INCOMPLETE_TRIP };
  }

  const trip = await resolveTrip(search);
  if (!trip.ok) return { ok: false, error: trip.message };
  const quoted = await quoteTrip(category, trip.request);
  if (!quoted.ok) return { ok: false, error: quoted.error.message };

  const { request } = trip;
  const { quote } = quoted;
  return {
    ok: true,
    category,
    pickup: request.pickup.label,
    dropoff: request.dropoff?.label ?? null,
    startsAt: formatLocalDateTime(request.startsAt),
    hours: quote.basis.mode === "hourly" ? quote.basis.hours : null,
    distanceKm: quote.basis.mode === "oneway" ? quote.basis.distanceKm : null,
    district: `${quote.district.name}, ${quote.district.state.name}`,
    multiplier: quote.district.state.multiplier,
    classes: quote.classes.map((c) => ({
      id: c.vehicleClass.id,
      name: c.vehicleClass.name,
      description: c.vehicleClass.description,
      luggage: c.vehicleClass.luggage,
      minPassengers: c.vehicleClass.minPassengers,
      maxPassengers: c.vehicleClass.maxPassengers,
      totalSen: c.price.totalSen,
      unavailable: unavailableReason(c.availability),
    })),
  };
}

/**
 * Creates the booking from the posted form: the trip is resolved and priced
 * again on the server, the customer is linked to an account when the email
 * belongs to one, and an agreed price is stored with its reason. The
 * received emails go out once the response is sent.
 */
export async function createManualBookingAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("bookings.create");
  if (!admin) return FORBIDDEN;

  const category = textOf(formData.get(CATEGORY_FIELD));
  const search = parseTripSearch(formData);
  if (!isTripCategory(category) || !search) {
    return { error: "Fill in the trip and get prices first." };
  }
  const options = parseTripOptions(category, formData);
  if (!options) {
    return { error: "Choose a vehicle and the number of passengers." };
  }
  const contact = parseContact({
    name: formData.get(CONTACT_FIELDS.name),
    phone: formData.get(CONTACT_FIELDS.phone),
    email: formData.get(CONTACT_FIELDS.email),
  });
  if (!contact.ok) return { error: contact.error };
  const override = parsePriceOverride({
    amount: formData.get(PRICE_OVERRIDE_FIELDS.amount),
    reason: formData.get(PRICE_OVERRIDE_FIELDS.reason),
  });
  if (!override.ok) return { error: override.error };

  const trip = await resolveTrip(search);
  if (!trip.ok) return { error: trip.message };
  const prepared = await prepareTripItem(category, {
    ...trip.request,
    ...options,
  });
  if (!prepared.ok) return { error: prepared.error.message };

  const account = contact.value.contactEmail
    ? await findUserByEmail(contact.value.contactEmail)
    : null;
  const booking = await createBooking(actorOf(admin), {
    userId: account?.id ?? null,
    ...contact.value,
    items: [{ ...prepared.item, override: override.value }],
  });
  after(() => sendBookingEmail("received", booking));
  revalidatePath(BOOKINGS_PATH);
  revalidatePath("/");
  redirect(bookingHref(booking.id));
}
