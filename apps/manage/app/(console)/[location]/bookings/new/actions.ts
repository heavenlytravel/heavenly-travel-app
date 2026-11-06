"use server";

import { parseContact, parseOldInvoiceNumber } from "@repo/db";
import {
  createBooking,
  createVendor,
  findUserByEmail,
  invoicePreviewOf,
  InvoiceRefusal,
  parseVendorFields,
  VENDOR_LOCATIONS_FIELD,
} from "@repo/db/server";
import { actorOf, getAdmin } from "../../../../_lib/access";
import {
  type ActionState,
  FORBIDDEN,
  FORBIDDEN_MESSAGE,
  refusalOf,
} from "@repo/console/action-state";
import { revalidateLocation } from "../../../../_lib/revalidate";
import {
  AGENT_FIELD,
  CONTACT_FIELDS,
  OLD_INVOICE_FIELD,
} from "../_lib/trip-form";
import { prepareFormItems, savedBookingHref } from "../_lib/trip-server";
import type { InvoiceCheck } from "../_components/InvoiceNumberField";

/**
 * Creates the booking from the posted form, confirmed at once with every
 * trip: every trip is resolved and priced again on the server, the
 * customer is linked to an account when the email belongs to one, and an
 * agreed price is stored per trip with its reason. It takes the next
 * invoice number, or the old system's when one is typed: one already
 * given and on no other invoice. An agent's joins the agent's invoice for
 * the period its first trip is in. No email goes out: the console's own
 * emails wait for their settings. The booking opens in the location the
 * form was opened in when a trip picks up there, else across every
 * location. Checks `bookings.create` again, because actions are reachable
 * by direct POST.
 */
export async function createManualBookingAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("bookings.create");
  if (!admin) return FORBIDDEN;

  const contact = parseContact({
    name: formData.get(CONTACT_FIELDS.name),
    phone: formData.get(CONTACT_FIELDS.phone),
    email: formData.get(CONTACT_FIELDS.email),
  });
  if (!contact.ok) return refusalOf(contact);

  const oldInvoice = parseOldInvoiceNumber(
    String(formData.get(OLD_INVOICE_FIELD) ?? ""),
  );
  if (!oldInvoice.ok) {
    return { error: oldInvoice.error, field: OLD_INVOICE_FIELD };
  }
  const agentId = String(formData.get(AGENT_FIELD) ?? "") || null;

  const prepared = await prepareFormItems(formData);
  if (!prepared.ok) return { error: prepared.error };

  const account = await findUserByEmail(contact.value.contactEmail);
  let booking;
  try {
    booking = await createBooking(actorOf(admin), {
      userId: account?.id ?? null,
      ...contact.value,
      createdIp: null,
      items: prepared.items,
      agentId,
      oldInvoiceNumber: oldInvoice.number ?? undefined,
    });
  } catch (error) {
    // The invoice asked for cannot be given: a number taken, or the
    // agent's invoice for the period has another.
    if (error instanceof InvoiceRefusal) {
      return { error: error.message, field: OLD_INVOICE_FIELD };
    }
    throw error;
  }
  revalidateLocation();
  return { href: savedBookingHref(formData, booking) };
}

/**
 * The invoice the booking being entered would get (`invoicePreviewOf`),
 * for the form to show before it is made: the agent's for the period of
 * its first trip, joined or opened, or one of its own; with `oldNumber`,
 * an old invoice's digits typed, checked as the save checks it. Nothing
 * is given. `startsAt` is the first trip's start; a customer of ours
 * needs none.
 */
export async function previewInvoiceAction(input: {
  agentId: string;
  startsAt: string | null;
  oldNumber: string;
}): Promise<InvoiceCheck> {
  if (!(await getAdmin("bookings.create"))) return { error: FORBIDDEN_MESSAGE };
  const oldNumber = parseOldInvoiceNumber(String(input.oldNumber ?? ""));
  if (!oldNumber.ok) return { error: oldNumber.error };
  const startsAt = input.startsAt ? new Date(input.startsAt) : new Date();
  if (Number.isNaN(startsAt.getTime())) {
    return { error: "Set the first trip's day and time first." };
  }
  const answer = await invoicePreviewOf(
    { agentId: input.agentId || null, startsAt },
    oldNumber.number,
  );
  return answer.ok ? answer.preview : { error: answer.error };
}

/** What adding an agent from the booking form answers: the agent, to choose at once, or why not. */
export type AddAgentAnswer =
  { id: string; name: string } | { error: string; field?: string };

/**
 * Adds an agent from the booking form, for a booking that comes through
 * one not yet entered: a vendor offering "agent" alone, active at once,
 * with no Connect owner. Whatever else is posted, it offers nothing but
 * "agent": the rest of a vendor is entered on its page. Those who enter
 * bookings may add one (`bookings.create`), not only Operation, who keeps
 * the vendors. See docs/261106-filters-and-agents.md.
 */
export async function addAgentAction(
  formData: FormData,
): Promise<AddAgentAnswer> {
  const admin = await getAdmin("bookings.create");
  if (!admin) return { error: FORBIDDEN_MESSAGE };
  const fields = parseVendorFields(
    Object.fromEntries(formData),
    ["agent"],
    formData.getAll(VENDOR_LOCATIONS_FIELD),
  );
  if (!fields.ok) return refusalOf(fields);
  const created = await createVendor(actorOf(admin), fields.value, {
    status: "active",
  });
  if (!created.ok) return refusalOf(created);
  revalidateLocation();
  return { id: created.id, name: fields.value.name };
}
