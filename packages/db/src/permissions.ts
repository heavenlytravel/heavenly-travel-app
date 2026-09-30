import type { NextItemStatus } from "./booking-status";
import { adminLevelOf, type AdminTeam } from "./roles";

/**
 * The wall: which teams reach each screen and action. This is the only place
 * the map lives; pages and server actions ask `may`, none holds its own rule.
 * See docs/260930-admin-teams-and-access.md.
 *
 *   "any"   -> every admin, with or without a team
 *   "super" -> SUPER admins only, whether the wall is on or off
 *   teams   -> those teams once the wall is on, every admin while it is off
 */
const RULES = {
  "dashboard.view": "any",
  "bookings.view": ["OPERATION", "RESERVATION", "SALES", "FINANCE"],
  /** Confirm, amend and cancel. */
  "bookings.manage": ["RESERVATION", "SALES"],
  /** Manual booking and price override. */
  "bookings.create": ["RESERVATION", "SALES"],
  /** Assign and complete. */
  "bookings.fulfil": ["OPERATION"],
  "bookings.notes": ["OPERATION", "RESERVATION", "SALES", "FINANCE"],
  /** Zones and vehicle classes. */
  "coverage.manage": ["OPERATION"],
  "admins.manage": "super",
  "wall.switch": "super",
  "activity.view": "super",
} as const satisfies Record<string, "any" | "super" | readonly AdminTeam[]>;

export type Permission = keyof typeof RULES;
export const PERMISSIONS = Object.keys(RULES) as Permission[];

/** What the wall reads of an admin: the two fields of `AdminProfile`. */
export type PermissionHolder = { level: string; teams: readonly string[] };

/** May this admin do this, with the wall on or off. */
export function may(
  admin: PermissionHolder,
  permission: Permission,
  wallActive: boolean,
): boolean {
  if (adminLevelOf(admin.level) === "SUPER") return true;
  const rule: "any" | "super" | readonly AdminTeam[] = RULES[permission];
  if (rule === "super") return false;
  if (rule === "any" || !wallActive) return true;
  return rule.some((team) => admin.teams.includes(team));
}

/** Everything the admin may do right now. */
export function permissionsOf(
  admin: PermissionHolder,
  wallActive: boolean,
): Permission[] {
  return PERMISSIONS.filter((p) => may(admin, p, wallActive));
}

/** Confirming is Reservation and Sales work; assigning and completing is Operation's. */
export const ADVANCE_PERMISSIONS: Record<NextItemStatus, Permission> = {
  confirmed: "bookings.manage",
  assigned: "bookings.fulfil",
  completed: "bookings.fulfil",
};
