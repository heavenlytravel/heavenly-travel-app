import { adminLevelOf } from "./roles";

/**
 * Viewing Connect as a vendor's member or a driver, read only, for SUPER:
 * the cookie's name and form, and who may. Browser-safe. The session reads
 * it in `getConnectAccess`; Connect's /view-as starts it. See
 * docs/261112-connect-view-as.md.
 */

/** The cookie on Connect's host that names whose account is viewed. It grants nothing alone. */
export const VIEW_AS_COOKIE = "connect.view-as";

/** Connect's list of the accounts a SUPER may view as, and where Exit returns. */
export const VIEW_AS_PATH = "/~/view-as";

/**
 * What the cookie holds: the viewed account, and the admin's sign-in it
 * was started in. A new sign-in never takes up an old view.
 */
export type ViewAsTarget = { userId: string; sessionId: string };

/** The cookie's value: `<userId>.<Clerk session id>`. */
export function formatViewAs(target: ViewAsTarget): string {
  return `${target.userId}.${target.sessionId}`;
}

/**
 * The cookie's target while the sign-in it was started in lasts, or null:
 * missing, malformed, or from another sign-in.
 */
export function parseViewAs(
  value: string | undefined,
  sessionId: string | null | undefined,
): ViewAsTarget | null {
  const match = /^([a-z0-9]{1,64})\.([A-Za-z0-9_]{1,128})$/.exec(value ?? "");
  if (!match || !sessionId || match[2] !== sessionId) return null;
  return { userId: match[1]!, sessionId };
}

/** Who may view as someone in Connect: SUPER alone for now. */
export function mayViewAs(user: {
  adminProfile: { level: string } | null;
}): boolean {
  return (
    user.adminProfile !== null &&
    adminLevelOf(user.adminProfile.level) === "SUPER"
  );
}

/**
 * Whether the account may be viewed: anyone else's, an admin's too, as
 * the view is read only and Connect grants nothing for being an admin.
 * Never one's own.
 */
export function viewableAccount(
  viewer: { id: string },
  target: { id: string },
): boolean {
  return target.id !== viewer.id;
}
