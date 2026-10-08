import type { User as ClerkBackendUser, UserJSON } from "@clerk/nextjs/server";
import { db } from "./client";
import type { Prisma, User } from "./generated/prisma/client";
import { isUniqueViolation } from "./prisma-errors";

/** The subset of a Clerk user we mirror into the `User` table. */
export interface ClerkUserSnapshot {
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
}

/** Shape of `user.*` webhook payloads (snake_case). */
export function snapshotFromWebhook(data: UserJSON): ClerkUserSnapshot | null {
  const primary = data.email_addresses.find(
    (e) => e.id === data.primary_email_address_id,
  );
  if (!primary) return null;
  return {
    clerkId: data.id,
    email: primary.email_address,
    firstName: data.first_name,
    lastName: data.last_name,
    imageUrl: data.image_url,
  };
}

/** Shape returned by `currentUser()` / the Backend API (camelCase). */
export function snapshotFromBackendUser(
  user: ClerkBackendUser,
): ClerkUserSnapshot | null {
  const primary = user.emailAddresses.find(
    (e) => e.id === user.primaryEmailAddressId,
  );
  if (!primary) return null;
  return {
    clerkId: user.id,
    email: primary.emailAddress,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
  };
}

/**
 * Gives the new account the guest bookings made with its email, which
 * Clerk has just verified with a code. Runs once, inside the transaction
 * that inserts the `User` row, and never again: a guest who books later
 * with the same email stays unlinked until they sign in to book. The
 * account's saved phone is left alone. See docs/261008-guest-booking.md,
 * "Claim: one query at one moment".
 */
function claimGuestBookings(tx: Prisma.TransactionClient, user: User) {
  return tx.booking.updateMany({
    where: { userId: null, contactEmail: user.email },
    data: { userId: user.id },
  });
}

/**
 * Mirrors a Clerk user into the `User` table: the row is updated when it
 * exists and created, with its guest bookings claimed, when it does not.
 * Idempotent, so the webhook and the first signed-in request may both call
 * it: when they race, the loser's insert fails on the unique Clerk id and
 * it updates the row the winner made, whose claim already ran.
 */
export async function upsertUserFromClerk(
  snapshot: ClerkUserSnapshot,
): Promise<User> {
  const { clerkId, ...fields } = snapshot;
  const update = () => db.user.update({ where: { clerkId }, data: fields });

  const existing = await db.user.findUnique({ where: { clerkId } });
  if (existing) return update();
  try {
    return await db.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { clerkId, ...fields } });
      await claimGuestBookings(tx, user);
      return user;
    });
  } catch (error) {
    if (!isUniqueViolation(error, "clerkId")) throw error;
    return update();
  }
}

export async function deleteUserFromClerk(clerkId: string) {
  await db.user.deleteMany({ where: { clerkId } });
}
