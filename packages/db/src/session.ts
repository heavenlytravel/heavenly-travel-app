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
  include: {
    adminProfile: true,
    driver: {
      include: {
        vendor: {
          select: { id: true, name: true, isOurs: true, status: true },
        },
      },
    },
    vendorMembers: {
      include: {
        vendor: {
          select: { id: true, name: true, isOurs: true, status: true },
        },
      },
    },
  },
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
  | { status: "ok"; user: SessionUser };

/**
 * The access matrix of the customer site and the admin. Pages call this
 * and decide how to render each status themselves (redirect, "no
 * access"). Connect has its own, `getConnectAccess`.
 *
 *   user    -> any signed-in user
 *   admin   -> admin profile
 */
export async function getAccess(area: Area): Promise<Access> {
  const { user } = await getSession();
  if (!user) return { status: "signed-out", user: null };

  switch (area) {
    case "user":
      return { status: "ok", user };
    case "admin":
      return user.adminProfile !== null
        ? { status: "ok", user }
        : { status: "forbidden", user };
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

/** A vendor as Connect reads it: whose screens a member or a driver sees. */
export type ConnectVendor = {
  id: string;
  name: string;
  isOurs: boolean;
  status: string;
};

export type ConnectAccess =
  | { status: "signed-out" }
  /** Neither a vendor's member nor a linked driver: the registration form. */
  | { status: "register"; user: SessionUser }
  /** Their vendor waits for approval, was refused, or is suspended. */
  | {
      status: "pending" | "refused" | "suspended";
      user: SessionUser;
      vendor: ConnectVendor;
    }
  | {
      status: "ok";
      user: SessionUser;
      /** The active vendors they own or work for. */
      memberships: { vendor: ConnectVendor; role: string }[];
      /** Their driver row, when its vendor is active. */
      driver:
        (NonNullable<SessionUser["driver"]> & { vendor: ConnectVendor }) | null;
    };

/**
 * Who may use Connect, from rows, never a role column: a member (owner or
 * staff) of an active vendor, or the driver of one whose row has this
 * account. Anyone else signed in sees why: the registration form, waiting
 * for approval, not approved, or suspended. Ours has no members; our
 * drivers come in as drivers. Each page asks here and renders each case
 * itself. See docs/261028-fulfilment-vendors-and-connect.md, "Signing up".
 */
export async function getConnectAccess(): Promise<ConnectAccess> {
  const { user } = await getSession();
  if (!user) return { status: "signed-out" };
  const memberships = user.vendorMembers.filter(
    (m) => m.vendor.status === "active",
  );
  const driverVendor = user.driver?.vendor ?? null;
  const driver =
    user.driver && driverVendor?.status === "active"
      ? { ...user.driver, vendor: driverVendor }
      : null;
  if (memberships.length > 0 || driver) {
    return {
      status: "ok",
      user,
      memberships: memberships.map((m) => ({ vendor: m.vendor, role: m.role })),
      driver,
    };
  }
  // Not let in: the reason is the vendor they belong to, a suspension
  // first, then a refusal, then a wait.
  const vendors = [
    ...user.vendorMembers.map((m) => m.vendor),
    ...(driverVendor ? [driverVendor] : []),
  ];
  for (const status of ["suspended", "refused", "pending"] as const) {
    const vendor = vendors.find((v) => v.status === status);
    if (vendor) return { status, user, vendor };
  }
  return { status: "register", user };
}
