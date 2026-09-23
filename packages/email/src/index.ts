import "server-only";
import { CONTACT } from "@repo/db";
import type { BookingChange, BookingWithItems } from "@repo/db/server";
import {
  bookingEmails,
  type BookingEmailEvent,
  type EmailLinks,
} from "./booking-emails";
import { logSender } from "./log-sender";
import { resendSender } from "./resend";
import type { EmailSender } from "./types";

export type { BookingEmailEvent } from "./booking-emails";

/**
 * Booking emails as the apps send them. The sender is chosen once per
 * process: Resend when `RESEND_API_KEY` is set, otherwise the console. The
 * links point at the two apps' production domains unless `SITE_URL` and
 * `ADMIN_URL` say otherwise, as they do on staging.
 */

const FROM = `Heavenly Travel <${CONTACT.bookingEmail}>`;

function pick(): EmailSender {
  const key = process.env.RESEND_API_KEY;
  if (key) return resendSender(key, FROM);
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
const links: EmailLinks = {
  siteUrl: origin(process.env.SITE_URL, "https://new.heavenlytravel.my"),
  adminUrl: origin(process.env.ADMIN_URL, "https://manage.heavenlytravel.my"),
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
    bookingEmails(event, booking, links).map(({ key, message }) =>
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
