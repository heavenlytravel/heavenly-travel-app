"use server";

import {
  createVendor,
  getConnectAccess,
  keepApplicantProfile,
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
import { STATUS_PATH } from "../_ui/nav";
import { ALREADY_REGISTERED_HREF } from "./paths";

/** The registration's fields as the vendor's, the contact's email the one given. */
function fieldsOf(formData: FormData, email: string) {
  formData.set("contactEmail", email);
  return parseVendorFields(
    Object.fromEntries(formData),
    formData.getAll(VENDOR_SERVICES_FIELD),
    formData.getAll(VENDOR_LOCATIONS_FIELD),
  );
}

/**
 * The registration's fields checked before the account is made, so a
 * mistake shows at its field while nothing is stored yet. Reachable by
 * anyone: it reads, and writes nothing.
 */
export async function checkRegistrationAction(
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "");
  const fields = fieldsOf(formData, email);
  return fields.ok ? null : refusalOf(fields);
}

/**
 * A vendor's registration, once the email is confirmed and the session
 * started: the signed-in applicant becomes the owner of a vendor waiting
 * for approval, with their account's email as its contact; the phone and
 * names they typed are kept on their account too. An account that already
 * works for a vendor or drives for one is not given a second: it goes to
 * its status page, which hands an approved one on to Connect. The team
 * hears of a registration by email. See
 * docs/261030-sign-in-connect-onboarding-and-media.md, "Connect".
 */
export async function registerVendorAction(
  formData: FormData,
): Promise<ActionState> {
  const access = await getConnectAccess();
  if (access.status === "signed-out") {
    return { error: "Your sign-in ended. Sign in again, then send it." };
  }
  const { user } = access;
  if (!(await mayRegisterVendor(user.id))) {
    return { href: ALREADY_REGISTERED_HREF };
  }
  // The email is the account's, whatever the form sent.
  const fields = fieldsOf(formData, user.email);
  if (!fields.ok) return refusalOf(fields);
  const result = await createVendor(actorOf(user), fields.value, {
    status: "pending",
    owner: user.id,
  });
  if (!result.ok) return stateOf(result);
  const { name, contactName, contactEmail, contactPhone } = fields.value;
  const names = {
    firstName: String(formData.get("firstName") ?? "").trim(),
    lastName: String(formData.get("lastName") ?? "").trim(),
  };
  after(async () => {
    try {
      await keepApplicantProfile(user, { ...names, phone: contactPhone });
    } catch (error) {
      console.error("Keeping the applicant's profile failed", error);
    }
  });
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
  return { href: STATUS_PATH };
}
