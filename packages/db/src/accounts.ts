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

/**
 * Creates an account on someone's behalf: in Clerk, with the email
 * verified and no password, so they sign in with a code sent to it, and
 * mirrored into `User` at once, its guest bookings claimed, rather than
 * when the webhook arrives. Nothing is sent to them. An email Clerk
 * already holds, its webhook missed, is mirrored as it is there. The
 * phone is ours and stays out of Clerk.
 */
export async function createUser(
  actor: Actor,
  fields: NewUserFields,
): Promise<Change> {
  if (await findUserByEmail(fields.email)) {
    return refuse(`${fields.email} already has an account.`, "email");
  }

  const clerk = await clerkClient();
  const {
    data: [existing],
  } = await clerk.users.getUserList({ emailAddress: [fields.email], limit: 1 });
  let clerkUser = existing;
  if (!clerkUser) {
    try {
      clerkUser = await clerk.users.createUser({
        emailAddress: [fields.email],
        firstName: fields.firstName,
        lastName: fields.lastName || undefined,
        skipPasswordRequirement: true,
      });
    } catch (error) {
      if (!isClerkAPIResponseError(error)) throw error;
      const [first] = error.errors;
      return refuse(
        first?.longMessage ?? first?.message ?? error.message,
        CLERK_FIELDS[first?.meta?.paramName ?? ""],
      );
    }
  }

  const snapshot = snapshotFromBackendUser(clerkUser);
  if (!snapshot) {
    return refuse("Clerk holds this account without an email.", "email");
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
