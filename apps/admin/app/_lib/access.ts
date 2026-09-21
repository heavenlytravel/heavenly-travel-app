import "server-only";
import { getAccess, type SessionUser } from "@repo/db/server";
import { redirect } from "next/navigation";

export type AdminUser = SessionUser & {
  adminProfile: NonNullable<SessionUser["adminProfile"]>;
};

/** The signed-in admin, or null. For server actions, which must not redirect. */
export async function getAdmin(): Promise<AdminUser | null> {
  const access = await getAccess("admin");
  if (access.status !== "ok" || !access.user.adminProfile) return null;
  return access.user as AdminUser;
}

/**
 * First line of every admin page. Signed-out visitors go to /sign-in,
 * signed-in users without an admin profile go to /no-access.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const access = await getAccess("admin");
  if (access.status === "signed-out") redirect("/sign-in");
  if (access.status !== "ok" || !access.user.adminProfile) {
    redirect("/no-access");
  }
  return access.user as AdminUser;
}

/** Only SUPER admins manage other admins. */
export function isSuper(admin: AdminUser) {
  return admin.adminProfile.level === "SUPER";
}
