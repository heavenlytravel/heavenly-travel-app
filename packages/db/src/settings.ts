import "server-only";
import { cache } from "react";
import { logActivity } from "./activity";
import { APP_SETTING_ID, type Actor } from "./activity-actions";
import { db } from "./client";
import {
  defaultTeamsOf,
  ruleOverridesOf,
  teamsOf,
  TEAM_PERMISSIONS,
  type AccessPolicy,
  type Permission,
  type RuleOverrides,
} from "./permissions";
import type { AdminTeam } from "./roles";

/**
 * The one `AppSetting` row, created by the first write. What the wall
 * reads besides the admin, read once per request in the one query that
 * read the wall alone before: whether it is on (off until a SUPER admin
 * turns it on), and the teams SUPER gave the team rules. See `may` in
 * ./permissions.
 */
export const getAccessPolicy = cache(async (): Promise<AccessPolicy> => {
  const setting = await db.appSetting.findUnique({
    where: { id: APP_SETTING_ID },
  });
  return {
    wallActive: setting?.wallActive ?? false,
    overrides: ruleOverridesOf(setting?.accessRules),
  };
});

/** The same teams in any order. */
function sameTeams(a: readonly AdminTeam[], b: readonly AdminTeam[]) {
  return a.length === b.length && a.every((team) => b.includes(team));
}

/**
 * SUPER sets the teams of every team rule at once, as Admin's Team access
 * posts them. A rule left at its default is stored as none, so a later
 * change of the default in code reaches it. Each rule that changed is
 * logged with its teams before and after; saving what is there logs
 * nothing.
 */
export async function setAccessRules(actor: Actor, wanted: RuleOverrides) {
  await db.$transaction(async (tx) => {
    const setting = await tx.appSetting.findUnique({
      where: { id: APP_SETTING_ID },
    });
    const was = ruleOverridesOf(setting?.accessRules);
    const next: RuleOverrides = {};
    const changed: Permission[] = [];
    for (const permission of TEAM_PERMISSIONS) {
      const teams = wanted[permission] ?? teamsOf(permission, was);
      if (!sameTeams(teams, defaultTeamsOf(permission))) {
        next[permission] = teams;
      }
      if (!sameTeams(teams, teamsOf(permission, was))) changed.push(permission);
    }
    if (changed.length === 0) return;

    await tx.appSetting.upsert({
      where: { id: APP_SETTING_ID },
      update: { accessRules: next },
      create: { id: APP_SETTING_ID, accessRules: next },
    });
    for (const permission of changed) {
      await logActivity(tx, actor, {
        action: "access.rule.changed",
        entityId: APP_SETTING_ID,
        before: { permission, teams: [...teamsOf(permission, was)] },
        after: { permission, teams: [...teamsOf(permission, next)] },
      });
    }
  });
}

/** Flips the wall and logs the flip. Setting it to what it is logs nothing. */
export async function setWallActive(actor: Actor, wallActive: boolean) {
  await db.$transaction(async (tx) => {
    const setting = await tx.appSetting.findUnique({
      where: { id: APP_SETTING_ID },
    });
    const was = setting?.wallActive ?? false;
    if (was === wallActive) return;

    await tx.appSetting.upsert({
      where: { id: APP_SETTING_ID },
      update: { wallActive },
      create: { id: APP_SETTING_ID, wallActive },
    });
    await logActivity(tx, actor, {
      action: "wall.switched",
      entityId: APP_SETTING_ID,
      before: { wallActive: was },
      after: { wallActive },
    });
  });
}
