import { clerkClient, type User as ClerkUser } from "@clerk/nextjs/server";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { logActivity } from "./activity";
import type { Actor } from "./activity-actions";
import { grantAdmin, setAdmin } from "./admins";
import { refuse, type Change, type Created, type Refusal } from "./change";
import { db } from "./client";
import type { Prisma } from "./generated/prisma/client";
import { needsTeam } from "./roles";
import {
  deleteUserFromClerk,
  snapshotFromBackendUser,
  upsertUserFromClerk,
} from "./sync";
import {
  NO_TEAM_ERROR,
  type NewUserFields,
  type UserProfileFields,
  type StaffAccess,
} from "./user-input";
import { findUserByEmail } from "./users";

/** Clerk's names for the fields it refuses, as the create form names them. */
const CLERK_FIELDS: Record<string, keyof NewUserFields> = {
  email_address: "email",
  first_name: "firstName",
  last_name: "lastName",
  password: "password",
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

/**
 * The account in Clerk for the email: the one it holds, its names filled
 * when blank, or a new one (`made`), with the email verified and the
 * password typed, or none.
 */
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
      ...(fields.password
        ? { password: fields.password }
        : { skipPasswordRequirement: true }),
    });
    return { clerkUser: created, made: true };
  }
  // A password typed for it is refused next: its names stay as they are.
  if (fields.password) return { clerkUser: held, made: false };
  return { clerkUser: await namedWhenBlank(held, fields), made: false };
}

/** A password typed for an email whose account exists: it is theirs to set. */
function keepsOwnPassword(email: string): Refusal {
  return refuse(
    `${email} has an account already, which keeps its own way to sign in. Leave the password empty.`,
    "password",
  );
}

/** The account a form gives someone, for the change it is part of. */
export type GivenAccount = {
  userId: string;
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  /** The phone typed, which a new account keeps. */
  phone: string | null;
  /** Mirrored here by this form: the change logs its creation. */
  isNew: boolean;
  /** Made in Clerk by this form, so undone when the change is refused. */
  made: boolean;
};

/**
 * The account for an email: the one held here, or the one Clerk holds,
 * its webhook missed, mirrored now, or a new one made in Clerk and
 * mirrored at once, its guest bookings claimed and its driver row linked
 * (./sync). One Clerk holds as another account's second address is
 * refused, and so is a password typed for an account that exists. A new
 * one needs a first name; an existing one keeps its own names.
 */
async function accountFor(
  fields: NewUserFields,
): Promise<{ ok: true; account: GivenAccount } | Refusal> {
  const held = await db.user.findFirst({
    where: { email: { equals: fields.email, mode: "insensitive" } },
  });
  if (held) {
    if (fields.password) return keepsOwnPassword(held.email);
    return {
      ok: true,
      account: { ...accountOf(held), phone: null, isNew: false, made: false },
    };
  }
  if (!fields.firstName) {
    return refuse(
      "Enter their first name: no account has this email yet, so one is made.",
      "firstName",
    );
  }
  let found: Awaited<ReturnType<typeof clerkAccountFor>>;
  try {
    found = await clerkAccountFor(fields);
  } catch (error) {
    if (!isClerkAPIResponseError(error)) throw error;
    const [first] = error.errors;
    return refuse(
      first?.longMessage ?? first?.message ?? error.message,
      CLERK_FIELDS[first?.meta?.paramName ?? ""],
    );
  }
  if (!found.made && fields.password) return keepsOwnPassword(fields.email);
  const snapshot = snapshotFromBackendUser(found.clerkUser);
  if (snapshot?.email.toLowerCase() !== fields.email) {
    return refuse(
      `${fields.email} is a second address of another account in Clerk. Use a different email.`,
      "email",
    );
  }
  const user = await upsertUserFromClerk(snapshot);
  return {
    ok: true,
    account: {
      ...accountOf(user),
      phone: fields.phone,
      isNew: true,
      made: found.made,
    },
  };
}

