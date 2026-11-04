"use server";

import { parseBookingNumber, parseContact } from "@repo/db";
import {
  checkOldInvoiceNumber,
  createBooking,
  findUserByEmail,
} from "@repo/db/server";
import { actorOf, getAdmin } from "../../../../_lib/access";
import {
  type ActionState,
  FORBIDDEN,
  refusalOf,
} from "@repo/console/action-state";
import { revalidateLocation } from "../../../../_lib/revalidate";
import { CONTACT_FIELDS, OLD_INVOICE_FIELD } from "../_lib/trip-form";
import { prepareFormItems, savedBookingHref } from "../_lib/trip-server";

/**
 * Creates the booking from the posted form, confirmed at once with every
 * trip: every trip is resolved and priced again on the server, the
 * customer is linked to an account when the email belongs to one, and an
 * agreed price is stored per trip with its reason. It takes the next
 * invoice number, or the old system's when one is typed: one already
 * given and on no other booking. No email goes out: the console's own
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

  const typed = String(formData.get(OLD_INVOICE_FIELD) ?? "").trim();
  let oldInvoiceNumber: number | undefined;
  if (typed) {
    const parsed = parseBookingNumber(typed);
    if (!parsed || parsed.kind === "quote") {
      return {
        error: `"${typed}" is not an invoice number. Type it as HT1223, HTI-1223 or 1223.`,
        field: OLD_INVOICE_FIELD,
      };
    }
    const issue = await checkOldInvoiceNumber(parsed.number);
    if (issue) return { error: issue, field: OLD_INVOICE_FIELD };
    oldInvoiceNumber = parsed.number;
  }

  const prepared = await prepareFormItems(formData);
  if (!prepared.ok) return { error: prepared.error };

  const account = await findUserByEmail(contact.value.contactEmail);
  const booking = await createBooking(actorOf(admin), {
    userId: account?.id ?? null,
    ...contact.value,
    createdIp: null,
    items: prepared.items,
    oldInvoiceNumber,
  });
  revalidateLocation();
  return { href: savedBookingHref(formData, booking) };
}
