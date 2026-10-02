import { guardFor } from "./const-enum";

/** Who manages staff. Which work is theirs is the team, a separate field. */
export const ADMIN_LEVELS = ["SUPER", "REGULAR"] as const;
export type AdminLevel = (typeof ADMIN_LEVELS)[number];
export const isAdminLevel = guardFor(ADMIN_LEVELS);

/** A level this code does not know (a row not migrated yet) reads as REGULAR. */
export function adminLevelOf(level: string): AdminLevel {
  return isAdminLevel(level) ? level : "REGULAR";
}

/** The departments. An admin can hold several; SUPER needs none. */
export const ADMIN_TEAMS = [
  "OPERATION",
  "RESERVATION",
  "SALES",
  "FINANCE",
  "MARKETING",
] as const;
export type AdminTeam = (typeof ADMIN_TEAMS)[number];
export const isAdminTeam = guardFor(ADMIN_TEAMS);
export const ADMIN_TEAM_LABELS: Record<AdminTeam, string> = {
  OPERATION: "Operation",
  RESERVATION: "Reservation",
  SALES: "Sales",
  FINANCE: "Finance",
  MARKETING: "Marketing",
};

/** The known teams among the values, once each, in `ADMIN_TEAMS` order. */
export function adminTeamsOf(teams: readonly unknown[]): AdminTeam[] {
  return ADMIN_TEAMS.filter((team) => teams.includes(team));
}

/** A REGULAR admin with no team reaches only the Dashboard once the wall is on. */
export function needsTeam(admin: { level: string; teams: readonly string[] }) {
  return (
    adminLevelOf(admin.level) !== "SUPER" &&
    adminTeamsOf(admin.teams).length === 0
  );
}

/** Areas of the product a signed-in user may enter. See `getAccess`. */
export const AREAS = ["user", "driver", "partner", "admin"] as const;
export type Area = (typeof AREAS)[number];
