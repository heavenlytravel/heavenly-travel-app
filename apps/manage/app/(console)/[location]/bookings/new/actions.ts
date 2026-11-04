"use server";

import { ADVANCE_PERMISSIONS, parseContact } from "@repo/db";
import { createBooking, findUserByEmail } from "@repo/db/server";
import { actorOf, getAdmin } from "../../../../_lib/access";
import {
  type ActionState,
  FORBIDDEN,
  refusalOf,
} from "@repo/console/action-state";
import { revalidateLocation } from "../../../../_lib/revalidate";
import { CONTACT_FIELDS, CREATE_STATUS_FIELD } from "../_lib/trip-form";
import { prepareFormItems, savedBookingHref } from "../_lib/trip-server";

/**
 * Creates the booking from the posted form: every trip is resolved and
 * priced again on the server, one vehicle for them all, none starting
 * while another is going, the customer is linked to an account when the
 * email belongs to one, and an agreed price is stored per trip with its
 * reason. One the customer has paid already is made confirmed, with its
 * invoice number and no quotation's, for staff who may confirm. No email
 * goes out: the console's own emails wait for their settings. The booking opens in the location the form was opened in when a trip picks
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
  const confirmed = formData.get(CREATE_STATUS_FIELD) === "confirmed";
  if (confirmed && !(await getAdmin(ADVANCE_PERMISSIONS.confirmed))) {
    return FORBIDDEN;
  }

  const prepared = await prepareFormItems(formData);
  if (!prepared.ok) return { error: prepared.error };

  const account = await findUserByEmail(contact.value.contactEmail);
  const booking = await createBooking(actorOf(admin), {
    userId: account?.id ?? null,
    ...contact.value,
    createdIp: null,
    items: prepared.items,
    confirmed,
  });
  revalidateLocation();
  return { href: savedBookingHref(formData, booking) };
}
