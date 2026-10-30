import "server-only";
import {
  getConnectAccess,
  type ConnectAccess,
  type ConnectActor,
} from "@repo/db/server";
import { redirect } from "next/navigation";

/** Connect's access, let in or not, for a signed-in visitor. */
export type SignedIn = Exclude<ConnectAccess, { status: "signed-out" }>;
/** A visitor Connect lets in. */
export type LetIn = Extract<ConnectAccess, { status: "ok" }>;

/**
 * First line of every Connect page: the visitor's access, signed-out ones
 * sent to /sign-in. The page renders each other case itself: the screen
 * saying why, or Connect. See docs/261028-fulfilment-vendors-and-connect.md,
 * "Signing up".
 */
export async function requireSignedIn(): Promise<SignedIn> {
  const access = await getConnectAccess();
  if (access.status === "signed-out") redirect("/sign-in");
  return access;
}

/** The driver let in, or null: for server actions, which must not redirect. */
export async function getDriverAccess() {
  const access = await getConnectAccess();
  return access.status === "ok" && access.driver
    ? { user: access.user, driver: access.driver }
    : null;
}

/** The member or driver as the activity log records them. */
export function actorOf(user: { id: string }): ConnectActor {
  return { kind: "connect", userId: user.id };
}

/** An active vendor's member, as Connect's vendor screens and actions read them. */
export type MemberAccess = {
  user: LetIn["user"];
  vendor: LetIn["memberships"][number]["vendor"];
  role: string;
  /** Their own driver row, when they drive for it too: a one-person vendor. */
  driver: LetIn["driver"];
};

/** The vendor a let-in visitor works for, or null when they only drive. Connect shows one vendor's screens. */
export function memberOf(access: LetIn): MemberAccess | null {
  const membership = access.memberships[0];
  return membership
    ? {
        user: access.user,
        vendor: membership.vendor,
        role: membership.role,
        driver: access.driver,
      }
    : null;
}

/** The member let in, or null: for server actions, which must not redirect. */
export async function getMemberAccess(): Promise<MemberAccess | null> {
  const access = await getConnectAccess();
  return access.status === "ok" ? memberOf(access) : null;
}

/** What an action answers a visitor who is not an active vendor's member. */
export const NOT_A_MEMBER = {
  error: "You are not signed in for an active vendor. Reload the page.",
};

/** What the screen shows a member: their vendor's tabs, Team for its owner. */
export function shellMember(member: MemberAccess | null) {
  return member ? { owner: member.role === "owner" } : undefined;
}

/**
 * First line of a vendor's own pages: the member let in. Anyone else goes
 * home, where their screen says where they stand.
 */
export async function requireMember(): Promise<MemberAccess> {
  const access = await requireSignedIn();
  const member = access.status === "ok" ? memberOf(access) : null;
  if (!member) redirect("/~");
  return member;
}
