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

/** One screen of the console. */
export type ConsolePage = {
  key: string;
  label: string;
  /** Its path under the location's segment: "fleet/vehicles"; "" for the dashboard. */
  path: string;
  /** Its path under `~` when it is not `path`: every location's pages are at "pages/locations", one location's at "pages". */
  allPath?: string;
  icon: MenuIcon;
  /** What its `requireAdmin` asks, in every scope. */
  permission: Permission;
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
        permission: "dashboard.view",
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
    key: "board",
    label: "Board",
    icon: "board",
    group: "operations",
    pages: [
      {
        key: "board",
        label: "Board",
        path: "board",
        icon: "board",
        permission: "bookings.fulfil",
        live: true,
        words: "dispatch assign trips today drivers vendors",
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
        key: "vendors",
        label: "Vendors",
        path: "fleet/vendors",
        icon: "vendors",
        permission: "fleet.manage",
        shared: true,
        words: "fleet partners suppliers transport companies connect approve",
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
    // By the app a page is on: the customer site's own, Connect's, then
    // the locations'. The first two exist under `~` alone.
    pages: [
      {
        key: "pages-website",
        label: "Website",
        path: "pages/website",
        icon: "website",
        permission: "website.manage",
        wide: true,
        words:
          "content home page top choices hubs about contact terms privacy footer",
      },
      {
        key: "pages-connect",
        label: "Connect",
        path: "pages/connect",
        icon: "connect",
        permission: "website.manage",
        wide: true,
        words: "content vendors drivers landing page",
      },
      {
        key: "pages",
        label: "Locations",
        path: "pages",
        allPath: "pages/locations",
        icon: "pages",
        permission: "pages.manage",
        step: "pages",
        words: "content location pages places posts saved addresses",
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
    key: "users",
    label: "Users",
    icon: "users",
    group: "admin",
    pages: [
      {
        key: "admin",
        label: "Admin",
        path: "users/admin",
        icon: "admin",
        permission: "admins.manage",
        wide: true,
        words: "staff admins teams access wall super regular",
      },
      {
        key: "all-users",
        label: "All Users",
        path: "users",
        icon: "user",
        permission: "users.manage",
        wide: true,
        words: "accounts customers vendors drivers connect password email",
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
        permission: "activity.view",
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
        permission: "settings.view",
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
  if (!permissions.includes(page.permission)) return false;
  return !(page.live && where !== null && state === "draft");
}

/**
 * Where an admin starts in a scope: the first row of the menu it holds,
 * the dashboard for the booking teams, Pages for Marketing and SEO. Null
 * for an admin who holds none.
 */
export function homeHref(menu: MenuFor): string | null {
  const page = CONSOLE_PAGES.find((entry) => pageShown(entry, menu));
  return page ? pageHref(page, menu.scope) : null;
}

/** A page's path under a scope's segment. */
function pathIn(page: ConsolePage, scope: ScopeSlug) {
  return scope === null ? (page.allPath ?? page.path) : page.path;
}

/** Where a page's row leads in a scope: its own address there, or `~` for a console-wide page. */
export function pageHref(page: ConsolePage, scope: ScopeSlug) {
  const where = page.wide ? null : scope;
  return page.path === ""
    ? dashboardHref(where)
    : consolePath(where, pathIn(page, where));
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
  let found: (PageAt & { path: string }) | null = null;
  for (const section of CONSOLE_SECTIONS) {
    for (const page of section.pages) {
      const path = pathIn(page, scope);
      const own = rest === path;
      const under = path !== "" && rest.startsWith(`${path}/`);
      if (!own && !under) continue;
      if (found && found.path.length >= path.length) continue;
      found = { page, section, scope, rest, own, path };
    }
  }
  return found;
}

/**
 * A step of the trail over a page's title: a name, where it leads when it
 * is a page to go back to, and whether it is the page the admin is on.
 */
export type Crumb = { label: string; href?: string; current?: boolean };

/**
 * The trail over a page's title, read off its address, so every page has
 * one in the same place and its title never moves. It is the page's place
 * in the menu: its section when that holds several pages, which has no
 * page of its own, then its row. On the row's own page the row is where
 * the admin is: "Bookings", "Fleet › Vehicles". Under it, on a record or
 * a form, the row is the link back: "Fleet › Vehicles" over Add Vehicle.
 * None on the dashboard, which has its band, nor on an address of no page.
 */
export function trailOf(pathname: string): Crumb[] {
  const at = pageAt(pathname);
  if (!at || at.page.path === "") return [];
  const row: Crumb = at.own
    ? { label: at.page.label, current: true }
    : { label: at.page.label, href: pageHref(at.page, at.scope) };
  return at.section.pages.length > 1
    ? [{ label: at.section.label }, row]
    : [row];
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
