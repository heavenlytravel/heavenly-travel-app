import type { Permission } from "@repo/db";
import {
  BanknoteIcon,
  BusIcon,
  CalendarCheckIcon,
  CarIcon,
  HistoryIcon,
  HouseIcon,
  IdCardIcon,
  ImageIcon,
  MapIcon,
  MapPinIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "@repo/ui/icons";
import type { ComponentType, SVGProps } from "react";
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

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** What the page asks of `requireAdmin`. Without it the link is hidden. */
  permission: Permission;
};

export type NavGroup = { label: string; items: NavItem[] };

/**
 * The sidebar while the picker in the console header is on All locations:
 * the home, every location with its numbers, then the views across
 * locations: the queue, our vehicles and drivers, the catalogue, every
 * zone and every price; each is changed inside its location. A location
 * picked, its own sections stand here instead. See
 * docs/261022-console-scope.md.
 */
export const ALL_LOCATIONS_NAV: NavGroup = {
  label: "All locations",
  items: [
    {
      href: LOCATIONS_PATH,
      label: "Overview",
      icon: MapIcon,
      permission: "dashboard.view",
    },
    {
      href: BOOKINGS_PATH,
      label: "Bookings",
      icon: CalendarCheckIcon,
      permission: "bookings.view",
    },
    {
      href: VEHICLES_PATH,
      label: "Vehicles",
      icon: CarIcon,
      permission: "fleet.manage",
    },
    {
      href: DRIVERS_PATH,
      label: "Drivers",
      icon: IdCardIcon,
      permission: "fleet.manage",
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
};

/**
 * The sections of the console as a whole, in sidebar order, under the
 * scope's own whatever the scope: they belong to no one location.
 */
export const CONSOLE_NAV: NavGroup[] = [
  {
    label: "Marketing",
    items: [
      {
        href: HOME_PAGE_PATH,
        label: "Home page",
        icon: HouseIcon,
        permission: "locations.manage",
      },
      {
        href: MEDIA_PATH,
        label: "Media",
        icon: ImageIcon,
        permission: "media.manage",
      },
    ],
  },
  {
    label: "Access",
    items: [
      {
        href: USERS_PATH,
        label: "Users",
        icon: UsersIcon,
        permission: "users.manage",
      },
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

/** The group with only the sections the admin may open; null when none is left. */
export function groupFor(
  group: NavGroup,
  permissions: readonly Permission[],
): NavGroup | null {
  const items = group.items.filter((item) =>
    permissions.includes(item.permission),
  );
  return items.length > 0 ? { ...group, items } : null;
}

/** The console's groups with only the sections the admin may open; empty groups go. */
export function navFor(permissions: readonly Permission[]): NavGroup[] {
  return CONSOLE_NAV.flatMap((group) => groupFor(group, permissions) ?? []);
}

export function isCurrentNav(item: NavItem, pathname: string) {
  return item.href === "/"
    ? pathname === "/"
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** The section the path is in, off a location, for the header's breadcrumb. */
export function currentNav(pathname: string): NavItem | undefined {
  return [ALL_LOCATIONS_NAV, ...CONSOLE_NAV]
    .flatMap((group) => group.items)
    .find((item) => isCurrentNav(item, pathname));
}
