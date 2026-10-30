"use server";

import {
  isAdminLevel,
  isAdminTeam,
  revokeAdmin,
  setAdmin,
  setWallActive,
} from "@repo/db/server";
import { revalidateLocation } from "../../../_lib/revalidate";
import { actorOf, getAdmin } from "../../../_lib/access";
import { type ActionState, STALE, stateOf } from "@repo/console/action-state";

const FORBIDDEN: ActionState = {
  error: "Only SUPER admins can manage staff.",
};

/**
 * Teams and the wall change what every admin may open, so every console
 * page is drawn again, the menu in its layout with it.
 */
const revalidateAccess = revalidateLocation;

/**
 * Promotes an existing user, or changes the level and teams of an existing
 * admin. Server actions are reachable by direct POST, so each one checks
 * the permission again.
 */
export async function setAdminAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await getAdmin("admins.manage");
  if (!actor) return FORBIDDEN;

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const level = formData.get("level");
  const teams = formData.getAll("teams");
  if (!email) {
    return { error: "Enter their email.", field: "email" };
  }
  if (!isAdminLevel(level)) {
    return { error: "Choose a level.", field: "level" };
  }
  if (!teams.every(isAdminTeam)) return STALE;
  if (email === actor.email.toLowerCase() && level !== "SUPER") {
    return {
      error: "You cannot lower your own level. Ask another SUPER admin.",
      field: "level",
    };
  }

  const result = await setAdmin(actorOf(actor), email, level, teams);
  if (result.ok) revalidateAccess();
  return stateOf(result);
}

export async function revokeAdminAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await getAdmin("admins.manage");
  if (!actor) return FORBIDDEN;

  const userId = String(formData.get("userId") ?? "");
  if (!userId) return STALE;
  if (userId === actor.id) {
    return {
      error: "You cannot revoke your own access. Ask another SUPER admin.",
    };
  }

  const result = await revokeAdmin(actorOf(actor), userId);
  if (result.ok) revalidateAccess();
  return stateOf(result);
}

/** Turns the wall between teams on or off for the whole app. */
export async function setWallAction(wallActive: boolean): Promise<ActionState> {
  const actor = await getAdmin("wall.switch");
  if (!actor) return { error: "Only SUPER admins can switch the wall." };
  if (typeof wallActive !== "boolean") return STALE;

  await setWallActive(actorOf(actor), wallActive);
  revalidateAccess();
  return null;
}
