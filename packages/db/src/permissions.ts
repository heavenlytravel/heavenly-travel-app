import type { NextItemStatus } from "./booking-status";
import { adminTeamsOf, adminLevelOf, type AdminTeam } from "./roles";

/**
 * The wall: which teams reach each screen and action. This is the only place
 * the map lives; pages and server actions ask `may`, none holds its own rule.
 * The teams here are the defaults: a SUPER admin may change the teams of
 * any team rule on Admin, kept in `AppSetting.accessRules` (./settings),
 * and `may` reads them over these. "any", "super" and "cards" stay as
 * written. See docs/260930-admin-teams-and-access.md and
 * docs/261102-direct-accounts.md, "Team access".
 *
 *   "any"   -> every admin, with or without a team
 *   "super" -> SUPER admins only, whether the wall is on or off
 *   "cards" -> whoever holds a key of one of Settings' cards (`SETTINGS_CARDS`)
 *   teams   -> those teams once the wall is on, every admin while it is off
 */
const DEFAULT_RULES = {
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
  /** Mark a booking's invoice paid or unpaid, and give an older booking its invoice. */
  "bookings.payment": ["RESERVATION", "SALES", "FINANCE"],
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
  "settings.view": "cards",
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
} as const satisfies Record<string, Rule>;

type Rule = "any" | "super" | "cards" | readonly AdminTeam[];

export type Permission = keyof typeof DEFAULT_RULES;
export const PERMISSIONS = Object.keys(DEFAULT_RULES) as Permission[];

/** The permissions whose teams a SUPER admin may change: those a team rule holds. */
export const TEAM_PERMISSIONS = PERMISSIONS.filter((permission) =>
  Array.isArray(DEFAULT_RULES[permission]),
);

/** The teams a team rule holds as the code ships it, for "Reset" and the defaults on Admin. */
export function defaultTeamsOf(permission: Permission): readonly AdminTeam[] {
  const rule: Rule = DEFAULT_RULES[permission];
  return Array.isArray(rule) ? rule : [];
}

/** The team rules a SUPER admin changed, over the defaults; a permission left out keeps its default. */
export type RuleOverrides = Partial<Record<Permission, readonly AdminTeam[]>>;

/** What the wall reads besides the admin: whether it is on, and the teams SUPER changed. */
export type AccessPolicy = { wallActive: boolean; overrides: RuleOverrides };

/**
 * The overrides as stored (JSON), read safely: a permission this code does
 * not know, one that is not a team rule, and a team it does not know are
 * dropped, so a stored value never opens more than it names.
 */
export function ruleOverridesOf(stored: unknown): RuleOverrides {
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {};
  const overrides: RuleOverrides = {};
  for (const [key, teams] of Object.entries(stored)) {
    const permission = TEAM_PERMISSIONS.find((p) => p === key);
    if (permission && Array.isArray(teams)) {
      overrides[permission] = adminTeamsOf(teams);
    }
  }
  return overrides;
}

/** The field of Admin's Team access that carries a team rule's teams, one value per team. */
export function ruleField(permission: Permission) {
  return `rule:${permission}`;
}

/** The field of Team access that names each team rule the grid showed, one value per rule. */
export const SHOWN_RULES_FIELD = "rules";

/**
 * The teams of each team rule the grid showed (`shown`), as Team access
 * posts them (`teamsAt` reads the values of a field), or every default
 * when it asks for a reset. A rule the grid did not show, one added by a
 * deployment while the page was open, is left out, so it keeps what it
 * holds. A team this code does not know is dropped.
 */
export function parseAccessRules(
  teamsAt: (field: string) => readonly unknown[],
  shown: readonly unknown[],
  reset: boolean,
): RuleOverrides {
  const wanted: RuleOverrides = {};
  for (const permission of TEAM_PERMISSIONS) {
    if (reset) wanted[permission] = defaultTeamsOf(permission);
    else if (shown.includes(permission)) {
      wanted[permission] = adminTeamsOf(teamsAt(ruleField(permission)));
    }
  }
  return wanted;
}

/** The teams a team rule holds now: SUPER's change, or the default. */
export function teamsOf(
  permission: Permission,
  overrides: RuleOverrides,
): readonly AdminTeam[] {
  return overrides[permission] ?? defaultTeamsOf(permission);
}

