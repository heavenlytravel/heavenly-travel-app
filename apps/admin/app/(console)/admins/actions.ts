"use server";

import {
  isAdminLevel,
  revokeAdmin,
  setAdminLevel,
  type AdminChange,
} from "@repo/db/server";
import { revalidatePath } from "next/cache";
import { getAdmin, isSuper } from "../../_lib/access";

const FORBIDDEN: AdminChange = {
  ok: false,
  error: "Only SUPER admins can manage admins.",
};

/** Server actions are reachable by direct POST, so each one checks again. */
async function getSuperAdmin() {
  const admin = await getAdmin();
  return admin && isSuper(admin) ? admin : null;
}

/** Promotes an existing user, or changes the level of an existing admin. */
export async function setAdminLevelAction(
  _previous: AdminChange | null,
  formData: FormData,
): Promise<AdminChange> {
  const actor = await getSuperAdmin();
  if (!actor) return FORBIDDEN;

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const level = formData.get("level");
  if (!email || !isAdminLevel(level)) {
    return { ok: false, error: "Enter an email and choose a level." };
  }
  if (email === actor.email.toLowerCase() && level !== "SUPER") {
    return { ok: false, error: "You cannot lower your own level." };
  }

  const result = await setAdminLevel(email, level);
  if (result.ok) revalidatePath("/admins");
  return result;
}

export async function revokeAdminAction(
  _previous: AdminChange | null,
  formData: FormData,
): Promise<AdminChange> {
  const actor = await getSuperAdmin();
  if (!actor) return FORBIDDEN;

  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { ok: false, error: "Missing user." };
  if (userId === actor.id) {
    return { ok: false, error: "You cannot revoke your own access." };
  }

  const result = await revokeAdmin(userId);
  if (result.ok) revalidatePath("/admins");
  return result;
}
