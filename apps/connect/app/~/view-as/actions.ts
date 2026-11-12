"use server";

import {
  connectViewAsPath,
  formatViewAs,
  VIEW_AS_COOKIE,
  VIEW_AS_PATH,
} from "@repo/db";
import {
  getConnectAccess,
  getSession,
  getViewAsCandidate,
  logViewAs,
} from "@repo/db/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { HOME_PATH } from "../../_ui/nav";

/**
 * Starting and ending a SUPER's read-only view of Connect as a vendor's
 * member or a driver. The cookie names the account and the admin's
 * sign-in, nothing else: the session checks the admin is still SUPER, in
 * the same sign-in, on every request. It lasts until Exit, the browser
 * closing, or the admin signing out. See docs/261112-connect-view-as.md.
 */

/** Starts the view, from a row of the View as list or the page a console link opens: a POST, so a link alone never starts one. */
export async function startViewAsAction(userId: string): Promise<void> {
  const { session, user: me } = await getSession();
  if (!me || !session.sessionId) redirect("/sign-in");
  const target =
    typeof userId === "string" ? await getViewAsCandidate(me, userId) : null;
  // Its page says why it cannot start.
  if (!target) redirect(connectViewAsPath(String(userId)));
  const actor = { kind: "admin" as const, userId: me.id };
  // Viewing someone else already: that view ends here.
  const access = await getConnectAccess();
  if (access.status !== "signed-out" && access.viewAs) {
    if (access.user.id === target.id) redirect(HOME_PATH);
    await logViewAs(actor, access.user.id, "ended");
  }
  await logViewAs(actor, target.id, "started");
  // No expiry: a browser-session cookie, gone when the browser closes.
  (await cookies()).set(
    VIEW_AS_COOKIE,
    formatViewAs({ userId: target.id, sessionId: session.sessionId }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
  );
  redirect(HOME_PATH);
}

/** Ends the view, from the banner's Exit, and goes back to the View as list. */
export async function exitViewAsAction(): Promise<void> {
  const access = await getConnectAccess();
  (await cookies()).delete(VIEW_AS_COOKIE);
  if (access.status !== "signed-out" && access.viewAs) {
    await logViewAs(
      { kind: "admin", userId: access.viewAs.adminId },
      access.user.id,
      "ended",
    );
  }
  redirect(VIEW_AS_PATH);
}