function accountOf(user: {
  id: string;
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}) {
  return {
    userId: user.id,
    clerkId: user.clerkId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

/**
 * Runs a change that gives someone the account for an email: a driver's,
 * a vendor's owner, an admin. A new account is made first, outside the
 * change's transaction since Clerk is not in it, and undone, in Clerk and
 * here, when the change is refused or throws: a refused form leaves no
 * account behind. The change logs a new account with `keepNewAccount`.
 * See docs/261102-direct-accounts.md.
 */
export async function withAccount<R extends Change | Created>(
  fields: NewUserFields,
  change: (account: GivenAccount) => Promise<R>,
): Promise<R | Refusal> {
  const given = await accountFor(fields);
  if (!given.ok) return given;
  let result: R;
  try {
    result = await change(given.account);
  } catch (error) {
    await undoAccount(given.account);
    throw error;
  }
  if (!result.ok) await undoAccount(given.account);
  return result;
}

/**
 * A new account a refused change made, removed again; one Clerk held
 * before stays, mirrored. Never throws, so the change's own refusal or
 * error is the one the form sees: a failure is logged, the account left.
 */
async function undoAccount(account: GivenAccount) {
  if (!account.made) return;
  try {
    const clerk = await clerkClient();
    await clerk.users.deleteUser(account.clerkId);
    await deleteUserFromClerk(account.clerkId);
  } catch (error) {
    console.error(`[accounts] could not undo ${account.email}:`, error);
  }
}

/**
 * What an account was made for, as its creation's entry keeps it
 * (`madeFor`): a driver, or a vendor it owns or works for. Only an
 * account made for that record goes with it (`deleteAccountIfUnused`).
 */
export type MadeFor = `driver:${string}` | `vendor:${string}`;

/**
 * Inside the change's transaction: a new account keeps the phone typed
 * (ours, not Clerk's) and its creation is logged, with the record it was
 * made for when it is a driver's or a vendor's (`madeFor`). An account
 * held before is left as it is.
 */
export async function keepNewAccount(
  tx: Prisma.TransactionClient,
  actor: Actor,
  account: GivenAccount,
  madeFor?: MadeFor,
) {
  if (!account.isNew) return;
  if (account.phone) {
    await tx.user.update({
      where: { id: account.userId },
      data: { phone: account.phone },
    });
  }
  await logActivity(tx, actor, {
    action: "user.created",
    entityId: account.userId,
    after: {
      email: account.email,
      firstName: account.firstName,
      lastName: account.lastName,
      phone: account.phone,
      ...(account.made ? {} : { existing: true }),
      ...(madeFor ? { madeFor } : {}),
    },
  });
}

/**
 * Deletes an account no one has used, in Clerk and here: the one a typo
 * made when a driver or a vendor's owner or staff was entered, once the
 * driver is deleted or the member removed. Only an account made in Clerk
 * for that very record (`madeFor`, kept by `keepNewAccount`) can go: an
 * account someone had before, even one never used, always stays. Used is
 * signed in once, or holding anything: a booking, a note, staff access, a
 * vendor, a driver. A used account is left as it is, and so is one Clerk
 * fails to answer for. Answers whether it was deleted.
 */
export async function deleteAccountIfUnused(
  actor: Actor,
  userId: string,
  madeFor: MadeFor,
): Promise<boolean> {
  const created = await db.activityLog.findFirst({
    where: {
      action: "user.created",
      entityId: userId,
      after: { path: ["madeFor"], equals: madeFor },
    },
    select: { after: true },
  });
  // Made in Clerk here: one Clerk held before, only mirrored, says `existing`.
  const after = created?.after;
  const madeHere =
    after !== null &&
    typeof after === "object" &&
    !Array.isArray(after) &&
    after.existing !== true;
  if (!madeHere) return false;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      clerkId: true,
      email: true,
      adminProfile: { select: { id: true } },
      driver: { select: { id: true } },
      _count: {
        select: { vendorMembers: true, bookings: true, bookingNotes: true },
      },
    },
  });
  if (!user || user.adminProfile || user.driver) return false;
  if (Object.values(user._count).some((count) => count > 0)) return false;
  try {
    const clerk = await clerkClient();
    const held = await clerk.users.getUser(user.clerkId);
    if (held.lastSignInAt !== null) return false;
    await clerk.users.deleteUser(user.clerkId);
  } catch (error) {
    // Gone from Clerk already: only the row here is left to delete.
    if (!isClerkAPIResponseError(error) || error.status !== 404) {
      console.error(`[accounts] could not delete ${user.email}:`, error);
      return false;
    }
  }
  await db.$transaction(async (tx) => {
    await tx.user.deleteMany({ where: { id: userId } });
    await logActivity(tx, actor, {
      action: "user.deleted",
      entityId: userId,
      before: { email: user.email },
    });
  });
  return true;
}

/**
 * Creates an account on someone's behalf, as `withAccount` gives one:
 * in Clerk with the email verified, and the password typed or none, so
 * they sign in with a code sent to it. Nothing is sent to them. An email
 * with an account here is refused. With `staff`, the account is made an
 * admin too, in the transaction that logs it.
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
  return withAccount(fields, (account) =>
    db.$transaction(async (tx) => {
      await keepNewAccount(tx, actor, account);
      if (staff) await grantAdmin(tx, actor, account.userId, staff);
      return { ok: true } as const;
    }),
  );
}

/**
 * Adds a member of staff by email, as Admin's "Add admin" does: an email
 * with an account is promoted, its names left as they are; one without
 * is given an account first, as `createUser` makes it for All Users, and
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
  if (held) {
    if (fields.password) return keepsOwnPassword(held.email);
    return setAdmin(actor, held.email, access.level, access.teams);
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

/** Clerk's refusal as a form's, on the field it names; anything else is thrown. */
function clerkRefusal(error: unknown, field?: string): Change {
  if (!isClerkAPIResponseError(error)) throw error;
  const [first] = error.errors;
  return refuse(first?.longMessage ?? first?.message ?? error.message, field);
}

