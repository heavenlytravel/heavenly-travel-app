import { logActivity } from "./activity";
import type { Actor } from "./activity-actions";
import { db } from "./client";
import type { Prisma } from "./generated/prisma/client";
import { adminTeamsOf, type AdminLevel, type AdminTeam } from "./roles";

const withUser = {
  include: { user: true },
} satisfies Prisma.AdminProfileDefaultArgs;

export type AdminWithUser = Prisma.AdminProfileGetPayload<typeof withUser>;

export type AdminChange = { ok: true } | { ok: false; error: string };

const LAST_SUPER_ERROR =
  "This is the only SUPER admin. Promote another SUPER admin first.";
const NO_TEAM_ERROR = "A REGULAR admin needs at least one team.";

export function listAdmins(): Promise<AdminWithUser[]> {
  return db.adminProfile.findMany({
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
): Promise<AdminChange> {
  const held = adminTeamsOf(teams);
  if (level !== "SUPER" && held.length === 0) {
    return { ok: false, error: NO_TEAM_ERROR };
  }

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
    const existing = user.adminProfile;
    if (
      existing?.level === "SUPER" &&
      level !== "SUPER" &&
      (await isLastSuper(tx))
    ) {
      return { ok: false, error: LAST_SUPER_ERROR };
    }

    const after = { level, teams: held };
    if (existing && sameState(existing, after)) return { ok: true };

    await tx.adminProfile.upsert({
      where: { userId: user.id },
      update: after,
      create: { userId: user.id, ...after },
    });
    await logActivity(
      tx,
      actor,
      existing
        ? {
            action: "admin.updated",
            entityId: user.id,
            before: stateOf(existing),
            after,
          }
        : { action: "admin.promoted", entityId: user.id, after },
    );
    return { ok: true };
  });
}

/** Removes admin access. The user stays a customer. */
export function revokeAdmin(
  actor: Actor,
  userId: string,
): Promise<AdminChange> {
  return db.$transaction(async (tx) => {
    const profile = await tx.adminProfile.findUnique({ where: { userId } });
    if (!profile) return { ok: true };
    if (profile.level === "SUPER" && (await isLastSuper(tx))) {
      return { ok: false, error: LAST_SUPER_ERROR };
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
