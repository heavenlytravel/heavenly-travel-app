import "server-only";
import { CONTACT } from "@repo/db";
import type { BookingChange, BookingWithItems } from "@repo/db/server";
import {
  bookingEmails,
  type BookingEmailEvent,
  type EmailSettings,
} from "./booking-emails";
import { logSender } from "./log-sender";
import { resendSender } from "./resend";
import type { EmailSender } from "./types";

export type { BookingEmailEvent } from "./booking-emails";

/**
 * Booking emails as the apps send them. The sender is chosen once per
 * process: Resend when `RESEND_API_KEY` is set, otherwise the console. The
 * links, the sender, the ops inbox and the subject prefix come from the
 * environment, with production values as defaults. See
 * docs/car-with-driver.md, "Emails".
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

function origin(value: string | undefined, fallback: string) {
  return (value || fallback).replace(/\/+$/, "");
}

const sender = pick();
const settings: EmailSettings = {
  siteUrl: origin(process.env.SITE_URL, "https://new.heavenlytravel.my"),
  adminUrl: origin(process.env.ADMIN_URL, "https://manage.heavenlytravel.my"),
  opsTo: process.env.EMAIL_OPS_TO || CONTACT.bookingEmail,
  subjectPrefix: isProduction ? "" : "[Development] ",
};

/**
 * Sends the emails for a booking event. Call it after the database write
 * has committed, never inside the transaction. It never throws: a failed
 * send is logged and the booking stands.
 */
export async function sendBookingEmail(
  event: BookingEmailEvent,
  booking: BookingWithItems,
): Promise<void> {
  const results = await Promise.allSettled(
    bookingEmails(event, booking, settings).map(({ key, message }) =>
      sender.send(message, key),
    ),
  );
  for (const result of results) {
    if (result.status === "rejected") {
      console.error(
        `[email] ${event} email for ${booking.reference} failed via ${sender.name}:`,
        result.reason,
      );
    }
  }
}

/**
 * The emails a transition result calls for: none when it failed or changed
 * nothing at booking level. For `after()` in the apps' server actions.
 */
export function sendBookingChangeEmail(change: BookingChange): Promise<void> {
  if (!change.ok || change.event === null) return Promise.resolve();
  return sendBookingEmail(change.event, change.booking);
}
