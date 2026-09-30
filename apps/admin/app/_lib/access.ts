import "server-only";
import {
  getAccess,
  isWallActive,
  may,
  permissionsOf,
  type AdminActor,
  type Permission,
  type SessionUser,
} from "@repo/db/server";
import { redirect } from "next/navigation";
import { RESTRICTED_PATH } from "./routes";

export type AdminUser = SessionUser & {
  adminProfile: NonNullable<SessionUser["adminProfile"]>;
};

/** The admin as the activity log records them. */
export function actorOf(admin: AdminUser): AdminActor {
  return { kind: "admin", userId: admin.id };
}

async function signedInAdmin(): Promise<AdminUser | null> {
  const access = await getAccess("admin");
  if (access.status !== "ok" || !access.user.adminProfile) return null;
  return access.user as AdminUser;
}

/**
 * The signed-in admin if they hold the permission, or null. For server
 * actions, which must not redirect.
 */
export async function getAdmin(
  permission: Permission,
): Promise<AdminUser | null> {
  const admin = await signedInAdmin();
  if (!admin) return null;
  return may(admin.adminProfile, permission, await isWallActive())
    ? admin
    : null;
}

/**
 * First line of every admin page, naming the screen it guards. Signed-out
 * visitors go to /sign-in, signed-in users without an admin profile go to
 * /no-access, and an admin whose teams do not reach the screen goes to
 * /restricted.
 */
export async function requireAdmin(permission: Permission): Promise<AdminUser> {
  const access = await getAccess("admin");
  if (access.status === "signed-out") redirect("/sign-in");
  if (access.status !== "ok" || !access.user.adminProfile) {
    redirect("/no-access");
  }
  const admin = access.user as AdminUser;
  if (!may(admin.adminProfile, permission, await isWallActive())) {
    redirect(RESTRICTED_PATH);
  }
  return admin;
}

/**
 * Everything the signed-in admin may do, for choosing which links and
 * buttons to show. Empty when nobody is signed in as an admin.
 */
export async function getPermissions(): Promise<Permission[]> {
  const admin = await signedInAdmin();
  if (!admin) return [];
  return permissionsOf(admin.adminProfile, await isWallActive());
}
