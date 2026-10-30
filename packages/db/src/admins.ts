import { logActivity } from "./activity";
import type { Actor } from "./activity-actions";
import { refuse, type Change } from "./change";
import { db } from "./client";
import type { Prisma } from "./generated/prisma/client";
import { adminTeamsOf, type AdminLevel, type AdminTeam } from "./roles";
import { NO_TEAM_ERROR, type StaffAccess } from "./user-input";
import { userSearchWhere } from "./users";

const withUser = {
  include: { user: true },
} satisfies Prisma.AdminProfileDefaultArgs;

export type AdminWithUser = Prisma.AdminProfileGetPayload<typeof withUser>;

const LAST_SUPER_ERROR =
  "This is the only SUPER admin. Promote another SUPER admin first.";

/**
 * Every admin, in the order they were made one, or those a search finds:
 * each word of it in their first name, last name or email.
 */
export function listAdmins(search?: string): Promise<AdminWithUser[]> {
  return db.adminProfile.findMany({
    where: { user: userSearchWhere(search) },
    ...withUser,
    orderBy: { createdAt: "asc" },
  });
}

async function isLastSuper(tx: Prisma.TransactionClient) {
  return (await tx.adminProfile.count({ where: { level: "SUPER" } })) <= 1;
}

/** What the log keeps of a profile: the two fields the wall reads. */
function stateOf(profile: { level: string; teams: string[] }) {
  return { level: profile.level, teams: profile.teams };
}

function sameState(
  a: { level: string; teams: readonly string[] },
  b: { level: string; teams: readonly string[] },
) {
  return (
    a.level === b.level &&
    a.teams.length === b.teams.length &&
    a.teams.every((team, i) => team === b.teams[i])
  );
}

/**
 * Grants admin access to an existing user, or changes the level and teams
 * of an existing admin. There is no sign-up for staff: a person becomes an
 * admin only by being promoted here. At least one SUPER admin always
 * remains, and a REGULAR admin always holds a team. The change is logged
 * against the user, unless nothing changed.
 */
export async function setAdmin(
  actor: Actor,
  email: string,
  level: AdminLevel,
  teams: readonly AdminTeam[],
): Promise<Change> {
  const held = adminTeamsOf(teams);
  if (level !== "SUPER" && held.length === 0) {
    return refuse(NO_TEAM_ERROR, "teams");
  }

  return db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { email },
      include: { adminProfile: true },
    });
    if (!user) {
      return refuse(
        `No account with email ${email}. Create it on the Users page first.`,
        "email",
      );
    }
    const existing = user.adminProfile;
    if (
      existing?.level === "SUPER" &&
      level !== "SUPER" &&
      (await isLastSuper(tx))
    ) {
      return refuse(LAST_SUPER_ERROR, "level");
    }

    const after = { level, teams: held };
    if (!existing) {
      await grantAdmin(tx, actor, user.id, after);
      return { ok: true };
    }
    if (sameState(existing, after)) return { ok: true };

    await tx.adminProfile.update({ where: { userId: user.id }, data: after });
    await logActivity(tx, actor, {
      action: "admin.updated",
      entityId: user.id,
      before: stateOf(existing),
      after,
    });
    return { ok: true };
  });
}

/**
 * Makes an account that is not staff an admin, inside the caller's
 * transaction, and logs the promotion against it: `setAdmin`, and an
 * account created as staff in one go. The access is checked already.
 */
export async function grantAdmin(
  tx: Prisma.TransactionClient,
  actor: Actor,
  userId: string,
  access: StaffAccess,
) {
  const after = { level: access.level, teams: access.teams };
  await tx.adminProfile.create({ data: { userId, ...after } });
  await logActivity(tx, actor, {
    action: "admin.promoted",
    entityId: userId,
    after,
  });
}

/** Removes admin access. The user stays a customer. */
export function revokeAdmin(actor: Actor, userId: string): Promise<Change> {
  return db.$transaction(async (tx) => {
    const profile = await tx.adminProfile.findUnique({ where: { userId } });
    if (!profile) return { ok: true };
    if (profile.level === "SUPER" && (await isLastSuper(tx))) {
      return refuse(LAST_SUPER_ERROR);
    }

    await tx.adminProfile.delete({ where: { userId } });
    await logActivity(tx, actor, {
      action: "admin.revoked",
      entityId: userId,
      before: stateOf(profile),
    });
    return { ok: true };
  });
}
