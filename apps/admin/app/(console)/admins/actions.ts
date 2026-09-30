"use server";

import {
  isAdminLevel,
  isAdminTeam,
  revokeAdmin,
  setAdmin,
  setWallActive,
  type AdminChange,
} from "@repo/db/server";
import { revalidatePath } from "next/cache";
import { getAdmin } from "../../_lib/access";
import { ADMINS_PATH } from "../../_lib/routes";

const FORBIDDEN: AdminChange = {
  ok: false,
  error: "Only SUPER admins can manage admins.",
};

/**
 * Teams and the wall change what every admin may open, so the sidebar in
 * the layout is rendered again along with the page.
 */
function revalidateAccess() {
  revalidatePath("/", "layout");
}

/**
 * Promotes an existing user, or changes the level and teams of an existing
 * admin. Server actions are reachable by direct POST, so each one checks
 * the permission again.
 */
export async function setAdminAction(
  _previous: AdminChange | null,
  formData: FormData,
): Promise<AdminChange> {
  const actor = await getAdmin("admins.manage");
  if (!actor) return FORBIDDEN;

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const level = formData.get("level");
  const teams = formData.getAll("teams");
  if (!email || !isAdminLevel(level) || !teams.every(isAdminTeam)) {
    return { ok: false, error: "Enter an email and choose a level." };
  }
  if (email === actor.email.toLowerCase() && level !== "SUPER") {
    return { ok: false, error: "You cannot lower your own level." };
  }

  const result = await setAdmin(email, level, teams);
  if (result.ok) revalidateAccess();
  return result;
}

export async function revokeAdminAction(
  _previous: AdminChange | null,
  formData: FormData,
): Promise<AdminChange> {
  const actor = await getAdmin("admins.manage");
  if (!actor) return FORBIDDEN;

  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { ok: false, error: "Missing user." };
  if (userId === actor.id) {
    return { ok: false, error: "You cannot revoke your own access." };
  }

  const result = await revokeAdmin(userId);
  if (result.ok) revalidatePath(ADMINS_PATH);
  return result;
}

/** Turns the wall between teams on or off for the whole app. */
export async function setWallAction(wallActive: boolean): Promise<AdminChange> {
  if (!(await getAdmin("wall.switch"))) {
    return { ok: false, error: "Only SUPER admins can switch the wall." };
  }
  if (typeof wallActive !== "boolean") {
    return { ok: false, error: "Choose on or off." };
  }

  await setWallActive(wallActive);
  revalidateAccess();
  return { ok: true };
}
