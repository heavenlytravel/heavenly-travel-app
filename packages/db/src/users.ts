import { db } from "./client";

/** Readers of the `User` table beyond the session's own. */

/**
 * The account behind an email, if any, so a booking staff enter can show
 * under the customer's My bookings. Clerk stores emails in lower case; the
 * match ignores case so a typed address still finds it.
 */
export async function findUserByEmail(
  email: string,
): Promise<{ id: string } | null> {
  const trimmed = email.trim();
  if (!trimmed) return null;
  return db.user.findFirst({
    where: { email: { equals: trimmed, mode: "insensitive" } },
    select: { id: true },
  });
}
