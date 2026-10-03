import "server-only";
import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "./client";
import type { Prisma } from "./generated/prisma/client";
import { may, type Permission } from "./permissions";
import type { Area } from "./roles";
import { isWallActive } from "./settings";
import { snapshotFromBackendUser, upsertUserFromClerk } from "./sync";

const withProfiles = {
  include: { adminProfile: true, driverProfile: true, partnerProfile: true },
} satisfies Prisma.UserDefaultArgs;

export type SessionUser = Prisma.UserGetPayload<typeof withProfiles>;

function findUser(clerkId: string) {
  return db.user.findUnique({ where: { clerkId }, ...withProfiles });
}

/**
 * Clerk session plus our `User` row (with all role profiles), deduped per
 * request. If Clerk knows the user but the webhook has not written the row
 * yet, the row is created here so sign-in never depends on webhook delivery.
 */
export const getSession = cache(async () => {
  const session = await auth();
  if (!session.userId) return { session, user: null };

  let user = await findUser(session.userId);
  if (!user) {
    const clerkUser = await currentUser();
    const snapshot = clerkUser ? snapshotFromBackendUser(clerkUser) : null;
    if (snapshot) {
      await upsertUserFromClerk(snapshot);
      user = await findUser(session.userId);
    }
  }
  return { session, user };
});

export type Access =
  | { status: "signed-out"; user: null }
  /** Signed in but holds no profile for this area. */
  | { status: "forbidden"; user: SessionUser }
  /** Holds the profile but it has not been approved yet. */
  | { status: "pending"; user: SessionUser }
  | { status: "ok"; user: SessionUser };

/**
 * The single place the access matrix lives. Pages call this and decide how
 * to render each status themselves (redirect, "no access", pending screen).
 *
 *   user    -> any signed-in user
 *   driver  -> active driver profile, or any admin
 *   partner -> active partner profile, or any admin
 *   admin   -> admin profile
 */
export async function getAccess(area: Area): Promise<Access> {
  const { user } = await getSession();
  if (!user) return { status: "signed-out", user: null };

  const isAdmin = user.adminProfile !== null;
  switch (area) {
    case "user":
      return { status: "ok", user };
    case "admin":
      return isAdmin ? { status: "ok", user } : { status: "forbidden", user };
    case "driver":
      return gateProfile(user, isAdmin, user.driverProfile);
    case "partner":
      return gateProfile(user, isAdmin, user.partnerProfile);
  }
}

/** A signed-in user who holds an admin profile. */
export type AdminUser = SessionUser & {
  adminProfile: NonNullable<SessionUser["adminProfile"]>;
};

export type AdminAccess =
  | { status: "signed-out" }
  /** Signed in with no admin profile. */
  | { status: "forbidden" }
  /** An admin whose teams do not reach the permission. */
  | { status: "restricted"; admin: AdminUser }
  | { status: "ok"; admin: AdminUser };

/**
 * Whether the visitor is a signed-in admin who holds the permission. The
 * console's screens and the customer site's staff preview both ask here,
 * and each decides what the other statuses see.
 */
export async function getAdminAccess(
  permission: Permission,
): Promise<AdminAccess> {
  const access = await getAccess("admin");
  if (access.status === "signed-out") return { status: "signed-out" };
  if (access.status !== "ok" || !access.user.adminProfile) {
    return { status: "forbidden" };
  }
  const admin = access.user as AdminUser;
  return may(admin.adminProfile, permission, await isWallActive())
    ? { status: "ok", admin }
    : { status: "restricted", admin };
}

function gateProfile(
  user: SessionUser,
  isAdmin: boolean,
  profile: { isActive: boolean } | null,
): Access {
  if (isAdmin) return { status: "ok", user };
  if (!profile) return { status: "forbidden", user };
  if (!profile.isActive) return { status: "pending", user };
  return { status: "ok", user };
}
