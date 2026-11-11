"use server";

import {
  flagOf,
  isIsoDate,
  isPaymentMethod,
  parseReason,
  parseRinggit,
  textOf,
} from "@repo/db";
import {
  billBookingAlone,
  billBookingNow,
  issueMonthEnd,
  recordPayment,
  reversePayment,
  voidInvoice,
} from "@repo/db/server";
import {
  type ActionState,
  FORBIDDEN,
  refusalOf,
  STALE,
  stateOf,
} from "@repo/console/action-state";
import { actorOf, getAdmin } from "../../../_lib/access";
import { revalidateLocation } from "../../../_lib/revalidate";
import { invoiceHref } from "../../../_lib/routes";

/**
 * Finance's moves on invoices and credit notes (`invoices.manage`): issue
 * what a booking owes now, in full, issue an agent's month-end invoice
 * or bill one of its bookings on its own, void and reissue,
 * record a payment or a refund, reverse a wrong entry. Each re-checks the
 * session and the key. Amounts are never typed on an invoice: they come
 * from its bookings. See docs/261108-billing-and-revisions.md.
 */

async function finance() {
  return getAdmin("invoices.manage");
}

/** Issues what a booking has not been billed yet, now, in full: its open invoice, or credit notes for less. */
export async function billNowAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await finance();
  if (!admin) return FORBIDDEN;
  const bookingId = textOf(formData.get("bookingId"));
  if (!bookingId) return STALE;
  const result = await billBookingNow(actorOf(admin), bookingId);
  if (!result.ok) return refusalOf(result);
  revalidateLocation();
  return null;
}

/** Issues an agent's open month-end invoice once its period has ended. */
export async function issueMonthEndAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await finance();
  if (!admin) return FORBIDDEN;
  const invoiceId = textOf(formData.get("invoiceId"));
  if (!invoiceId) return STALE;
  const result = await issueMonthEnd(actorOf(admin), invoiceId);
  if (!result.ok) return refusalOf(result);
  revalidateLocation();
  return null;
}

/** Moves a booking off its agent's month-end invoice onto its own, and opens that one. */
export async function billAloneAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await finance();
  if (!admin) return FORBIDDEN;
  const bookingId = textOf(formData.get("bookingId"));
  if (!bookingId) return STALE;
  const result = await billBookingAlone(actorOf(admin), bookingId);
  if (!result.ok) return refusalOf(result);
  revalidateLocation();
  return { href: invoiceHref(result.id) };
}

/** Voids a document with why, and with its replacement when asked; opens the replacement. */
export async function voidInvoiceAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await finance();
  if (!admin) return FORBIDDEN;
  const invoiceId = textOf(formData.get("invoiceId"));
  if (!invoiceId) return STALE;
  const reason = parseReason(formData.get("reason"), "it is voided");
  if (!reason.ok) return { error: reason.error, field: "reason" };
  const result = await voidInvoice(actorOf(admin), invoiceId, {
    reason: reason.value,
    reissue: flagOf(formData.get("reissue")),
  });
  if (!result.ok) return refusalOf(result);
  revalidateLocation();
  return result.replacement
    ? { href: invoiceHref(result.replacement.id) }
    : null;
}

/** Records money in on an invoice, or a refund out on a credit note. */
export async function recordPaymentAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await finance();
  if (!admin) return FORBIDDEN;
  const invoiceId = textOf(formData.get("invoiceId"));
  if (!invoiceId) return STALE;
  const amount = parseRinggit(textOf(formData.get("amount")));
  if (amount === null || amount === 0) {
    return {
      error: "Enter the amount in RM, such as 350.00.",
      field: "amount",
    };
  }
  const method = textOf(formData.get("method"));
  if (!isPaymentMethod(method)) {
    return { error: "Choose how it was paid.", field: "method" };
  }
  const paidOn = textOf(formData.get("paidOn"));
  if (!isIsoDate(paidOn)) {
    return { error: "Choose the day it came in.", field: "paidOn" };
  }
  const note = textOf(formData.get("note")).slice(0, 200) || null;
  const refund = flagOf(formData.get("refund"));
  // None on a month-end invoice: spread over its bookings.
  const bookingId = textOf(formData.get("bookingId")) || undefined;
  const result = await recordPayment(actorOf(admin), invoiceId, {
    amountSen: refund ? -amount : amount,
    method,
    paidOn,
    note,
    bookingId,
  });
  if (result.ok) revalidateLocation();
  return stateOf(result);
}

/** Reverses a wrong payment entry, with why. */
export async function reversePaymentAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await finance();
  if (!admin) return FORBIDDEN;
  const paymentId = textOf(formData.get("paymentId"));
  if (!paymentId) return STALE;
  const reason = parseReason(formData.get("reason"), "it is reversed");
  if (!reason.ok) return { error: reason.error, field: "reason" };
  const result = await reversePayment(actorOf(admin), paymentId, reason.value);
  if (result.ok) revalidateLocation();
  return stateOf(result);
}
