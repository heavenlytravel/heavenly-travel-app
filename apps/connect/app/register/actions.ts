"use server";

import {
  createVendor,
  getConnectAccess,
  mayRegisterVendor,
  parseVendorFields,
  VENDOR_LOCATIONS_FIELD,
  VENDOR_SERVICES_FIELD,
} from "@repo/db/server";
import { sendVendorEmail } from "@repo/email";
import {
  type ActionState,
  refusalOf,
  stateOf,
} from "@repo/console/action-state";
import { after } from "next/server";
import { actorOf } from "../_lib/access";

/**
 * A vendor's registration: the signed-in applicant becomes the owner of a
 * vendor waiting for approval, with their account's email as its contact.
 * Refused for an account that already works for a vendor or drives for
 * one. The team hears of it by email. See
 * docs/261028-fulfilment-vendors-and-connect.md, "Signing up".
 */
export async function registerVendorAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const access = await getConnectAccess();
  if (access.status === "signed-out") {
    return { error: "Your sign-in ended. Sign in again, then register." };
  }
  const { user } = access;
  if (!(await mayRegisterVendor(user.id))) {
    return {
      error:
        "This account already works for a vendor or drives for one. Reload the page.",
    };
  }
  // The email is the account's, whatever the form sent.
  formData.set("contactEmail", user.email);
  const fields = parseVendorFields(
    Object.fromEntries(formData),
    formData.getAll(VENDOR_SERVICES_FIELD),
    formData.getAll(VENDOR_LOCATIONS_FIELD),
  );
  if (!fields.ok) return refusalOf(fields);
  const result = await createVendor(actorOf(user), fields.value, {
    status: "pending",
    owner: user.id,
  });
  if (!result.ok) return stateOf(result);
  const { name, contactName, contactEmail, contactPhone } = fields.value;
  after(() =>
    sendVendorEmail("registered", {
      id: result.id,
      name,
      contactName,
      contactEmail,
      contactPhone,
      at: new Date(),
    }),
  );
  return { href: "/" };
}
