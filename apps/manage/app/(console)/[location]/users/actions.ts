"use server";

import {
  changeUserEmail,
  createUser,
  flagOf,
  parseNewPassword,
  parseNewUser,
  parseStaffAccess,
  parseUserEmail,
  parseUserProfile,
  setUserPassword,
  updateUserProfile,
  type StaffAccess,
} from "@repo/db/server";
import { revalidateLocation } from "../../../_lib/revalidate";
import { actorOf, getAdmin } from "../../../_lib/access";
import {
  type ActionState,
  refusalOf,
  STALE,
  stateOf,
} from "@repo/console/action-state";

/**
 * Creates an account on someone's behalf, in Clerk and here, and with
 * Make admin on, makes it an admin in the same go. Server actions are
 * reachable by direct POST, so it checks the permissions again: making
 * staff asks the one that manages them.
 */
export async function createUserAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await getAdmin("users.manage");
  if (!actor) return { error: "Only SUPER admins can create accounts." };

  const parsed = parseNewUser(Object.fromEntries(formData));
  if (!parsed.ok) return refusalOf(parsed);
  let staff: StaffAccess | undefined;
  if (flagOf(formData.get("staff"))) {
    if (!(await getAdmin("admins.manage"))) {
      return { error: "Only SUPER admins can manage staff." };
    }
    const access = parseStaffAccess(
      formData.get("level"),
      formData.getAll("teams"),
    );
    if (!access.ok) return refusalOf(access);
    staff = access.value;
  }
  const result = await createUser(actorOf(actor), parsed.value, staff);
  if (result.ok) revalidateLocation();
  return stateOf(result);
}

/** The account a form on a user's page is about. */
function userIdOf(formData: FormData) {
  return String(formData.get("userId") ?? "");
}

const FORBIDDEN: ActionState = {
  error: "Only SUPER admins can change accounts.",
};

/** A user's page: their names, in Clerk, and their phone. */
export async function updateUserProfileAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await getAdmin("users.manage");
  if (!actor) return FORBIDDEN;
  const userId = userIdOf(formData);
  if (!userId) return STALE;
  const parsed = parseUserProfile(Object.fromEntries(formData));
  if (!parsed.ok) return refusalOf(parsed);
  const result = await updateUserProfile(actorOf(actor), userId, parsed.value);
  if (result.ok) revalidateLocation();
  return stateOf(result);
}

/** A user's page: the email they sign in with, taken as verified. */
export async function changeUserEmailAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await getAdmin("users.manage");
  if (!actor) return FORBIDDEN;
  const userId = userIdOf(formData);
  if (!userId) return STALE;
  const parsed = parseUserEmail(formData.get("email"));
  if (!parsed.ok) return refusalOf(parsed);
  const result = await changeUserEmail(actorOf(actor), userId, parsed.value);
  if (result.ok) revalidateLocation();
  return stateOf(result);
}

/** A user's page: a new password, which signs them out everywhere. */
export async function setUserPasswordAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await getAdmin("users.manage");
  if (!actor) return FORBIDDEN;
  const userId = userIdOf(formData);
  if (!userId) return STALE;
  const parsed = parseNewPassword(formData.get("password"));
  if (!parsed.ok) return refusalOf(parsed);
  const result = await setUserPassword(actorOf(actor), userId, parsed.value);
  if (result.ok) revalidateLocation();
  return stateOf(result);
}
