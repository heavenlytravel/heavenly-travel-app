import "server-only";
import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { db } from "./client";
import type { Prisma } from "./generated/prisma/client";
import { fullName } from "./names";
import { may, type Permission } from "./permissions";
import type { Area } from "./roles";
import { getAccessPolicy } from "./settings";
import { snapshotFromBackendUser, upsertUserFromClerk } from "./sync";
import {
  mayViewAs,
  parseViewAs,
  viewableAccount,
  VIEW_AS_COOKIE,
} from "./view-as";

const withProfiles = {
  include: {
    adminProfile: true,
    driver: {
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            isOurs: true,
            status: true,
            services: true,
          },
        },
      },
    },
    vendorMembers: {
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            isOurs: true,
            status: true,
            services: true,
          },
        },
      },
    },
  },
} satisfies Prisma.UserDefaultArgs;

export type SessionUser = Prisma.UserGetPayload<typeof withProfiles>;

function findUser(clerkId: string) {
  return db.user.findUnique({ where: { clerkId }, ...withProfiles });
}

function findUserById(id: string) {
  return db.user.findUnique({ where: { id }, ...withProfiles });
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
  return may(admin.adminProfile, permission, await getAccessPolicy())
    ? { status: "ok", admin }
    : { status: "restricted", admin };
}

/** A vendor as Connect reads it: whose screens a member or a driver sees. */
export type ConnectVendor = {
  id: string;
  name: string;
  isOurs: boolean;
  status: string;
  /** What it offers, one of `VENDOR_SERVICES`: what it may add (`suppliesIt`). */
  services: string[];
};

/** A SUPER viewing Connect as someone else, read only: who, and as whom. */
export type ViewAs = {
  /** The admin viewing, as the log records them. */
  adminId: string;
  adminName: string;
  /** The account viewed: its name, or its email without one. */
  label: string;
};

/**
 * Connect's access. `user` is whose screens show: the visitor, or the
 * account a SUPER views while `viewAs` is set. Nothing may be written
 * while it is set; Connect's action helpers refuse.
 */
export type ConnectAccess =
  | { status: "signed-out" }
  /** Neither a vendor's member nor a linked driver: the registration form. */
  | { status: "register"; user: SessionUser; viewAs: ViewAs | null }
  /** Their vendor waits for approval, was refused, or is suspended. */
  | {
      status: "pending" | "refused" | "suspended";
      user: SessionUser;
      vendor: ConnectVendor;
      viewAs: ViewAs | null;
    }
  | {
      status: "ok";
      user: SessionUser;
      /** The active vendors they own or work for. */
      memberships: { vendor: ConnectVendor; role: string }[];
      /** Their driver row, when its vendor is active. */
      driver:
        (NonNullable<SessionUser["driver"]> & { vendor: ConnectVendor }) | null;
      viewAs: ViewAs | null;
    };

/**
 * The account a SUPER views, from Connect's cookie, or null: no cookie,
 * one started in another sign-in, the visitor no longer SUPER, or the
 * account gone or not viewable. The cookie names a target and grants
 * nothing; the real session is checked here on every request.
 */
async function viewedAccount(
  me: SessionUser,
  sessionId: string | null,
): Promise<{ user: SessionUser; viewAs: ViewAs } | null> {
  if (!mayViewAs(me)) return null;
  const target = parseViewAs(
    (await cookies()).get(VIEW_AS_COOKIE)?.value,
    sessionId,
  );
  if (!target) return null;
  const user = await findUserById(target.userId);
  if (!user || !viewableAccount(me, user)) return null;
  return {
    user,
    viewAs: {
      adminId: me.id,
      adminName: fullName(me) || me.email,
      label: fullName(user) || user.email,
    },
  };
}

/**
 * The account a SUPER may view in Connect, by id, as /view-as names it
 * before the view starts, or null: the viewer is not SUPER, or the account
 * is gone or not viewable.
 */
export async function getViewAsCandidate(viewer: SessionUser, userId: string) {
  if (!mayViewAs(viewer)) return null;
  const user = await findUserById(userId);
  return user && viewableAccount(viewer, user) ? user : null;
}

/**
 * Who may use Connect, from rows, never a role column: a member (owner or
 * staff) of an active vendor, or the driver of one whose row has this
 * account. Anyone else signed in sees why: the registration form, waiting
 * for approval, not approved, or suspended. Ours has no members; our
 * drivers come in as drivers. Each page asks here and renders each case
 * itself. See docs/261028-fulfilment-vendors-and-connect.md, "Signing up".
 * A SUPER viewing as someone gets that account's access with `viewAs`; see
 * docs/261112-connect-view-as.md. Deduped per request.
 */
export const getConnectAccess = cache(async (): Promise<ConnectAccess> => {
  const { session, user: me } = await getSession();
  if (!me) return { status: "signed-out" };
  const viewed = await viewedAccount(me, session.sessionId);
  const user = viewed?.user ?? me;
  const viewAs = viewed?.viewAs ?? null;
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
      viewAs,
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
    if (vendor) return { status, user, vendor, viewAs };
  }
  return { status: "register", user, viewAs };
});
