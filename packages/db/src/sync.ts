import type { User as ClerkBackendUser, UserJSON } from "@clerk/nextjs/server";
import { db } from "./client";

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

/** Idempotent: safe to call from the webhook and the first-request fallback. */
export function upsertUserFromClerk(snapshot: ClerkUserSnapshot) {
  const { clerkId, ...fields } = snapshot;
  return db.user.upsert({
    where: { clerkId },
    update: fields,
    create: { clerkId, ...fields },
  });
}

export async function deleteUserFromClerk(clerkId: string) {
  await db.user.deleteMany({ where: { clerkId } });
}
