import {
  ActivityIcon,
  BanknoteIcon,
  BuildingIcon,
  BusIcon,
  CalendarCheckIcon,
  CarFrontIcon,
  CarIcon,
  FilesIcon,
  FileTextIcon,
  Grid3x3Icon,
  HouseIcon,
  IdCardIcon,
  ImageIcon,
  KanbanIcon,
  LayoutDashboardIcon,
  MapIcon,
  MapPinIcon,
  RouteIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  TagIcon,
  UserRoundIcon,
  UsersIcon,
} from "@repo/ui/icons";

/**
 * The sidebar's menu as data: its groups, each section with its pages,
 * each row with what waits on it or its setup mark. Built on the server
 * from the console map (`_lib/console-map.ts`), where the counts are read,
 * and drawn in the browser by `ConsoleMenu`; an icon travels by its name,
 * so nothing made on the server reaches a row.
 */

/** Each row's icon by its name; the search's rows share them. */
export const MENU_ICONS = {
  dashboard: LayoutDashboardIcon,
  bookings: CalendarCheckIcon,
  board: KanbanIcon,
  fleet: CarFrontIcon,
  vehicles: CarIcon,
  drivers: IdCardIcon,
  vendors: BuildingIcon,
  classes: BusIcon,
  coverage: MapIcon,
  rates: BanknoteIcon,
  "rate-classes": TagIcon,
  "rate-grid": Grid3x3Icon,
  "rate-rules": SlidersHorizontalIcon,
  "rate-try": RouteIcon,
  website: HouseIcon,
  connect: BuildingIcon,
  pages: FilesIcon,
  page: FileTextIcon,
  addresses: MapPinIcon,
  media: ImageIcon,
  team: UsersIcon,
  staff: ShieldCheckIcon,
  customers: UserRoundIcon,
  activity: ActivityIcon,
  settings: SettingsIcon,
};

export type MenuIcon = keyof typeof MENU_ICONS;

/** Where a setup step of a draft stands, at the end of the row that holds it. */
export type MenuMark = "todo" | "done";

/** What waits on a row, at its end, and what it stands for, read out in place of the pill: "3 received". */
export type MenuCount = { value: number; label: string };

/** One page's row: under its section, or the section's own row when it is the section's one page. */
export type MenuPage = {
  key: string;
  label: string;
  href: string;
  icon: MenuIcon;
  /** Only its own address is the page, not the paths under it: the dashboard. */
  exact?: boolean;
  count?: MenuCount;
  mark?: MenuMark;
};

/** A section: one page, a row of its own, or several, which open in place under its row. */
export type MenuSection = {
  key: string;
  label: string;
  icon: MenuIcon;
  pages: readonly MenuPage[];
  /** What waits on its pages, together, on its row while it is closed. */
  count?: MenuCount;
  /** A setup step one of its pages holds. */
  mark?: MenuMark;
};

export type MenuGroup = {
  key: string;
  label: string;
  sections: readonly MenuSection[];
};

/** The menu: its groups, and a line under them. */
export type Menu = {
  /** For assistive technology: "Console menu, Langkawi". */
  label: string;
  groups: readonly MenuGroup[];
  /** Under the last group: "Not public yet." */
  foot?: string;
};

/** The path of a link, without its query or its hash. */
export function pathOf(href: string) {
  return href.split(/[?#]/)[0] ?? href;
}

/** The page on screen: the one whose address is the longest the path is, or is under. */
export function pageOnScreen(
  menu: Menu,
  pathname: string,
): { section: MenuSection; page: MenuPage } | undefined {
  let found: { section: MenuSection; page: MenuPage } | undefined;
  let best = -1;
  for (const group of menu.groups) {
    for (const section of group.sections) {
      for (const page of section.pages) {
        const path = pathOf(page.href);
        const holds = page.exact
          ? pathname === path
          : pathname === path || pathname.startsWith(`${path}/`);
        if (holds && path.length > best) {
          found = { section, page };
          best = path.length;
        }
      }
    }
  }
  return found;
}