/** The account and its Clerk id, or a refusal when it is gone. */
async function heldUser(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      clerkId: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
    },
  });
}

const GONE = refuse("This account is gone. Go back to All Users.");

/**
 * Changes an account's names, in Clerk and mirrored here at once, and its
 * phone, ours. Logged with the fields before and after when anything
 * changed.
 */
export async function updateUserProfile(
  actor: Actor,
  userId: string,
  fields: UserProfileFields,
): Promise<Change> {
  const user = await heldUser(userId);
  if (!user) return GONE;
  const before = {
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    phone: user.phone,
  };
  const after = { ...fields };
  if (
    before.firstName === after.firstName &&
    before.lastName === after.lastName &&
    before.phone === after.phone
  ) {
    return { ok: true };
  }

  if (
    before.firstName !== after.firstName ||
    before.lastName !== after.lastName
  ) {
    try {
      const clerk = await clerkClient();
      const updated = await clerk.users.updateUser(user.clerkId, {
        firstName: after.firstName,
        lastName: after.lastName,
      });
      const snapshot = snapshotFromBackendUser(updated);
      if (snapshot) await upsertUserFromClerk(snapshot);
    } catch (error) {
      return clerkRefusal(error, "firstName");
    }
  }
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { phone: after.phone },
    });
    await logActivity(tx, actor, {
      action: "user.updated",
      entityId: user.id,
      before,
      after,
    });
  });
  return { ok: true };
}

/**
 * Changes the email an account signs in with: Clerk takes the new one as
 * verified and primary, and drops the others, so the account keeps one
 * email, as it was made with; their driver row, if any, takes it too.
 * Nothing is sent to either address. An email another account, another
 * driver or another guide holds, here or in Clerk, is refused.
 */
export async function changeUserEmail(
  actor: Actor,
  userId: string,
  email: string,
): Promise<Change> {
  const user = await heldUser(userId);
  if (!user) return GONE;
  if (user.email.toLowerCase() === email) return { ok: true };
  const other = await findUserByEmail(email);
  if (other && other.id !== user.id) {
    return refuse(`${email} is another account's email.`, "email");
  }
  const driver = await db.driver.findFirst({
    where: { email, NOT: { userId: user.id } },
    select: { name: true },
  });
  if (driver) {
    return refuse(
      `${email} is the driver ${driver.name}'s email. Each driver signs in with their own.`,
      "email",
    );
  }
  // A guide profile follows the account's email, so another guide's is taken.
  const guide = await db.guide.findFirst({
    where: { email, NOT: { email: user.email.toLowerCase() } },
    select: { name: true },
  });
  if (guide) {
    return refuse(
      `${email} is the tour guide ${guide.name}'s email. Each account has one guide profile.`,
      "email",
    );
  }

  try {
    const clerk = await clerkClient();
    const added = await clerk.emailAddresses.createEmailAddress({
      userId: user.clerkId,
      emailAddress: email,
      verified: true,
      primary: true,
    });
    const held = await clerk.users.getUser(user.clerkId);
    for (const old of held.emailAddresses) {
      if (old.id !== added.id) {
        await clerk.emailAddresses.deleteEmailAddress(old.id);
      }
    }
    const snapshot = snapshotFromBackendUser(
      await clerk.users.getUser(user.clerkId),
    );
    if (snapshot) await upsertUserFromClerk(snapshot);
  } catch (error) {
    return clerkRefusal(error, "email");
  }
  await db.$transaction(async (tx) => {
    // Their driver row keeps the email they sign in with: it is locked
    // on the driver's form, and changes here.
    await tx.driver.updateMany({ where: { userId: user.id }, data: { email } });
    // And a guide profile it sees as its own follows the account.
    await tx.guide.updateMany({
      where: { email: user.email.toLowerCase() },
      data: { email },
    });
    await logActivity(tx, actor, {
      action: "user.email.changed",
      entityId: user.id,
      before: { email: user.email },
      after: { email },
    });
  });
  return { ok: true };
}

/**
 * Sets an account's password in Clerk, which checks it as it checks one
 * typed at sign-up, and signs the account out everywhere, so only the new
 * password opens it. The password is never stored or logged here.
 */
export async function setUserPassword(
  actor: Actor,
  userId: string,
  password: string,
): Promise<Change> {
  const user = await heldUser(userId);
  if (!user) return GONE;
  try {
    const clerk = await clerkClient();
    await clerk.users.updateUser(user.clerkId, {
      password,
      signOutOfOtherSessions: true,
    });
  } catch (error) {
    return clerkRefusal(error, "password");
  }
  await logActivity(db, actor, {
    action: "user.password.set",
    entityId: user.id,
  });
  return { ok: true };
}
