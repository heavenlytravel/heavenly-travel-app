import { db } from "./client";
import type { Prisma } from "./generated/prisma/client";

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

/** The users a search finds: each word of it in their first name, last name or email. */
export function userSearchWhere(search?: string): Prisma.UserWhereInput {
  const words = search ? search.split(" ") : [];
  return {
    AND: words.map((word) => ({
      OR: [
        { firstName: { contains: word, mode: "insensitive" } },
        { lastName: { contains: word, mode: "insensitive" } },
        { email: { contains: word, mode: "insensitive" } },
      ],
    })),
  };
}

const listed = {
  include: { adminProfile: { select: { level: true } } },
} satisfies Prisma.UserDefaultArgs;

export type ListedUser = Prisma.UserGetPayload<typeof listed>;

/**
 * A page of every account, the newest first, or of those a search finds,
 * with the number of them all; each with its admin level when it is staff.
 */
export async function listUsers({
  search,
  take,
  skip,
}: {
  search?: string;
  take: number;
  skip: number;
}): Promise<{ users: ListedUser[]; total: number }> {
  const where = userSearchWhere(search);
  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      ...listed,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take,
      skip,
    }),
    db.user.count({ where }),
  ]);
  return { users, total };
}
