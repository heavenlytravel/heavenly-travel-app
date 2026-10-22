import { clerkClient } from "@clerk/nextjs/server";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { logActivity } from "./activity";
import type { Actor } from "./activity-actions";
import { refuse, type Change } from "./change";
import { db } from "./client";
import { snapshotFromBackendUser, upsertUserFromClerk } from "./sync";
import type { NewUserFields } from "./user-input";
import { findUserByEmail } from "./users";

/** Clerk's names for the fields it refuses, as the create form names them. */
const CLERK_FIELDS: Record<string, keyof NewUserFields> = {
  email_address: "email",
  first_name: "firstName",
  last_name: "lastName",
};

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
  const named =
    held.firstName || held.lastName
      ? held
      : await clerk.users.updateUser(held.id, {
          firstName: fields.firstName,
          lastName: fields.lastName || undefined,
        });
  return { clerkUser: named, existing: true };
}

/**
 * Creates an account on someone's behalf: in Clerk, with the email
 * verified and no password, so they sign in with a code sent to it, and
 * mirrored into `User` at once, its guest bookings claimed, rather than
 * when the webhook arrives. Nothing is sent to them. An email Clerk
 * already holds as an account's own, its webhook missed, is mirrored as
 * it is there, given the names typed when it has none; one it holds as
 * another account's second address is refused. The phone is ours and
 * stays out of Clerk.
 */
export async function createUser(
  actor: Actor,
  fields: NewUserFields,
): Promise<Change> {
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
  });
  return { ok: true };
}
