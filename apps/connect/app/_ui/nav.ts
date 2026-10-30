import {
  BriefcaseBusiness,
  CarFront,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Connect's own screens, under `/~` as manage's are: `/` is the landing
 * page for everyone. A scope by location (`/langkawi/...`) could take the
 * `~`'s place later, as in manage.
 */
export const HOME_PATH = "/~";

/** The status page of a registration waiting for approval. */
export const STATUS_PATH = "/status";

/** The signed-in person's own page: their name, email, password and devices. */
export const ACCOUNT_PATH = "/~/account";

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
    {
      href: HOME_PATH,
      label: "Jobs",
      icon: BriefcaseBusiness,
      match: ["/~/jobs"],
    },
    ...(member
      ? [
          {
            href: "/~/vehicles",
            label: "Fleet",
            icon: CarFront,
            match: ["/~/vehicles", "/~/drivers"],
          },
        ]
      : []),
    ...(member?.owner
      ? [
          {
            href: "/~/staff",
            label: "Team",
            icon: Users,
            match: ["/~/staff"],
          },
        ]
      : []),
  ];
}

/** Whether the item is the place open. */
export function isActive(item: NavItem, pathname: string) {
  return (
    (item.href === HOME_PATH && pathname === HOME_PATH) ||
    (item.href !== HOME_PATH && pathname.startsWith(item.href)) ||
    item.match.some((m) => pathname.startsWith(m))
  );
}
