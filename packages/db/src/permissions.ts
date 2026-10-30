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
  /** The day's bookings and trips. An admin without it starts on the first page of its menu: Pages, for Marketing and SEO. */
  "dashboard.view": ["OPERATION", "RESERVATION", "SALES", "FINANCE"],
  "bookings.view": ["OPERATION", "RESERVATION", "SALES", "FINANCE"],
  /** Confirm, amend and cancel. */
  "bookings.manage": ["RESERVATION", "SALES"],
  /** Manual booking and price override. */
  "bookings.create": ["RESERVATION", "SALES"],
  /** Assign and complete. */
  "bookings.fulfil": ["OPERATION"],
  "bookings.notes": ["OPERATION", "RESERVATION", "SALES", "FINANCE"],
  /** Change a location's coverage, the classes it sells, its zones and its rates; the class catalogue. */
  "coverage.manage": ["OPERATION"],
  /** Read them: the same tabs and the catalogue, without a way to change them. */
  "coverage.view": ["OPERATION", "RESERVATION", "SALES"],
  /** Vendors, ours included, and their vehicles and drivers: read, add and change them. Operation assigns them. */
  "fleet.manage": ["OPERATION"],
  /** Approve or refuse a vendor that signed up, suspend or reinstate one, and switch one to ours. */
  "vendors.review": "super",
  /** Open a location and read its overview. Every team works inside one. */
  "locations.view": "any",
  /** A location's details and its saved addresses. */
  "locations.manage": ["MARKETING"],
  /** Add a location: a draft, which its checklist takes from there. */
  "locations.create": "super",
  /** A location's pages: write, preview, publish and unpublish them, add and order a section's pages, upload their images. */
  "pages.manage": ["MARKETING", "SEO"],
  /** The customer site's own pages (the home page, about us, the legal pages, the footer) and the home page's top choices. */
  "website.manage": ["MARKETING", "SEO"],
  /** Take a location live, pause it, resume it, delete it. */
  "locations.activate": "super",
  /**
   * Settings, for an admin who holds the key of one of its cards
   * (`SETTINGS_CARDS`): Marketing's details, Operation's time between
   * jobs, SUPER's status. A test keeps the teams to theirs.
   */
  "settings.view": ["MARKETING", "OPERATION"],
  "admins.manage": "super",
  /** Every account: list them and create one on someone's behalf. */
  "users.manage": "super",
  "wall.switch": "super",
  /** Activity, under `~` and a location: the entries of the areas the admin holds, `activityAreasHeld`. */
  "activity.view": "any",
  /**
   * Every uploaded image the admin's keys reach (`mediaReachOf`) and where it
   * is used; delete those nothing uses. Operation's are the fleet's photos.
   */
  "media.manage": ["MARKETING", "SEO", "OPERATION"],
} as const satisfies Record<string, "any" | "super" | readonly AdminTeam[]>;

export type Permission = keyof typeof RULES;
export const PERMISSIONS = Object.keys(RULES) as Permission[];

/** The keys of Settings' cards: a location's details, its time between jobs, its status. Holding one opens Settings. */
export const SETTINGS_CARDS = [
  "locations.manage",
  "coverage.manage",
  "locations.activate",
] as const satisfies readonly Permission[];

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

/** Confirming is Reservation and Sales work; completing is Operation's, as assigning is. */
export const ADVANCE_PERMISSIONS: Record<NextItemStatus, Permission> = {
  confirmed: "bookings.manage",
  completed: "bookings.fulfil",
};
