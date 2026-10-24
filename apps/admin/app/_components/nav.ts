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
export type NavView = { href: string; label: string; permission: Permission };

/**
 * A section of the console across locations: its row in the sidebar and
 * its pages. The row leads to the first page the admin may open. The
 * others are tabs on the page, as the class catalogue is beside the
 * vehicles, or, for a drill, the menu that takes the sidebar's place, as
 * Settings does.
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

/** Our vehicles, and the class catalogue as a second tab: a vehicle is of a model of a class. */
export const VEHICLES_SECTION: NavSection = {
  key: "vehicles",
  label: "Vehicles",
  icon: "vehicles",
  views: [
    { href: VEHICLES_PATH, label: "Vehicles", permission: "fleet.manage" },
    {
      href: VEHICLE_CLASSES_PATH,
      label: "Classes",
      permission: "coverage.view",
    },
  ],
};

/**
 * The sidebar on All locations, in its parts: the day's work across
 * locations (the home with every location's numbers, the queue, our
 * vehicles with the class catalogue, our drivers), then what every
 * location serves and charges, then the customer site's home page and the
 * console's own settings: its users, its admins, its activity and its
 * images. Each view across locations sums up the same tab of every
 * location, where it is changed. A location picked, its own sidebar stands
 * here instead. See docs/261023-console-sidebar.md.
 */
export const ALL_LOCATIONS_NAV: readonly (readonly NavSection[])[] = [
  [
    {
      key: "overview",
      label: "Overview",
      icon: "overview",
      exact: true,
      views: [
        {
          href: LOCATIONS_PATH,
          label: "Overview",
          permission: "dashboard.view",
        },
      ],
    },
    {
      key: "bookings",
      label: "Bookings",
      icon: "bookings",
      views: [
        { href: BOOKINGS_PATH, label: "Bookings", permission: "bookings.view" },
      ],
    },
    VEHICLES_SECTION,
    {
      key: "drivers",
      label: "Drivers",
      icon: "drivers",
      views: [
        { href: DRIVERS_PATH, label: "Drivers", permission: "fleet.manage" },
      ],
    },
  ],
  [
    {
      key: "coverage",
      label: "Coverage",
      icon: "coverage",
      views: [
        { href: COVERAGE_PATH, label: "Coverage", permission: "coverage.view" },
      ],
    },
    {
      key: "rates",
      label: "Rates",
      icon: "rates",
      views: [
        { href: RATES_PATH, label: "Rates", permission: "coverage.view" },
      ],
    },
  ],
  [
    {
      key: "home-page",
      label: "Home page",
      icon: "home-page",
      views: [
        {
          href: HOME_PAGE_PATH,
          label: "Home page",
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
        { href: USERS_PATH, label: "Users", permission: "users.manage" },
        { href: ADMINS_PATH, label: "Admins", permission: "admins.manage" },
        { href: ACTIVITY_PATH, label: "Activity", permission: "activity.view" },
        { href: MEDIA_PATH, label: "Media", permission: "media.manage" },
      ],
    },
  ],
];

/** The pages of a section the admin may open, in order. */
export function viewsFor(
  section: NavSection,
  permissions: readonly Permission[],
): NavView[] {
  return section.views.filter((view) => permissions.includes(view.permission));
}

/**
 * The menu on All locations, with the sections the admin may open, each
 * leading to the first of its pages they may open. A section with none
 * goes, and so does a part left empty.
 */
export function allLocationsMenu(permissions: readonly Permission[]): Menu {
  return {
    label: "All locations",
    parts: ALL_LOCATIONS_NAV.map((part) =>
      part.flatMap((section): MenuRow[] => {
        const views = viewsFor(section, permissions);
        const first = views[0];
        if (!first) return [];
        return [
          {
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
                    })),
                  },
                }
              : { paths: section.views.map((view) => view.href) }),
          },
        ];
      }),
    ).filter((part) => part.length > 0),
  };
}

/**
 * The section on screen off a location, for the header's trail: a page of
 * Settings by its own name, Vehicles on either of its tabs, as a link to
 * the page on screen.
 */
export function sectionOnScreen(
  pathname: string,
): { label: string; href: string } | undefined {
  for (const section of ALL_LOCATIONS_NAV.flat()) {
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
