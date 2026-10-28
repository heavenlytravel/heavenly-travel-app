import "server-only";
import { CONTACT } from "@repo/db";
import {
  ADMIN_URL,
  CONNECT_URL,
  getBooking,
  SITE_URL,
  tripCrewsOf,
  type BookingChange,
  type BookingWithItems,
} from "@repo/db/server";
import {
  bookingEmails,
  driverEmails,
  type BookingEmail,
  type BookingEmailEvent,
  type EmailSettings,
  type TripCrew,
} from "./booking-emails";
import { logSender } from "./log-sender";
import {
  vendorApprovedEmails,
  vendorRegisteredEmails,
  type VendorEmailFacts,
} from "./vendor-emails";
import { resendSender } from "./resend";
import type { EmailSender } from "./types";

export type { BookingEmailEvent, TripCrew } from "./booking-emails";
export type { VendorEmailFacts } from "./vendor-emails";

/**
 * Booking emails as the apps send them. The sender is chosen once per
 * process: Resend when `RESEND_API_KEY` is set, otherwise the console. The
 * links, the sender, the ops inbox and the subject prefix come from the
 * environment, with production values as defaults. See
 * docs/260923-car-with-driver.md, "Emails".
 */

const PRODUCTION_FROM = `Heavenly Travel <${CONTACT.bookingEmail}>`;

/**
 * Production is the Vercel Production deployment. Local development and the
 * staging Preview send from the dev address to the developer, with a subject
 * prefix, exactly as Clerk does with its development instances.
 */
const isProduction =
  process.env.NODE_ENV === "production" &&
  (process.env.VERCEL_ENV ?? "production") === "production";

function pick(): EmailSender {
  const key = process.env.RESEND_API_KEY;
  if (key) return resendSender(key, process.env.EMAIL_FROM || PRODUCTION_FROM);
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[email] RESEND_API_KEY is not set; booking emails are logged, not sent",
    );
  }
  return logSender;
}

const sender = pick();
const settings: EmailSettings = {
  siteUrl: SITE_URL,
  adminUrl: ADMIN_URL,
  connectUrl: CONNECT_URL,
  opsTo: process.env.EMAIL_OPS_TO || CONTACT.bookingEmail,
  subjectPrefix: isProduction ? "" : "[Development] ",
};

/**
 * Sends emails, each with its idempotency key. It never throws: a failed
 * send is logged under `what` and the write that caused it stands.
 */
async function sendAll(emails: readonly BookingEmail[], what: string) {
  const results = await Promise.allSettled(
    emails.map(({ key, message }) => sender.send(message, key)),
  );
  for (const result of results) {
    if (result.status === "rejected") {
      console.error(
        `[email] ${what} failed via ${sender.name}:`,
        result.reason,
      );
    }
  }
}

/**
 * Sends the emails for a booking event. Call it after the database write
 * has committed, never inside the transaction. It never throws.
 */
export function sendBookingEmail(
  event: BookingEmailEvent,
  booking: BookingWithItems,
): Promise<void> {
  return sendAll(
    bookingEmails(event, booking, settings),
    `${event} email for ${booking.reference}`,
  );
}

/**
 * Tells the customer who picks them up, once trips are assigned or their
 * driver or vehicle changes. After the write has committed; never throws.
 */
export function sendDriverEmail(
  booking: BookingWithItems,
  crews: readonly TripCrew[],
): Promise<void> {
  return sendAll(
    driverEmails(booking, crews, settings),
    `driver email for ${booking.reference}`,
  );
}

/**
 * A vendor's sign-up emails: the team hears of a registration, the vendor
 * of its approval. After the write has committed; never throws.
 */
export function sendVendorEmail(
  event: "registered" | "approved",
  vendor: VendorEmailFacts,
): Promise<void> {
  return sendAll(
    event === "registered"
      ? vendorRegisteredEmails(vendor, settings)
      : vendorApprovedEmails(vendor, settings),
    `vendor ${event} email for ${vendor.name}`,
  );
}

/** The driver email for a booking whose trips were just assigned, read fresh. */
export async function sendDriverEmailFor(bookingId: string): Promise<void> {
  const [booking, crews] = await Promise.all([
    getBooking(bookingId),
    tripCrewsOf(bookingId),
  ]);
  if (booking) await sendDriverEmail(booking, crews);
}

/**
 * The emails a transition result calls for: none when it failed or changed
 * nothing at booking level. For `after()` in the apps' server actions.
 */
export function sendBookingChangeEmail(change: BookingChange): Promise<void> {
  if (!change.ok || change.event === null) return Promise.resolve();
  return sendBookingEmail(change.event, change.booking);
}
