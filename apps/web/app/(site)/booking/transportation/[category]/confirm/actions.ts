"use server";

import {
  BOOKING_RULES,
  flightOfTrip,
  formatMyr,
  GUEST_ACTOR,
  maskEmail,
  parseContact,
  parseFlightNumber,
  parseTripOptions,
  parseTripSearch,
  RATE_LIMITED_MESSAGE,
  textOf,
  tripClashes,
  tripItemIndexes,
  tripItemParams,
  type Actor,
} from "@repo/db";
import {
  createBooking,
  getAccess,
  isBookingRateLimited,
  prepareTripItems,
  type TripRequest,
} from "@repo/db/server";
import { sendBookingEmail } from "@repo/email";
import { resolveTrip, tripRouting } from "@repo/places/server";
import { headers } from "next/headers";
import { after } from "next/server";
import { bookingHref, receivedHref } from "../../../../../_lib/routes";
import { bookableCategory } from "../../../../../_lib/transportation-booking";
import { CONFIRM_FIELDS } from "./fields";

/**
 * The answer: where to go once booked; why not, with the form's field it
 * is about when it is about one, and `repriced` when a trip changed since
 * the page priced it, so the page prices the trips again; null before.
 */
export type ConfirmState =
  | { done: string }
  | { error: string; field?: string; repriced?: boolean }
  | null;

const INCOMPLETE = {
  error:
    "This booking is missing part of a trip. Go back to your trips and try again.",
};

/** The visitor's address as Vercel reports it, or null outside a proxy. */
async function requestIp(): Promise<string | null> {
  const list = await headers();
  const ip =
    list.get("x-real-ip") ?? list.get("x-forwarded-for")?.split(",")[0];
  return ip?.trim() || null;
}

/**
 * Creates the booking, one item per trip, signed in or not. The trips
 * arrive as `itemN.*` fields in the order they are numbered, with the one
 * vehicle, the group and what the drivers need once for them all, so the
 * same parsing, resolving and pricing run again here: nothing the browser
 * priced is trusted. No two trips may start together or during a hire,
 * and the class must take every trip. The arriving flight goes on each
 * pick-up at an airport, the departing one on each drop-off at one, the
 * note on every trip. A price that changed since the page showed it stops
 * the booking and says so. A filled honeypot and a contact or address
 * over the limit get the same answer and create nothing; the limit counts
 * bookings, however many trips. A signed-in customer's booking copies the
 * account's email; a visitor's belongs to nobody until an account is made
 * with its email. On success the received emails go out once the response
 * is sent, and the page is told where to go: the booking page, or a
 * guest's received page. See docs/261008-guest-booking.md and
 * docs/261027-multi-trip-booking.md.
 */
export async function createTripsBookingAction(
  _previous: ConfirmState,
  formData: FormData,
): Promise<ConfirmState> {
  if (textOf(formData.get(CONFIRM_FIELDS.honeypot))) {
    return { error: RATE_LIMITED_MESSAGE };
  }

  const category = bookableCategory(formData.get(CONFIRM_FIELDS.category));
  const indexes = tripItemIndexes(formData);
  const searches = indexes.map((index) =>
    parseTripSearch(tripItemParams(formData, index)),
  );
  const options = category && parseTripOptions(category, formData);
  if (
    !category ||
    !options ||
    indexes.length === 0 ||
    indexes.length > BOOKING_RULES.maxTripsPerBooking ||
    searches.some((search) => search === null)
  ) {
    return INCOMPLETE;
  }
  const several = indexes.length > 1;
  const tripLabel = (index: number) => (several ? `Trip ${index + 1}: ` : "");

  const access = await getAccess("user");
  const user = access.status === "ok" ? access.user : null;
  const contact = parseContact({
    name: formData.get(CONFIRM_FIELDS.name),
    phone: formData.get(CONFIRM_FIELDS.phone),
    email: user ? user.email : formData.get(CONFIRM_FIELDS.email),
  });
  if (!contact.ok) {
    return contact.field
      ? { error: contact.error, field: contact.field }
      : { error: contact.error };
  }

  const createdIp = await requestIp();
  const limited = await isBookingRateLimited({
    contactEmail: contact.value.contactEmail,
    createdIp,
  });
  if (limited) return { error: RATE_LIMITED_MESSAGE };

  const resolved = await Promise.all(
    searches.map((search) => resolveTrip(search!)),
  );
  const requests: TripRequest[] = [];
  for (const [index, trip] of resolved.entries()) {
    if (!trip.ok) return { error: `${tripLabel(index)}${trip.message}` };
    requests.push(trip.request);
  }

  // One vehicle does one trip at a time.
  const clashes = tripClashes(
    requests.map((request) => ({
      startsAt: request.startsAt,
      hours: request.mode === "hourly" ? request.hours : null,
    })),
  );
  const clashing = clashes.findIndex((found) => found !== null);
  if (clashing >= 0) {
    const clash = clashes[clashing]!;
    return {
      error: `Trip ${clashing + 1} starts ${
        clash.kind === "same-time" ? "at the same time as" : "during"
      } trip ${clash.with + 1}, and one vehicle cannot do both. Edit your trips to change one of them.`,
    };
  }

  const flights = {
    arriving: parseFlightNumber(
      textOf(formData.get(CONFIRM_FIELDS.arrivingFlight)),
    ),
    departing: parseFlightNumber(
      textOf(formData.get(CONFIRM_FIELDS.departingFlight)),
    ),
  };
  const prepared = await prepareTripItems(
    category,
    requests.map((request) => ({
      ...request,
      ...options,
      flightNumber: flightOfTrip(request, flights),
    })),
    tripRouting,
  );

  const changed: string[] = [];
  for (const [index, result] of prepared.entries()) {
    if (!result.ok) {
      return {
        error: `${tripLabel(index)}${result.error.message}`,
        repriced: true,
      };
    }
    const shown = Number(
      tripItemParams(formData, indexes[index]!).get(CONFIRM_FIELDS.shownSen),
    );
    const now = result.item.priceTotalSen;
    if (shown !== now) {
      changed.push(
        `${several ? `trip ${index + 1} is` : "it is"} now ${formatMyr(now)}, ${
          now > shown ? "up" : "down"
        } from ${formatMyr(shown)}`,
      );
    }
  }
  if (changed.length > 0) {
    return {
      error: `The price changed since you saw it: ${changed.join("; ")}. Check the new total, then confirm.`,
      repriced: true,
    };
  }

  const actor: Actor = user
    ? { kind: "customer", userId: user.id }
    : GUEST_ACTOR;
  const booking = await createBooking(actor, {
    userId: user?.id ?? null,
    ...contact.value,
    createdIp,
    items: prepared.flatMap((result) => (result.ok ? [result.item] : [])),
  });
  after(() => sendBookingEmail("received", booking));
  return {
    done: user
      ? bookingHref(booking.reference)
      : receivedHref(booking.reference, maskEmail(contact.value.contactEmail)),
  };
}
