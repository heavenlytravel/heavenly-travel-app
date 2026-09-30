import { textOf, type Parsed } from "./fields";
import { isValidPhone, normalizePhone } from "./phone";

/**
 * Where a booking's customer is reached. A booking copies the contact
 * details it was made with; the account behind it, when there is one, is
 * only for showing the booking under My bookings. Browser-safe. See
 * docs/260930-admin-teams-and-access.md, "A booking can belong to nobody".
 */

/** What this module reads of a booking; both apps' queries satisfy it. */
export type BookingContact = {
  contactEmail: string | null;
  user: { email: string } | null;
};

/**
 * The customer's email: the one on the booking, else the account's for a
 * booking made before the column existed, else null for a guest who gave
 * none. Null means no customer email is sent.
 */
export function customerEmailOf(booking: BookingContact): string | null {
  return booking.contactEmail ?? booking.user?.email ?? null;
}

/** An email as typed by staff, trimmed and in lower case as Clerk stores them. */
export function normalizeEmail(input: string) {
  return input.trim().toLowerCase();
}

/** Enough of an address to send to: something, an @, something with a dot. */
export function isValidEmail(normalized: string) {
  return (
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) && normalized.length <= 254
  );
}

export const CONTACT_NAME_MAX_LENGTH = 80;

/** The contact a booking is made with, as `createBooking` stores it. */
export type ContactFields = {
  contactName: string;
  contactPhone: string;
  contactEmail: string | null;
};

/**
 * The contact block of a booking form, read and checked. The email is
 * optional here: the website supplies the account's instead, and a guest
 * on the phone may have none.
 */
export function parseContact(values: {
  name: unknown;
  phone: unknown;
  email?: unknown;
}): Parsed<ContactFields> {
  const contactName = textOf(values.name).slice(0, CONTACT_NAME_MAX_LENGTH);
  if (!contactName) {
    return { ok: false, error: "Enter the name the driver should ask for." };
  }
  const contactPhone = normalizePhone(textOf(values.phone));
  if (!isValidPhone(contactPhone)) {
    return { ok: false, error: "Enter a phone number the driver can call." };
  }
  const email = normalizeEmail(textOf(values.email));
  if (email && !isValidEmail(email)) {
    return {
      ok: false,
      error: "Enter a valid email address, or leave it blank.",
    };
  }
  return {
    ok: true,
    value: { contactName, contactPhone, contactEmail: email || null },
  };
}
