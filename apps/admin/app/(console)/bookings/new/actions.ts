"use server";

import { parseContact, tripItemIndexes, tripItemParams } from "@repo/db";
import {
  createBooking,
  findUserByEmail,
  type PreparedItem,
} from "@repo/db/server";
import { sendBookingEmail } from "@repo/email";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { actorOf, getAdmin } from "../../../_lib/access";
import { FORBIDDEN, type ActionState } from "../../../_lib/action-state";
import { BOOKINGS_PATH, bookingHref } from "../../../_lib/routes";
import { CONTACT_FIELDS } from "../_lib/trip-form";
import { prepareFormItem } from "../_lib/trip-server";

/**
 * Creates the booking from the posted form: every vehicle's trip is
 * resolved and priced again on the server, the customer is linked to an
 * account when the email belongs to one, and an agreed price is stored per
 * item with its reason. The received emails go out once the response is
 * sent. Checks `bookings.create` again, because actions are reachable by
 * direct POST.
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
  if (!contact.ok) return { error: contact.error };

  const indexes = tripItemIndexes(formData);
  if (indexes.length === 0) {
    return { error: "Fill in the trip and get prices first." };
  }
  const prepared = await Promise.all(
    indexes.map((index) => prepareFormItem(tripItemParams(formData, index))),
  );
  const items: PreparedItem[] = [];
  for (const [n, result] of prepared.entries()) {
    if (!result.ok) {
      return {
        error:
          indexes.length > 1
            ? `Vehicle ${n + 1}: ${result.error}`
            : result.error,
      };
    }
    items.push({ ...result.item, override: result.override });
  }

  const account = await findUserByEmail(contact.value.contactEmail);
  const booking = await createBooking(actorOf(admin), {
    userId: account?.id ?? null,
    ...contact.value,
    createdIp: null,
    items,
  });
  after(() => sendBookingEmail("received", booking));
  revalidatePath(BOOKINGS_PATH);
  revalidatePath("/");
  redirect(bookingHref(booking.id));
}
