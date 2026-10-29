import type { LocationState, Permission, SetupStepKey } from "@repo/db";
import type { MenuIcon } from "../_components/menu";
import {
  RATES_PAGES,
  RATES_PAGE_LABELS,
  consolePath,
  dashboardHref,
  type ScopeSlug,
} from "./routes";

/**
 * The console's screens as one list: each section in its group, each with
 * its pages, each page with its path under the location, its permission
 * and where it exists. The sidebar's menu, the location picker, the
 * search and the page headers all read it, so a screen is named and
 * placed once. A later product is a new entry, not a rework. See
 * docs/261029-manage-signature-overhaul.md, "The menu".
 */

/** The menu's groups, in order. */
export const CONSOLE_GROUPS = [
  { key: "operations", label: "Operations" },
  { key: "selling", label: "Selling" },
  { key: "website", label: "Website" },
  { key: "admin", label: "Admin" },
] as const;

export type ConsoleGroup = (typeof CONSOLE_GROUPS)[number]["key"];

/** What a page's `requireAdmin` asks, the same in every scope or one under `~` and another under a location. */
type PagePermission = Permission | { all: Permission; location: Permission };

/** One screen of the console. */
export type ConsolePage = {
  key: string;
  label: string;
  /** Its path under the location's segment: "fleet/vehicles"; "" for the dashboard. */
  path: string;
  icon: MenuIcon;
  permission: PagePermission;
  /** Console-wide: it exists under `~` alone, and under a location its row leads there. */
  wide?: boolean;
  /** Only a location that takes bookings has it: a draft has no Bookings yet. */
  live?: boolean;
  /** The setup step of a draft location it holds, marked on its row. */
  step?: SetupStepKey;
  /** Its records keep their ids under `~` and their location alike: a booking, a vehicle, a driver. */
  shared?: boolean;
  /** Other words the search finds it by. */
  words?: string;
};

/** A section of the menu: one page, a row of its own, or several, which open in place under its row. */
export type ConsoleSection = {
  key: string;
  label: string;
  icon: MenuIcon;
  group: ConsoleGroup;
  pages: readonly ConsolePage[];
};

/** Rates' pages' icons and search words, beside their names in `routes`. */
const RATES_ICONS = {
  classes: "rate-classes",
  grid: "rate-grid",
  rules: "rate-rules",
  try: "rate-try",
} as const satisfies Record<(typeof RATES_PAGES)[number], MenuIcon>;

const RATES_WORDS: Record<(typeof RATES_PAGES)[number], string> = {
  classes: "prices hourly class rates",
  grid: "prices routes zone to zone",
  rules: "surcharge odd hours weekend holiday extra km cross-location",
  try: "quote price check",
};

export const CONSOLE_SECTIONS: readonly ConsoleSection[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: "dashboard",
    group: "operations",
    pages: [
      {
        key: "dashboard",
        label: "Dashboard",
        path: "",
        icon: "dashboard",
        permission: { all: "dashboard.view", location: "locations.view" },
        words: "home overview today",
      },
    ],
  },
  {
    key: "bookings",
    label: "Bookings",
    icon: "bookings",
    group: "operations",
    pages: [
      {
        key: "bookings",
        label: "Bookings",
        path: "bookings",
        icon: "bookings",
        permission: "bookings.view",
        live: true,
        shared: true,
        words: "queue reservations received",
      },
    ],
  },
  {
    key: "fleet",
    label: "Fleet",
    icon: "fleet",
    group: "operations",
    pages: [
      {
        key: "vehicles",
        label: "Vehicles",
        path: "fleet/vehicles",
        icon: "vehicles",
        permission: "fleet.manage",
        shared: true,
        words: "fleet cars plates road tax insurance",
      },
      {
        key: "drivers",
        label: "Drivers",
        path: "fleet/drivers",
        icon: "drivers",
        permission: "fleet.manage",
        shared: true,
        words: "fleet licence",
      },
      {
        key: "classes",
        label: "Classes",
        path: "fleet/classes",
        icon: "classes",
        permission: "coverage.view",
        step: "vehicle-classes",
        words: "fleet vehicle classes catalogue on sale",
      },
    ],
  },
  {
    key: "coverage",
    label: "Coverage",
    icon: "coverage",
    group: "selling",
    pages: [
      {
        key: "coverage",
        label: "Coverage",
        path: "coverage",
        icon: "coverage",
        permission: "coverage.view",
        step: "coverage",
        words: "zones map test an address",
      },
    ],
  },
  {
    key: "rates",
    label: "Rates",
    icon: "rates",
    group: "selling",
    pages: RATES_PAGES.map((page) => ({
      key: `rates-${page}`,
      label: RATES_PAGE_LABELS[page],
      path: `rates/${page}`,
      icon: RATES_ICONS[page],
      permission: "coverage.view" as const,
      words: RATES_WORDS[page],
    })),
  },
  {
    key: "pages",
    label: "Pages",
    icon: "pages",
    group: "website",
    pages: [
      {
        key: "pages",
        label: "Pages",
        path: "pages",
        icon: "pages",
        permission: "locations.manage",
        step: "pages",
        words: "content website home page top choices terms privacy footer",
      },
    ],
  },
  {
    key: "media",
    label: "Media",
    icon: "media",
    group: "website",
    pages: [
      {
        key: "media",
        label: "Media",
        path: "media",
        icon: "media",
        permission: "media.manage",
        wide: true,
        words: "images uploads photos",
      },
    ],
  },
  {
    key: "team",
    label: "Team",
    icon: "team",
    group: "admin",
    pages: [
      {
        key: "staff",
        label: "Staff",
        path: "team",
        icon: "staff",
        permission: "admins.manage",
        wide: true,
        words: "admins teams access wall",
      },
      {
        key: "customers",
        label: "Customers",
        path: "team/customers",
        icon: "customers",
        permission: "users.manage",
        wide: true,
        words: "users accounts",
      },
    ],
  },
  {
    key: "activity",
    label: "Activity",
    icon: "activity",
    group: "admin",
    pages: [
      {
        key: "activity",
        label: "Activity",
        path: "activity",
        icon: "activity",
        permission: { all: "activity.view", location: "locations.view" },
        words: "log history changes",
      },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    icon: "settings",
    group: "admin",
    pages: [
      {
        key: "settings",
        label: "Settings",
        path: "settings",
        icon: "settings",
        permission: "locations.view",
        step: "details",
        words: "locations details state go live pause delete",
      },
    ],
  },
];

