import "server-only";
import {
  getAccess,
  getAdminAccess,
  isWallActive,
  permissionsOf,
  type AdminActor,
  type AdminUser,
  type Permission,
} from "@repo/db/server";
import { redirect } from "next/navigation";
import { RESTRICTED_PATH } from "./routes";

export type { AdminUser };

/**
 * How the console answers `getAdminAccess` of @repo/db, which holds the
 * check itself and shares it with the customer site's staff preview.
 */

/** The admin as the activity log records them. */
export function actorOf(admin: AdminUser): AdminActor {
  return { kind: "admin", userId: admin.id };
}

/**
 * The signed-in admin if they hold the permission, or null. For server
 * actions, which must not redirect.
 */
export async function getAdmin(
  permission: Permission,
): Promise<AdminUser | null> {
  const access = await getAdminAccess(permission);
  return access.status === "ok" ? access.admin : null;
}

/**
 * First line of every admin page, naming the screen it guards. Signed-out
 * visitors go to /sign-in, signed-in users without an admin profile go to
 * /no-access, and an admin whose teams do not reach the screen goes to
 * /restricted.
 */
export async function requireAdmin(permission: Permission): Promise<AdminUser> {
  const access = await getAdminAccess(permission);
  if (access.status === "signed-out") redirect("/sign-in");
  if (access.status === "forbidden") redirect("/no-access");
  if (access.status === "restricted") redirect(RESTRICTED_PATH);
  return access.admin;
}

/**
 * Everything the signed-in admin may do, for choosing which links and
 * buttons to show. Empty when nobody is signed in as an admin.
 */
export async function getPermissions(): Promise<Permission[]> {
  const access = await getAccess("admin");
  if (access.status !== "ok" || !access.user.adminProfile) return [];
  return permissionsOf(access.user.adminProfile, await isWallActive());
}
