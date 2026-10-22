"use server";

import { createUser, parseNewUser } from "@repo/db/server";
import { revalidatePath } from "next/cache";
import { actorOf, getAdmin } from "../../_lib/access";
import { type ActionState, refusalOf, stateOf } from "../../_lib/action-state";
import { USERS_PATH } from "../../_lib/routes";

/**
 * Creates an account on someone's behalf, in Clerk and here. Server
 * actions are reachable by direct POST, so it checks the permission again.
 */
export async function createUserAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await getAdmin("users.manage");
  if (!actor) return { error: "Only SUPER admins can create accounts." };

  const parsed = parseNewUser(Object.fromEntries(formData));
  if (!parsed.ok) return refusalOf(parsed);
  const result = await createUser(actorOf(actor), parsed.value);
  if (result.ok) revalidatePath(USERS_PATH);
  return stateOf(result);
}