/** Every page, in the menu's order. */
export const CONSOLE_PAGES: readonly ConsolePage[] = CONSOLE_SECTIONS.flatMap(
  (section) => section.pages,
);

/** What a page asks in a scope. */
export function permissionOf(page: ConsolePage, scope: ScopeSlug): Permission {
  const { permission } = page;
  if (typeof permission === "string") return permission;
  return scope === null ? permission.all : permission.location;
}

/** Who and where a row is shown for: the admin's permissions, and the location's state under a slug. */
export type MenuFor = {
  scope: ScopeSlug;
  permissions: readonly Permission[];
  /** The location's state under a slug; none under `~`. */
  state?: LocationState;
};

/**
 * Whether a page's row shows: the admin may open it where it leads, and
 * under a draft location it is not one a live location alone has. A
 * console-wide page shows under a location too, leading to `~`.
 */
export function pageShown(
  page: ConsolePage,
  { scope, permissions, state }: MenuFor,
) {
  const where = page.wide ? null : scope;
  if (!permissions.includes(permissionOf(page, where))) return false;
  return !(page.live && where !== null && state === "draft");
}

/** Where a page's row leads in a scope: its own address there, or `~` for a console-wide page. */
export function pageHref(page: ConsolePage, scope: ScopeSlug) {
  return page.path === ""
    ? dashboardHref(scope)
    : consolePath(page.wide ? null : scope, page.path);
}

/** The page an address is on, and what of it is past the page's own path: a record, "new", a publish. */
type PageAt = {
  page: ConsolePage;
  section: ConsoleSection;
  scope: ScopeSlug;
  /** The path past the scope: "fleet/vehicles/abc/history". */
  rest: string;
  /** The address is the page itself, not a record or a form under it. */
  own: boolean;
};

/** The page an address is on: the one whose path is the longest the address starts with. */
function pageAt(pathname: string): PageAt | null {
  const [, first, ...parts] = pathname.split("/");
  if (!first) return null;
  const decoded = decodeURIComponent(first);
  const scope = decoded === consolePath(null).slice(1) ? null : decoded;
  const rest = parts.filter(Boolean).join("/");
  let found: PageAt | null = null;
  for (const section of CONSOLE_SECTIONS) {
    for (const page of section.pages) {
      const own = rest === page.path;
      const under = page.path !== "" && rest.startsWith(`${page.path}/`);
      if (!own && !under) continue;
      if (found && found.page.path.length >= page.path.length) continue;
      found = { page, section, scope, rest, own };
    }
  }
  return found;
}

/** The section a page is in, for the label over its title: "Fleet" over "Vehicles". Only a section of several pages names itself. */
export function sectionLabelOf(pageKey: string): string | undefined {
  const section = CONSOLE_SECTIONS.find((entry) =>
    entry.pages.some((page) => page.key === pageKey),
  );
  return section && section.pages.length > 1 ? section.label : undefined;
}

/** A page by its key. */
export function consolePage(key: string): ConsolePage {
  const page = CONSOLE_PAGES.find((entry) => entry.key === key);
  if (!page) throw new Error(`No console page ${key}.`);
  return page;
}

/** The parameters a list keeps across a change of scope: its filters, not its place in the list. */
const DROPPED_ON_SWITCH = ["page", "before"];

/**
 * Where the location picker takes the admin from this address to another
 * scope: the first segment changes and the rest is kept, the list's
 * filters with it. A record goes with the address to `~`, which holds
 * every record, when its ids are the same there; otherwise the picker
 * lands on the record's list. A page the other scope has not, or the
 * admin may not open there, gives way to the dashboard. `shown` says
 * whether a page shows in the scope the picker goes to.
 */
export function scopeSwitchHref(
  pathname: string,
  search: string,
  to: ScopeSlug,
  shown: (page: ConsolePage) => boolean,
): string {
  const at = pageAt(pathname);
  if (!at || (at.page.wide && to !== null) || !shown(at.page)) {
    return dashboardHref(to);
  }
  const params = new URLSearchParams(search);
  for (const key of DROPPED_ON_SWITCH) params.delete(key);
  const query = params.size > 0 ? `?${params}` : "";
  if (at.own) return `${pageHref(at.page, to)}${query}`;
  if (to === null && at.page.shared) return consolePath(null, at.rest);
  return pageHref(at.page, to);
}
