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

/** Where an account has access beyond the customer site: Manage, and Connect as a vendor's member or driver. */
const access = {
  adminProfile: { select: { level: true, teams: true } },
  vendorMembers: {
    select: { role: true, vendor: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  },
  driver: {
    select: {
      id: true,
      location: { select: { slug: true } },
      vendor: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.UserInclude;

const listed = { include: access } satisfies Prisma.UserDefaultArgs;

export type ListedUser = Prisma.UserGetPayload<typeof listed>;

/**
 * A page of every account, the newest first, or of those a search finds,
 * with the number of them all; each with where it has access: its admin
 * level, and the vendors it works or drives for in Connect.
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

/** One account as All Users opens it: its profile, where it has access, and how many bookings it holds. */
export type UserDetails = ListedUser & { bookingCount: number };

export async function getUserDetails(id: string): Promise<UserDetails | null> {
  const user = await db.user.findUnique({
    where: { id },
    include: { ...access, _count: { select: { bookings: true } } },
  });
  if (!user) return null;
  const { _count, ...rest } = user;
  return { ...rest, bookingCount: _count.bookings };
}