/**
 * Each permission in the words of what it opens, as Admin's team access
 * names them. Typed by `Permission`, so a new one cannot ship without its
 * words, and the list on Admin is always the whole of it.
 */
export const PERMISSION_LABELS: Record<Permission, string> = {
  "dashboard.view": "See the dashboard",
  "bookings.view": "See bookings",
  "bookings.manage": "Confirm, amend and cancel bookings",
  "bookings.create": "Enter a booking and change a price",
  "bookings.fulfil":
    "Assign vehicles and drivers, and report a trip's steps for its driver",
  "bookings.notes": "Write notes on a booking",
  "bookings.payment": "Give a booking its invoice and mark invoices paid",
  "coverage.manage":
    "Change zones, classes on sale, rates and the class catalogue",
  "coverage.view": "See coverage, classes and rates",
  "fleet.manage": "See and change vendors, vehicles and drivers",
  "vendors.review": "Approve, refuse and suspend vendors",
  "locations.view": "Open a location",
  "locations.manage": "Change a location's details and saved addresses",
  "locations.create": "Add a location",
  "pages.manage": "See, write and publish a location's pages",
  "website.manage":
    "See and change the website's own pages, its footer and top choices",
  "locations.activate": "Take a location live, pause or delete it",
  "settings.view": "Open Settings",
  "admins.manage": "Admin: who has access, their levels and teams",
  "users.manage": "All Users: every account, its email and password",
  "wall.switch": "Switch the wall between teams",
  "activity.view": "See the activity of their own work",
  "media.manage": "See media and delete what nothing uses",
};

/** The permissions that only show: whoever holds one alone reads, and changes nothing. */
export const VIEW_ONLY_PERMISSIONS: readonly Permission[] = [
  "dashboard.view",
  "bookings.view",
  "coverage.view",
  "locations.view",
  "activity.view",
];

/**
 * The permissions by the part of Manage they open, in the order Admin's
 * team access lists them. A test keeps every permission in exactly one.
 */
export const PERMISSION_GROUPS: readonly {
  label: string;
  permissions: readonly Permission[];
}[] = [
  {
    label: "Bookings",
    permissions: [
      "dashboard.view",
      "bookings.view",
      "bookings.notes",
      "bookings.manage",
      "bookings.create",
      "bookings.fulfil",
      "bookings.payment",
    ],
  },
  { label: "Fleet", permissions: ["fleet.manage", "vendors.review"] },
  {
    label: "Coverage and rates",
    permissions: ["coverage.view", "coverage.manage"],
  },
  {
    label: "Locations",
    permissions: [
      "locations.view",
      "settings.view",
      "locations.manage",
      "locations.create",
      "locations.activate",
    ],
  },
  {
    label: "Website",
    permissions: ["pages.manage", "website.manage", "media.manage"],
  },
  {
    label: "Team",
    permissions: [
      "activity.view",
      "admins.manage",
      "users.manage",
      "wall.switch",
    ],
  },
];

/** The keys of Settings' cards: a location's details, its time between jobs, its status. Holding one opens Settings. */
export const SETTINGS_CARDS = [
  "locations.manage",
  "coverage.manage",
  "locations.activate",
] as const satisfies readonly Permission[];

/** What the wall reads of an admin: the two fields of `AdminProfile`. */
export type PermissionHolder = { level: string; teams: readonly string[] };

/** May this admin do this, with the wall on or off and the teams as SUPER left them. */
export function may(
  admin: PermissionHolder,
  permission: Permission,
  policy: AccessPolicy,
): boolean {
  if (adminLevelOf(admin.level) === "SUPER") return true;
  const rule: Rule = DEFAULT_RULES[permission];
  if (rule === "super") return false;
  if (rule === "cards") {
    return SETTINGS_CARDS.some((card) => may(admin, card, policy));
  }
  if (rule === "any" || !policy.wallActive) return true;
  return teamsOf(permission, policy.overrides).some((team) =>
    admin.teams.includes(team),
  );
}

/** Everything the admin may do right now. */
export function permissionsOf(
  admin: PermissionHolder,
  policy: AccessPolicy,
): Permission[] {
  return PERMISSIONS.filter((p) => may(admin, p, policy));
}

/** Confirming is Reservation and Sales work; completing is Operation's, as assigning is. */
export const ADVANCE_PERMISSIONS: Record<NextItemStatus, Permission> = {
  confirmed: "bookings.manage",
  completed: "bookings.fulfil",
};
