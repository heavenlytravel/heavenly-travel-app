import type { Permission } from "@repo/db";
import {
  BusIcon,
  CalendarCheckIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  MapPinIcon,
  ShieldCheckIcon,
} from "@repo/ui/icons";
import type { ComponentType, SVGProps } from "react";
import {
  ACTIVITY_PATH,
  ADMINS_PATH,
  BOOKINGS_PATH,
  COVERAGE_PATH,
  VEHICLE_CLASSES_PATH,
} from "../_lib/routes";

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** What the page asks of `requireAdmin`. Without it the link is hidden. */
  permission: Permission;
};

export type NavGroup = { label: string; items: NavItem[] };

/** The console's sections, in sidebar order. The header reads the same list. */
export const NAV: NavGroup[] = [
  {
    label: "Operations",
    items: [
      {
        href: "/",
        label: "Dashboard",
        icon: LayoutDashboardIcon,
        permission: "dashboard.view",
      },
      {
        href: BOOKINGS_PATH,
        label: "Bookings",
        icon: CalendarCheckIcon,
        permission: "bookings.view",
      },
      {
        href: COVERAGE_PATH,
        label: "Coverage",
        icon: MapPinIcon,
        permission: "coverage.manage",
      },
      {
        href: VEHICLE_CLASSES_PATH,
        label: "Vehicle classes",
        icon: BusIcon,
        permission: "coverage.manage",
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
  return item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
}

/** The section the path is in, for the page header's breadcrumb. */
export function currentNav(pathname: string): NavItem | undefined {
  return NAV.flatMap((g) => g.items).find((item) =>
    isCurrentNav(item, pathname),
  );
}
