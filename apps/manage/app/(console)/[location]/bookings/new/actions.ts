"use server";

import { parseContact, parseLegacyInvoiceNumber } from "@repo/db";
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
} from "../_lib/trip-form";
import { prepareFormItems, savedBookingHref } from "../_lib/trip-server";

/**
 * Creates the booking from the posted form, numbered HTB and confirmed at
 * once with every trip: every trip is resolved and priced again on the
 * server, the customer is linked to an account when the email belongs to
 * one, and an agreed price is stored per trip with its reason. Confirmed,
 * it is billed at once, unless its agent is on credit (the month-end run)
 * or a legacy invoice number is typed (billed outside the system). No
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
    });
  } catch (error) {
    // The agent was made inactive or removed meanwhile.
    if (error instanceof BookingRefusal) {
      return { error: error.message, field: AGENT_FIELD };
    }
    throw error;
  }
  revalidateLocation();
  return { href: savedBookingHref(formData, booking) };
}

/**
 * What making the booking would bill, for the form to show before it is
 * made: an invoice for its total, nothing yet for an agent on credit, or
 * nothing here with a legacy number. Nothing is given.
 */
export async function previewNewBillingAction(input: {
  agentId: string;
  legacy: boolean;
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
    legacy: input.legacy === true,
    chargedSen,
  });
  return { sentence: preview.sentence };
}
