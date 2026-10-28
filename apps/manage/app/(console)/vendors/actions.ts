"use server";

import {
  createVendor,
  moveVendor,
  parseVendorFields,
  setVendorOurs,
  textOf,
  updateVendor,
  VENDOR_LOCATIONS_FIELD,
  VENDOR_SERVICES_FIELD,
  type VendorMove,
} from "@repo/db/server";
import { sendVendorEmail } from "@repo/email";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { actorOf, getAdmin } from "../../_lib/access";
import {
  type ActionState,
  FORBIDDEN,
  refusalOf,
  STALE,
  stateOf,
} from "@repo/console/action-state";
import { revalidateFleet } from "../../_lib/fleet-actions";
import { vendorHref, VENDORS_PATH } from "../../_lib/routes";

/**
 * The vendor screens' actions. Entering and changing a vendor is
 * Operation's (`fleet.manage`); approving, refusing, suspending,
 * reinstating and switching one to ours is SUPER's (`vendors.review`).
 * Each checks again, passes the admin as the actor and lets the writer in
 * @repo/db check the rest. See docs/261028-fulfilment-vendors-and-connect.md.
 */

function parsed(formData: FormData) {
  return parseVendorFields(
    Object.fromEntries(formData),
    formData.getAll(VENDOR_SERVICES_FIELD),
    formData.getAll(VENDOR_LOCATIONS_FIELD),
  );
}

function revalidateVendors() {
  revalidatePath(VENDORS_PATH, "layout");
  revalidateFleet("vehicles");
  revalidateFleet("drivers");
}

/** A vendor staff enter: active at once, never ours. */
export async function createVendorAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("fleet.manage");
  if (!admin) return FORBIDDEN;
  const fields = parsed(formData);
  if (!fields.ok) return refusalOf(fields);
  const result = await createVendor(actorOf(admin), fields.value, {
    status: "active",
  });
  if (!result.ok) return stateOf(result);
  revalidateVendors();
  return { href: vendorHref(result.id) };
}

export async function updateVendorAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("fleet.manage");
  if (!admin) return FORBIDDEN;
  const id = textOf(formData.get("id"));
  if (!id) return STALE;
  const fields = parsed(formData);
  if (!fields.ok) return refusalOf(fields);
  const result = await updateVendor(actorOf(admin), id, fields.value);
  if (result.ok) revalidateVendors();
  return stateOf(result);
}

const MOVES: readonly VendorMove[] = [
  "approve",
  "refuse",
  "suspend",
  "reinstate",
];

/**
 * SUPER's review: the move and its reason, from the review form. A
 * suspension first takes the vendor off the work it accepted (step 3 of
 * the plan adds that work).
 */
export async function moveVendorAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("vendors.review");
  if (!admin) return FORBIDDEN;
  const id = textOf(formData.get("id"));
  const move = textOf(formData.get("move")) as VendorMove;
  if (!id || !MOVES.includes(move)) return STALE;
  const result = await moveVendor(
    actorOf(admin),
    id,
    move,
    textOf(formData.get("reviewNote")),
  );
  if (!result.ok) return stateOf(result);
  revalidateVendors();
  // Approved, the vendor hears that Connect is open; a refusal is staff only.
  const vendor = result.vendor;
  if (move === "approve" && vendor) {
    after(() => sendVendorEmail("approved", { ...vendor, at: new Date() }));
  }
  return null;
}

export async function setVendorOursAction(
  id: string,
  isOurs: boolean,
): Promise<ActionState> {
  const admin = await getAdmin("vendors.review");
  if (!admin) return FORBIDDEN;
  if (typeof id !== "string" || !id || typeof isOurs !== "boolean") {
    return STALE;
  }
  const result = await setVendorOurs(actorOf(admin), id, isOurs);
  if (result.ok) revalidateVendors();
  return stateOf(result);
}
