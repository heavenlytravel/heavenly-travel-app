import {
  LOCATION_STATE_LABELS,
  locationStateOf,
  type Permission,
} from "@repo/db";
import {
  NEW_BOOKING_PATH,
  NEW_LOCATION_PATH,
  NEW_VEHICLE_CLASS_PATH,
  RATES_PART_LABELS,
  locationHref,
  locationRatesPartHref,
  locationTabHref,
  locationTabsMayOpen,
  newDriverHref,
  newLocationOfferingHref,
  newLocationZoneHref,
  newVehicleHref,
  type RatesPart,
} from "../_lib/routes";
import type { SidebarLocation } from "./AppSidebar";
import type { MenuIcon } from "./menu";
import { ALL_LOCATIONS_NAV, viewsFor } from "./nav";

/**
 * What the console's search finds without asking the server: its pages,
 * the things it adds, and the locations, out of what the console already
 * holds, so they show as soon as a key is pressed. Records are asked of
 * `SEARCH_PATH`. Each is offered only to an admin who may open it.
 */

/** One page, action or location the palette lists. */
export type PaletteEntry = {
  href: string;
  title: string;
  /** At the line's end: the location a page or an action is of, a location's state. */
  meta?: string;
  /** A page's icon; an action has the add icon, a location its mark. */
  icon?: MenuIcon;
  /** A location, drawn with its mark. */
  location?: SidebarLocation;
  /** Other words it is found by: "prices" for Rates. */
  words?: string;
};

export type PaletteIndex = {
  /** Every page, across locations then each location's. */
  pages: PaletteEntry[];
  actions: PaletteEntry[];
  locations: PaletteEntry[];
};

/** Words a page is found by beside its name. */
const PAGE_WORDS: Partial<Record<MenuIcon, string>> = {
  overview: "home dashboard",
  vehicles: "fleet cars plates",
  drivers: "fleet",
  "vehicle-classes": "fleet catalogue",
  coverage: "zones map",
  rates: "prices grid",
  pages: "content",
  "home-page": "top choices",
  users: "accounts customers",
  admins: "staff teams",
  activity: "log",
  media: "images uploads",
};

/**
 * The parts of a location's Rates found by their own names, beside the
 * tab: the trip rules and Try a trip, which staff look for by name. The
 * class rates and the grid are what the tab itself is found by.
 */
const RATES_PARTS_FOUND: Partial<Record<RatesPart, string>> = {
  rules: "surcharge odd hours weekend holiday extra km cross-location",
  tryTrip: "quote price check",
};

/** The console's pages, actions and locations an admin with these permissions may open. */
export function paletteIndex({
  permissions,
  locations,
}: {
  permissions: readonly Permission[];
  locations: readonly SidebarLocation[];
}): PaletteIndex {
  const may = (permission: Permission) => permissions.includes(permission);

  const across: PaletteEntry[] = ALL_LOCATIONS_NAV.flatMap((part) =>
    part.sections.flatMap((section) =>
      viewsFor(section, permissions).map((view) => ({
        href: view.href,
        title: view.label,
        meta: "All locations",
        icon: view.icon,
        words: PAGE_WORDS[view.icon],
      })),
    ),
  );
  const tabsOf = (location: SidebarLocation): PaletteEntry[] =>
    locationTabsMayOpen(locationStateOf(location.state), permissions).flatMap(
      (tab) => [
        {
          href: locationTabHref(location.slug, tab.key),
          title: tab.label,
          meta: location.name,
          icon: tab.key,
          words: PAGE_WORDS[tab.key],
        },
        ...(tab.key === "rates"
          ? (Object.keys(RATES_PARTS_FOUND) as RatesPart[]).map((part) => ({
              href: locationRatesPartHref(location.slug, part),
              title: RATES_PART_LABELS[part],
              meta: location.name,
              icon: tab.key,
              words: RATES_PARTS_FOUND[part],
            }))
          : []),
      ],
    );

  const actions: PaletteEntry[] = [
    ...(may("bookings.create")
      ? [{ href: NEW_BOOKING_PATH, title: "New booking", words: "add" }]
      : []),
    ...(may("fleet.manage")
      ? [
          { href: newVehicleHref(), title: "Add vehicle", words: "new" },
          { href: newDriverHref(), title: "Add driver", words: "new" },
        ]
      : []),
    ...(may("coverage.manage")
      ? [
          {
            href: NEW_VEHICLE_CLASS_PATH,
            title: "Add vehicle class",
            words: "new",
          },
          ...locations.flatMap((location) => [
            {
              href: newLocationZoneHref(location.slug),
              title: "Add zone",
              meta: location.name,
              words: "new coverage",
            },
            {
              href: newLocationOfferingHref(location.slug),
              title: "Put a class on sale",
              meta: location.name,
              words: "add vehicle class offering",
            },
          ]),
        ]
      : []),
    ...(may("locations.manage")
      ? [{ href: NEW_LOCATION_PATH, title: "Add location", words: "new" }]
      : []),
  ];

  return {
    pages: [...across, ...locations.flatMap(tabsOf)],
    actions,
    locations: locations.map((location) => ({
      href: locationHref(location.slug),
      title: location.name,
      meta: LOCATION_STATE_LABELS[locationStateOf(location.state)],
      location,
    })),
  };
}

/** The entries that hold every word of the search, in their name, their meta or their other words. */
export function entriesMatching(
  entries: readonly PaletteEntry[],
  search: string,
): PaletteEntry[] {
  const words = search.toLowerCase().split(" ").filter(Boolean);
  return entries.filter((entry) => {
    const text =
      `${entry.title} ${entry.meta ?? ""} ${entry.words ?? ""}`.toLowerCase();
    return words.every((word) => text.includes(word));
  });
}
