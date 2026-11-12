"use server";

import { isIsoDate, parseContact, parseLegacyInvoiceNumber } from "@repo/db";
import {
  BookingRefusal,
  createBooking,
  findUserByEmail,
  newBookingBillingPreview,
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
  LEGACY_INVOICE_FIELD,
  PAY_LATER_FIELD,
} from "../_lib/trip-form";
import { prepareFormItems, savedBookingHref } from "../_lib/trip-server";

/**
 * Creates the booking from the posted form: confirmed at once with every
 * trip, numbered HTB, when "Create and confirm" sent it, else received,
 * numbered HTQ, for confirming later. Pay later, ticked, is kept with
 * the day it is to be paid by. Every trip is resolved and priced again on the
 * server, the customer is linked to an account when the email belongs to
 * one, and an agreed price is stored per trip with its reason. Confirmed,
 * its invoice opens, unless its agent is on credit (the month-end run);
 * an old invoice number is a note. No
 * email goes out: the console's own emails wait for their settings. The
 * booking opens in the location the form was opened in when a trip picks
 * up there, else across every location. Checks `bookings.create` again,
 * because actions are reachable by direct POST.
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

  const legacy = parseLegacyInvoiceNumber(
    String(formData.get(LEGACY_INVOICE_FIELD) ?? ""),
  );
  if (!legacy.ok) return { error: legacy.error, field: LEGACY_INVOICE_FIELD };
  const businessId = String(formData.get(AGENT_FIELD) ?? "") || null;
  const payLater = formData.get(PAY_LATER_FIELD);
  if (payLater !== null && !isIsoDate(String(payLater))) {
    return {
      error: "Choose the day it is to be paid by.",
      field: PAY_LATER_FIELD,
    };
  }

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
      businessId,
      legacyInvoiceNumber: legacy.value,
      payLaterDueOn: payLater === null ? null : String(payLater),
      confirm: formData.get("confirm") === "1",
    });
  } catch (error) {
    // The agent was made inactive or removed meanwhile, or is on credit
    // terms with Pay later ticked.
    if (error instanceof BookingRefusal) {
      return {
        error: error.message,
        field: error.field === "payLater" ? PAY_LATER_FIELD : AGENT_FIELD,
      };
    }
    throw error;
  }
  revalidateLocation();
  return { href: savedBookingHref(formData, booking) };
}

/**
 * What making the booking and confirming it would bill, for the form to
 * show before it is made: its open invoice for its total, or nothing yet
 * for an agent on credit. Nothing is given.
 */
export async function previewNewBillingAction(input: {
  agentId: string;
  chargedSen: number;
}): Promise<{ sentence: string } | { error: string }> {
  if (!(await getAdmin("bookings.create"))) return { error: FORBIDDEN_MESSAGE };
  if (typeof input !== "object" || input === null) {
    return { error: "Reload the page and try again." };
  }
  const chargedSen = Number(input.chargedSen);
  if (!Number.isInteger(chargedSen) || chargedSen < 0) return { error: "" };
  const preview = await newBookingBillingPreview({
    businessId: String(input.agentId ?? "") || null,
    chargedSen,
  });
  return { sentence: preview.sentence };
}
