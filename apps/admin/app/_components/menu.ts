import {
  ActivityIcon,
  BanknoteIcon,
  BusIcon,
  CalendarCheckIcon,
  CarFrontIcon,
  CarIcon,
  ExternalLinkIcon,
  FilesIcon,
  FileTextIcon,
  HistoryIcon,
  HouseIcon,
  IdCardIcon,
  ImageIcon,
  LayoutDashboardIcon,
  MapIcon,
  MapPinIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  UsersIcon,
} from "@repo/ui/icons";

/**
 * The sidebar's menus as data: the rows of the scope the picker is on, in
 * named parts, each row with its count or its setup mark, and the rows
 * that open a menu of their own in the sidebar's place, under a way back
 * (a drill: Fleet, a location's Pages, Settings).
 * Built on the server, where the counts are read, and drawn in the browser
 * by `ConsoleMenu`; an icon travels by its name, so nothing made on the
 * server reaches a row. See docs/261023-console-sidebar.md.
 */

/**
 * Each row's and each drill page's icon by its name. A location's tabs
 * and the sections across locations share them, so a page keeps its icon
 * in either scope. A location's overview has the location's own mark
 * instead (`MenuRow.location`), as the picker has it, so the menu says
 * which location it is about.
 */
export const MENU_ICONS = {
  overview: LayoutDashboardIcon,
  bookings: CalendarCheckIcon,
  fleet: CarFrontIcon,
  vehicles: CarIcon,
  drivers: IdCardIcon,
  "vehicle-classes": BusIcon,
  coverage: MapIcon,
  rates: BanknoteIcon,
  pages: FilesIcon,
  page: FileTextIcon,
  addresses: MapPinIcon,
  "home-page": HouseIcon,
  settings: SettingsIcon,
  general: SlidersHorizontalIcon,
  history: HistoryIcon,
  users: UsersIcon,
  admins: ShieldCheckIcon,
  activity: ActivityIcon,
  media: ImageIcon,
  "public-page": ExternalLinkIcon,
};

export type MenuIcon = keyof typeof MENU_ICONS;

/** Where a setup step of a draft stands, at the end of the row that holds it. */
export type MenuMark = "todo" | "done";

/** What waits on a row, at its end. */
export type MenuCount = { value: number; tone: "brand" | "amber" };

/** One row of a drill's menu: a page of its section. */
export type MenuEntry = {
  key: string;
  label: string;
  href: string;
  icon: MenuIcon;
  /** What stands at the row's end: a page's standing, a date. */
  note?: string;
  /** What waits on the page, at the row's end. None while nothing does. */
  count?: MenuCount;
  /** The setup step the page holds, while the location is a draft. */
  mark?: MenuMark;
  /** A disc before the label: a page's standing. */
  dot?: "green" | "amber" | "grey";
};

/** One row of a menu: a section. */
export type MenuRow = {
  key: string;
  label: string;
  /** Where the row leads; for a drill, its first page. */
  href: string;
  icon: MenuIcon;
  /** The location the row is the overview of: its mark stands for the icon, as in the picker. */
  location?: { name: string; state: string };
  /** Other paths that are the section too, each with the paths under it: the class catalogue is Vehicles'. */
  paths?: readonly string[];
  /** Only the row's own address is its section, not the paths under it: an overview. */
  exact?: boolean;
  /** Where the section stands, in a line: the row's tooltip on the rail. */
  detail?: string;
  /** What waits on the section, at the row's end. None while nothing does. */
  count?: MenuCount;
  /** A short note at the row's end: how far a draft's setup has come. */
  note?: string;
  /** The setup step the row holds, while the location is a draft. */
  mark?: MenuMark;
  /** Opens in a new tab: the public page. */
  external?: boolean;
  /** The section's pages, listed in place of the menu while one of them is on screen. */
  drill?: { label: string; entries: readonly MenuEntry[] };
};

/** A part of a menu: its rows under its name. The first part, the day's work, has none. */
export type MenuPart = { label?: string; rows: readonly MenuRow[] };

/** A scope's menu: its parts in order, and a line under them. */
export type Menu = {
  /** Its name, for assistive technology and the way back from a drill: "All locations", "Langkawi". */
  label: string;
  parts: readonly MenuPart[];
  /** Under the last part: "Not public yet." */
  foot?: string;
};

/** The path of a link, without its query or its hash. */
export function pathOf(href: string) {
  return href.split(/[?#]/)[0] ?? href;
}

/** The path is this one or under it. */
function within(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

/** A drill's pages, without the jumps to a part of one: a jump is never the page on screen. */
const pagesOf = (entries: readonly MenuEntry[]) =>
  entries.filter((entry) => !entry.href.includes("#"));

/** The path is in the row's section: its own address, its other paths, or a page of its drill. */
export function rowHolds(row: MenuRow, pathname: string): boolean {
  const own = pathOf(row.href);
  if (row.exact ? pathname === own : within(pathname, own)) return true;
  return [
    ...(row.paths ?? []),
    ...pagesOf(row.drill?.entries ?? []).map((entry) => pathOf(entry.href)),
  ].some((path) => within(pathname, path));
}

/** The row of the section on screen. */
export function rowOnScreen(menu: Menu, pathname: string): MenuRow | undefined {
  return menu.parts
    .flatMap((part) => part.rows)
    .find((row) => rowHolds(row, pathname));
}

/** The page of a drill on screen: the one with the longest address that the path is, or is under. */
export function entryOnScreen(
  entries: readonly MenuEntry[],
  pathname: string,
): MenuEntry | undefined {
  let found: MenuEntry | undefined;
  for (const entry of pagesOf(entries)) {
    const path = pathOf(entry.href);
    if (!within(pathname, path)) continue;
    if (!found || path.length > pathOf(found.href).length) found = entry;
  }
  return found;
}
