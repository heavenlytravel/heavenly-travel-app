import type { Permission } from "@repo/db";
import {
  ACTIVITY_PATH,
  ADMINS_PATH,
  BOOKINGS_PATH,
  COVERAGE_PATH,
  DRIVERS_PATH,
  HOME_PAGE_PATH,
  LOCATIONS_PATH,
  MEDIA_PATH,
  RATES_PATH,
  USERS_PATH,
  VEHICLE_CLASSES_PATH,
  VEHICLES_PATH,
} from "../_lib/routes";
import type { Menu, MenuIcon, MenuRow } from "./menu";

/** A page of a section, and what its `requireAdmin` asks; one the admin may not open is not offered. */
export type NavView = {
  href: string;
  label: string;
  icon: MenuIcon;
  permission: Permission;
};

/**
 * A section of the console across locations: its row in the sidebar and
 * its pages. The row leads to the first page the admin may open; for a
 * drill, its pages take the sidebar's place while one is on screen, as
 * Fleet's and Settings' do. A drill the admin may open one page of is
 * that page's row alone.
 */
export type NavSection = {
  key: string;
  label: string;
  icon: MenuIcon;
  views: readonly NavView[];
  /** Its pages are listed in place of the menu while one is on screen. */
  drill?: boolean;
  /** Only its own address is the section, not the paths under it: the home. */
  exact?: boolean;
};

/** A part of the sidebar on All locations: its sections under its name. */
export type NavPart = { label?: string; sections: readonly NavSection[] };

/**
 * The names of the sidebar's parts after the day's work, in either scope:
 * what is sold and where, then the pages and the settings.
 */
export const MENU_PART_LABELS = { selling: "Selling", manage: "Manage" };

/**
 * The sidebar on All locations, in its parts: the day's work across
 * locations (the home with every location's numbers, the queue, the
 * fleet: our vehicles, our drivers and the class catalogue, a vehicle
 * being of a model of a class), then what every location serves and
 * charges, then the customer site's home page and the console's own
 * settings: its users, its admins, its activity and its images. Each view
 * across locations sums up the same tab of every location, where it is
 * changed. A location picked, its own sidebar stands here instead. See
 * docs/261023-console-sidebar.md.
 */
export const ALL_LOCATIONS_NAV: readonly NavPart[] = [
  {
    sections: [
      {
        key: "overview",
        label: "Overview",
        icon: "overview",
        exact: true,
        views: [
          {
            href: LOCATIONS_PATH,
            label: "Overview",
            icon: "overview",
            permission: "dashboard.view",
          },
        ],
      },
      {
        key: "bookings",
        label: "Bookings",
        icon: "bookings",
        views: [
          {
            href: BOOKINGS_PATH,
            label: "Bookings",
            icon: "bookings",
            permission: "bookings.view",
          },
        ],
      },
      {
        key: "fleet",
        label: "Fleet",
        icon: "fleet",
        drill: true,
        views: [
          {
            href: VEHICLES_PATH,
            label: "Vehicles",
            icon: "vehicles",
            permission: "fleet.manage",
          },
          {
            href: DRIVERS_PATH,
            label: "Drivers",
            icon: "drivers",
            permission: "fleet.manage",
          },
          {
            href: VEHICLE_CLASSES_PATH,
            label: "Vehicle classes",
            icon: "vehicle-classes",
            permission: "coverage.view",
          },
        ],
      },
    ],
  },
  {
    label: MENU_PART_LABELS.selling,
    sections: [
      {
        key: "coverage",
        label: "Coverage",
        icon: "coverage",
        views: [
          {
            href: COVERAGE_PATH,
            label: "Coverage",
            icon: "coverage",
            permission: "coverage.view",
          },
        ],
      },
      {
        key: "rates",
        label: "Rates",
        icon: "rates",
        views: [
          {
            href: RATES_PATH,
            label: "Rates",
            icon: "rates",
            permission: "coverage.view",
          },
        ],
      },
    ],
  },
  {
    label: MENU_PART_LABELS.manage,
    sections: [
      {
        key: "home-page",
        label: "Home page",
        icon: "home-page",
        views: [
          {
            href: HOME_PAGE_PATH,
            label: "Home page",
            icon: "home-page",
            permission: "locations.manage",
          },
        ],
      },
      {
        key: "settings",
        label: "Settings",
        icon: "settings",
        drill: true,
        views: [
          {
            href: USERS_PATH,
            label: "Users",
            icon: "users",
            permission: "users.manage",
          },
          {
            href: ADMINS_PATH,
            label: "Admins",
            icon: "admins",
            permission: "admins.manage",
          },
          {
            href: ACTIVITY_PATH,
            label: "Activity",
            icon: "activity",
            permission: "activity.view",
          },
          {
            href: MEDIA_PATH,
            label: "Media",
            icon: "media",
            permission: "media.manage",
          },
        ],
      },
    ],
  },
];

/** The pages of a section the admin may open, in order. */
export function viewsFor(
  section: NavSection,
  permissions: readonly Permission[],
): NavView[] {
  return section.views.filter((view) => permissions.includes(view.permission));
}

/** A section's row, with the pages of it the admin may open; none while they may open none. */
function rowOf(
  section: NavSection,
  permissions: readonly Permission[],
): MenuRow | null {
  const views = viewsFor(section, permissions);
  const [first] = views;
  if (!first) return null;
  // A drill of one page is that page's row: a menu of one row is a detour.
  if (section.drill && views.length === 1) {
    return {
      key: section.key,
      label: first.label,
      href: first.href,
      icon: first.icon,
    };
  }
  return {
    key: section.key,
    label: section.label,
    href: first.href,
    icon: section.icon,
    exact: section.exact,
    ...(section.drill
      ? {
          drill: {
            label: section.label,
            entries: views.map((view) => ({
              key: view.href,
              label: view.label,
              href: view.href,
              icon: view.icon,
            })),
          },
        }
      : { paths: section.views.map((view) => view.href) }),
  };
}

/**
 * The menu on All locations, with the sections the admin may open, each
 * leading to the first of its pages they may open. A section with none
 * goes, and so does a part left empty.
 */
export function allLocationsMenu(permissions: readonly Permission[]): Menu {
  return {
    label: "All locations",
    parts: ALL_LOCATIONS_NAV.map((part) => ({
      label: part.label,
      rows: part.sections.flatMap((section) => {
        const row = rowOf(section, permissions);
        return row ? [row] : [];
      }),
    })).filter((part) => part.rows.length > 0),
  };
}

/**
 * The section on screen off a location, for the header's trail: a page of
 * a drill (Fleet, Settings) by its own name, as a link to the page on
 * screen.
 */
export function sectionOnScreen(
  pathname: string,
): { label: string; href: string } | undefined {
  for (const section of ALL_LOCATIONS_NAV.flatMap((part) => part.sections)) {
    const view = section.views.find((entry) =>
      section.exact
        ? pathname === entry.href
        : pathname === entry.href || pathname.startsWith(`${entry.href}/`),
    );
    if (view) {
      return {
        label: section.drill ? view.label : section.label,
        href: view.href,
      };
    }
  }
  return undefined;
}
