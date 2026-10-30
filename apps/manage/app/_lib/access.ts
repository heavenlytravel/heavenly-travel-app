import "server-only";
import {
  ADMIN_TEAM_LABELS,
  adminLevelOf,
  adminTeamsOf,
  andList,
  fullName,
} from "@repo/db";
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
export function requireAdmin(permission: Permission): Promise<AdminUser> {
  return requireAdminOr(permission, async () => RESTRICTED_PATH);
}

/**
 * As `requireAdmin`, for an address an admin is led to without choosing
 * its screen, the dashboard, where signing in and the logo lead: an admin
 * whose teams do not reach it goes to `elsewhere`, where it starts,
 * rather than being told it is another team's.
 */
export async function requireAdminOr(
  permission: Permission,
  elsewhere: () => Promise<string>,
): Promise<AdminUser> {
  const access = await getAdminAccess(permission);
  if (access.status === "signed-out") redirect("/sign-in");
  if (access.status === "forbidden") redirect("/no-access");
  if (access.status === "restricted") redirect(await elsewhere());
  return access.admin;
}

/**
 * The signed-in admin as the top bar names them: their name, or
 * their email without one, and their level, or their teams. Null when
 * nobody is signed in as an admin.
 */
export async function getPerson(): Promise<{
  name: string;
  role: string;
} | null> {
  const access = await getAccess("admin");
  if (access.status !== "ok") return null;
  const { user } = access;
  if (!user.adminProfile) return null;
  const { level, teams } = user.adminProfile;
  const teamNames = adminTeamsOf(teams).map((team) => ADMIN_TEAM_LABELS[team]);
  return {
    name: fullName(user) || user.email,
    role:
      adminLevelOf(level) === "SUPER"
        ? "Super admin"
        : teamNames.length > 0
          ? andList(teamNames)
          : "No team yet",
  };
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
