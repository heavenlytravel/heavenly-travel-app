import type { Permission } from "@repo/db";
import {
  BanknoteIcon,
  BusIcon,
  CalendarCheckIcon,
  HistoryIcon,
  HouseIcon,
  MapIcon,
  MapPinIcon,
  ShieldCheckIcon,
} from "@repo/ui/icons";
import type { ComponentType, SVGProps } from "react";
import {
  ACTIVITY_PATH,
  ADMINS_PATH,
  BOOKINGS_PATH,
  COVERAGE_PATH,
  HOME_PAGE_PATH,
  LOCATIONS_PATH,
  RATES_PATH,
  VEHICLE_CLASSES_PATH,
} from "../_lib/routes";

export type NavItem = {
  href: string;
  /** Paths under this prefix are the section's too: a location's page is on Locations. */
  also?: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** What the page asks of `requireAdmin`. Without it the link is hidden. */
  permission: Permission;
};

export type NavGroup = { label: string; items: NavItem[] };

/**
 * The home: every location with its numbers. The sidebar's first group is
 * the locations themselves, this row at its head; every team works inside a
 * location, and the sections below stand beside them. See
 * docs/261015-locations-as-operation-areas.md.
 */
export const LOCATIONS_NAV: NavItem = {
  href: LOCATIONS_PATH,
  also: "/locations",
  label: "Locations",
  icon: MapIcon,
  permission: "dashboard.view",
};

/**
 * The console's other sections, in sidebar order, under the locations.
 * Operations holds the views across locations: the queue, the catalogue,
 * every zone and every price; each is changed inside its location.
 */
export const NAV: NavGroup[] = [
  {
    label: "Operations",
    items: [
      {
        href: BOOKINGS_PATH,
        label: "Bookings",
        icon: CalendarCheckIcon,
        permission: "bookings.view",
      },
      {
        href: VEHICLE_CLASSES_PATH,
        label: "Vehicle classes",
        icon: BusIcon,
        permission: "coverage.view",
      },
      {
        href: COVERAGE_PATH,
        label: "Coverage",
        icon: MapPinIcon,
        permission: "coverage.view",
      },
      {
        href: RATES_PATH,
        label: "Rates",
        icon: BanknoteIcon,
        permission: "coverage.view",
      },
    ],
  },
  {
    label: "Marketing",
    items: [
      {
        href: HOME_PAGE_PATH,
        label: "Home page",
        icon: HouseIcon,
        permission: "locations.manage",
      },
    ],
  },
  {
    label: "Access",
    items: [
      {
        href: ADMINS_PATH,
        label: "Admins",
        icon: ShieldCheckIcon,
        permission: "admins.manage",
      },
      {
        href: ACTIVITY_PATH,
        label: "Activity",
        icon: HistoryIcon,
        permission: "activity.view",
      },
    ],
  },
];

/** The groups with only the sections the admin may open; empty groups go. */
export function navFor(permissions: readonly Permission[]): NavGroup[] {
  return NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => permissions.includes(item.permission)),
  })).filter((group) => group.items.length > 0);
}

export function isCurrentNav(item: NavItem, pathname: string) {
  if (item.also && pathname.startsWith(item.also)) return true;
  return item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
}

/** The section the path is in, for the page header's breadcrumb. */
export function currentNav(pathname: string): NavItem | undefined {
  return [LOCATIONS_NAV, ...NAV.flatMap((g) => g.items)].find((item) =>
    isCurrentNav(item, pathname),
  );
}
