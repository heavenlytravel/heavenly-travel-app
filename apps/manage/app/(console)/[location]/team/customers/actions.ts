"use server";

import {
  createUser,
  flagOf,
  parseNewUser,
  parseStaffAccess,
  type StaffAccess,
} from "@repo/db/server";
import { revalidateLocation } from "../../../../_lib/revalidate";
import { actorOf, getAdmin } from "../../../../_lib/access";
import {
  type ActionState,
  refusalOf,
  stateOf,
} from "@repo/console/action-state";

/**
 * Creates an account on someone's behalf, in Clerk and here, and with
 * Make staff on, makes it staff in the same go. Server actions are
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
