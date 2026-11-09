"use server";

import {
  flagOf,
  isPaymentMethod,
  parseReason,
  parseRinggit,
  textOf,
} from "@repo/db";
import {
  billBookingNow,
  deleteDraft,
  issueDraft,
  recordPayment,
  reversePayment,
  setDraftLine,
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
import { invoiceHref, invoicesHref } from "../../../_lib/routes";

/**
 * Finance's moves on invoices and credit notes (`invoices.manage`): issue
 * what a booking owes now, in full or a part, tick and issue a month-end draft, void and reissue,
 * record a payment or a refund, reverse a wrong entry. Each re-checks the
 * session and the key. Amounts are never typed on an invoice: they come
 * from its bookings. See docs/261108-billing-and-revisions.md.
 */

async function finance() {
  return getAdmin("invoices.manage");
}

/**
 * Issues what a booking has not been billed yet, now: an invoice, or credit
 * notes for less. An amount typed bills part of it (a deposit); empty, all.
 */
export async function billNowAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await finance();
  if (!admin) return FORBIDDEN;
  const bookingId = textOf(formData.get("bookingId"));
  if (!bookingId) return STALE;
  const typed = textOf(formData.get("amount"));
  const amount = typed === "" ? undefined : parseRinggit(typed);
  if (amount === null) {
    return {
      error: "Enter the amount in RM, such as 350.00.",
      field: "amount",
    };
  }
  const result = await billBookingNow(actorOf(admin), bookingId, {
    amountSen: amount,
  });
  if (!result.ok) return refusalOf(result);
  revalidateLocation();
  return null;
}

/** Ticks or unticks a booking on a draft. */
export async function setDraftLineAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await finance();
  if (!admin) return FORBIDDEN;
  const invoiceId = textOf(formData.get("invoiceId"));
  const bookingId = textOf(formData.get("bookingId"));
  if (!invoiceId || !bookingId) return STALE;
  const result = await setDraftLine(
    invoiceId,
    bookingId,
    flagOf(formData.get("ticked")),
  );
  if (result.ok) revalidateLocation();
  return stateOf(result);
}

/** Issues a draft, numbered now, and opens the invoice. */
export async function issueDraftAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await finance();
  if (!admin) return FORBIDDEN;
  const invoiceId = textOf(formData.get("invoiceId"));
  if (!invoiceId) return STALE;
  const result = await issueDraft(actorOf(admin), invoiceId);
  if (!result.ok) return refusalOf(result);
  revalidateLocation();
  return { href: invoiceHref(result.id) };
}

/** Deletes a draft; nothing was numbered. */
export async function deleteDraftAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await finance();
  if (!admin) return FORBIDDEN;
  const invoiceId = textOf(formData.get("invoiceId"));
  if (!invoiceId) return STALE;
  const result = await deleteDraft(actorOf(admin), invoiceId);
  if (!result.ok) return refusalOf(result);
  revalidateLocation();
  return { href: invoicesHref() };
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn)) {
    return { error: "Choose the day it came in.", field: "paidOn" };
  }
  const note = textOf(formData.get("note")).slice(0, 200) || null;
  const refund = flagOf(formData.get("refund"));
  const result = await recordPayment(actorOf(admin), invoiceId, {
    amountSen: refund ? -amount : amount,
    method,
    paidOn,
    note,
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
