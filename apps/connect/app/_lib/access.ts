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
