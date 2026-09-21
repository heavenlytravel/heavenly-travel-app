import { db } from "./client";
import type { Prisma } from "./generated/prisma/client";
import type { AdminLevel } from "./roles";

const withUser = {
  include: { user: true },
} satisfies Prisma.AdminProfileDefaultArgs;

export type AdminWithUser = Prisma.AdminProfileGetPayload<typeof withUser>;

export type AdminChange = { ok: true } | { ok: false; error: string };

const LAST_SUPER_ERROR =
  "This is the only SUPER admin. Promote another SUPER admin first.";

export function listAdmins(): Promise<AdminWithUser[]> {
  return db.adminProfile.findMany({
    ...withUser,
    orderBy: { createdAt: "asc" },
  });
}

async function isLastSuper(tx: Prisma.TransactionClient) {
  return (await tx.adminProfile.count({ where: { level: "SUPER" } })) <= 1;
}

/**
 * Grants admin access to an existing user, or changes the level of an
 * existing admin. There is no sign-up for staff: a person becomes an admin
 * only by being promoted here. At least one SUPER admin always remains.
 */
export function setAdminLevel(
  email: string,
  level: AdminLevel,
): Promise<AdminChange> {
  return db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { email },
      include: { adminProfile: true },
    });
    if (!user) {
      return {
        ok: false,
        error: `No user with email ${email}. They must sign in once first.`,
      };
    }
    if (
      user.adminProfile?.level === "SUPER" &&
      level !== "SUPER" &&
      (await isLastSuper(tx))
    ) {
      return { ok: false, error: LAST_SUPER_ERROR };
    }

    await tx.adminProfile.upsert({
      where: { userId: user.id },
      update: { level },
      create: { userId: user.id, level },
    });
    return { ok: true };
  });
}

/** Removes admin access. The user stays a customer. */
export function revokeAdmin(userId: string): Promise<AdminChange> {
  return db.$transaction(async (tx) => {
    const profile = await tx.adminProfile.findUnique({ where: { userId } });
    if (!profile) return { ok: true };
    if (profile.level === "SUPER" && (await isLastSuper(tx))) {
      return { ok: false, error: LAST_SUPER_ERROR };
    }

    await tx.adminProfile.delete({ where: { userId } });
    return { ok: true };
  });
}
