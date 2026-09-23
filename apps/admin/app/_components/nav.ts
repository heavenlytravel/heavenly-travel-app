import {
  CalendarCheckIcon,
  LayoutDashboardIcon,
  MapPinIcon,
  ShieldCheckIcon,
} from "@repo/ui/icons";
import type { ComponentType, SVGProps } from "react";
import { BOOKINGS_PATH } from "../_lib/routes";

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

export type NavGroup = { label: string; items: NavItem[] };

/** The console's sections, in sidebar order. The header reads the same list. */
export const NAV: NavGroup[] = [
  {
    label: "Operations",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboardIcon },
      { href: BOOKINGS_PATH, label: "Bookings", icon: CalendarCheckIcon },
      { href: "/locations", label: "Locations", icon: MapPinIcon },
    ],
  },
  {
    label: "Access",
    items: [{ href: "/admins", label: "Admins", icon: ShieldCheckIcon }],
  },
];

export function isCurrentNav(item: NavItem, pathname: string) {
  return item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
}

/** The section the path is in, for the page header's breadcrumb. */
export function currentNav(pathname: string): NavItem | undefined {
  return NAV.flatMap((g) => g.items).find((item) =>
    isCurrentNav(item, pathname),
  );
}
