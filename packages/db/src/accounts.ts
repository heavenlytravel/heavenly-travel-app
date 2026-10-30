import { clerkClient, type User as ClerkUser } from "@clerk/nextjs/server";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { logActivity } from "./activity";
import type { Actor } from "./activity-actions";
import { grantAdmin, setAdmin } from "./admins";
import { refuse, type Change } from "./change";
import { db } from "./client";
import { needsTeam } from "./roles";
import { snapshotFromBackendUser, upsertUserFromClerk } from "./sync";
import {
  NO_TEAM_ERROR,
  type NewUserFields,
  type StaffAccess,
} from "./user-input";
import { findUserByEmail } from "./users";

/** Clerk's names for the fields it refuses, as the create form names them. */
const CLERK_FIELDS: Record<string, keyof NewUserFields> = {
  email_address: "email",
  first_name: "firstName",
  last_name: "lastName",
};

/** The names a person typed for themselves: the last one may be empty. */
type Names = { firstName: string; lastName: string };

/** The Clerk account given the names typed, when it has none of its own. */
async function namedWhenBlank(held: ClerkUser, names: Names) {
  if (held.firstName || held.lastName || !names.firstName) return held;
  const clerk = await clerkClient();
  return clerk.users.updateUser(held.id, {
    firstName: names.firstName,
    lastName: names.lastName || undefined,
  });
}

/** The account in Clerk for the email: the one it holds, its names filled when blank, or a new one. */
async function clerkAccountFor(fields: NewUserFields) {
  const clerk = await clerkClient();
  const {
    data: [held],
  } = await clerk.users.getUserList({ emailAddress: [fields.email], limit: 1 });
  if (!held) {
    const created = await clerk.users.createUser({
      emailAddress: [fields.email],
      firstName: fields.firstName,
      lastName: fields.lastName || undefined,
      skipPasswordRequirement: true,
    });
    return { clerkUser: created, existing: false };
  }
  return { clerkUser: await namedWhenBlank(held, fields), existing: true };
}

/**
 * Creates an account on someone's behalf: in Clerk, with the email
 * verified and no password, so they sign in with a code sent to it, and
 * mirrored into `User` at once, its guest bookings claimed, rather than
 * when the webhook arrives. Nothing is sent to them. An email Clerk
 * already holds as an account's own, its webhook missed, is mirrored as
 * it is there, given the names typed when it has none; one it holds as
 * another account's second address is refused. The phone is ours and
 * stays out of Clerk. With `staff`, the account is made an admin too, in
 * the transaction that logs it. No one is ever given a password here.
 */
export async function createUser(
  actor: Actor,
  fields: NewUserFields,
  staff?: StaffAccess,
): Promise<Change> {
  // Checked before Clerk, so an account is never made and left unpromoted.
  if (staff && needsTeam(staff)) return refuse(NO_TEAM_ERROR, "teams");
  if (await findUserByEmail(fields.email)) {
    return refuse(`${fields.email} already has an account.`, "email");
  }

  let account: Awaited<ReturnType<typeof clerkAccountFor>>;
  try {
    account = await clerkAccountFor(fields);
  } catch (error) {
    if (!isClerkAPIResponseError(error)) throw error;
    const [first] = error.errors;
    return refuse(
      first?.longMessage ?? first?.message ?? error.message,
      CLERK_FIELDS[first?.meta?.paramName ?? ""],
    );
  }
  const { clerkUser, existing } = account;

  const snapshot = snapshotFromBackendUser(clerkUser);
  if (snapshot?.email.toLowerCase() !== fields.email) {
    return refuse(
      `${fields.email} is a second address of another account in Clerk. Use a different email.`,
      "email",
    );
  }
  const user = await upsertUserFromClerk(snapshot);
  await db.$transaction(async (tx) => {
    if (fields.phone) {
      await tx.user.update({
        where: { id: user.id },
        data: { phone: fields.phone },
      });
    }
    await logActivity(tx, actor, {
      action: "user.created",
      entityId: user.id,
      after: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: fields.phone,
        ...(existing ? { existing: true } : {}),
      },
    });
    if (staff) await grantAdmin(tx, actor, user.id, staff);
  });
  return { ok: true };
}

/**
 * Adds a member of staff by email, as Staff's "Add staff" does: an email
 * with an account is promoted, its names left as they are; one without
 * is given an account first, as `createUser` makes it for Customers, and
 * promoted in the same go. Someone on the staff already is refused: their
 * row's Edit changes their level and teams.
 */
export async function addStaff(
  actor: Actor,
  fields: NewUserFields,
  access: StaffAccess,
): Promise<Change> {
  const held = await db.user.findFirst({
    where: { email: { equals: fields.email, mode: "insensitive" } },
    select: { email: true, adminProfile: { select: { userId: true } } },
  });
  if (held?.adminProfile) {
    return refuse(
      `${fields.email} is on the staff already. Use Edit on their row to change their level and teams.`,
      "email",
    );
  }
  if (held) return setAdmin(actor, held.email, access.level, access.teams);
  if (!fields.firstName) {
    return refuse(
      "Enter their first name: no account has this email yet, so one is made.",
      "firstName",
    );
  }
  return createUser(actor, fields, access);
}

/**
 * Keeps on someone's account what they typed about themselves in
 * Connect's registration: the phone, ours, as a booking keeps it; and
 * the names, in Clerk and mirrored here at once, only where the account
 * has none (its own page changes them). Not part of the registration: a
 * failure here leaves it sent.
 */
export async function keepApplicantProfile(
  user: {
    id: string;
    clerkId: string;
    firstName: string | null;
    lastName: string | null;
  },
  fields: Names & { phone: string },
): Promise<void> {
  await db.user.update({
    where: { id: user.id },
    data: { phone: fields.phone },
  });
  // Ours mirrors Clerk's names: named here, named there.
  if (user.firstName || user.lastName || !fields.firstName) return;
  const clerk = await clerkClient();
  const held = await clerk.users.getUser(user.clerkId);
  const named = await namedWhenBlank(held, fields);
  if (named === held) return;
  const snapshot = snapshotFromBackendUser(named);
  if (snapshot) await upsertUserFromClerk(snapshot);
}
