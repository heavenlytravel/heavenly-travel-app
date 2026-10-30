import {
  BriefcaseBusiness,
  CarFront,
  Users,
  type LucideIcon,
} from "lucide-react";

/** The signed-in person's own page: their name, email, password and devices. */
export const ACCOUNT_PATH = "/account";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** The paths under it, open while one of them is. */
  match: readonly string[];
};

/**
 * Connect's places, as the phone's tab bar and the large screen's sidebar
 * list them: Jobs for everyone; Fleet for a vendor's member; Team for its
 * owner.
 */
export function navItems(member?: { owner: boolean }): NavItem[] {
  return [
    { href: "/", label: "Jobs", icon: BriefcaseBusiness, match: ["/jobs"] },
    ...(member
      ? [
          {
            href: "/vehicles",
            label: "Fleet",
            icon: CarFront,
            match: ["/vehicles", "/drivers"],
          },
        ]
      : []),
    ...(member?.owner
      ? [{ href: "/staff", label: "Team", icon: Users, match: ["/staff"] }]
      : []),
  ];
}

/** Whether the item is the place open. */
export function isActive(item: NavItem, pathname: string) {
  return (
    (item.href === "/" && pathname === "/") ||
    (item.href !== "/" && pathname.startsWith(item.href)) ||
    item.match.some((m) => pathname.startsWith(m))
  );
}
