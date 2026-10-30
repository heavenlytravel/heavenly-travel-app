import {
  LOCATION_STATE_LABELS,
  locationStateOf,
  type Permission,
} from "@repo/db";
import { CONSOLE_PAGES, pageHref, pageShown } from "../_lib/console-map";
import {
  NEW_LOCATION_PATH,
  dashboardHref,
  newBookingHref,
  newClassHref,
  newDriverHref,
  newVehicleHref,
  newZoneHref,
  savedAddressesHref,
} from "../_lib/routes";
import type { MenuIcon } from "./menu";
import type { PickerLocation } from "./ScopePicker";

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
  location?: PickerLocation;
  /** Other words it is found by: "prices" for Rates. */
  words?: string;
};

export type PaletteIndex = {
  /** Every page, on every location then each location's. */
  pages: PaletteEntry[];
  actions: PaletteEntry[];
  locations: PaletteEntry[];
};

/** The console's pages, actions and locations an admin with these permissions may open. */
export function paletteIndex({
  permissions,
  locations,
}: {
  permissions: readonly Permission[];
  locations: readonly PickerLocation[];
}): PaletteIndex {
  const may = (permission: Permission) => permissions.includes(permission);

  const across: PaletteEntry[] = CONSOLE_PAGES.filter((page) =>
    pageShown(page, { scope: null, permissions }),
  ).map((page) => ({
    href: pageHref(page, null),
    title: page.label,
    meta: page.wide ? undefined : "All locations",
    icon: page.icon,
    words: page.words,
  }));
  const pagesOf = (location: PickerLocation): PaletteEntry[] =>
    CONSOLE_PAGES.filter(
      (page) =>
        !page.wide &&
        pageShown(page, {
          scope: location.slug,
          permissions,
          state: locationStateOf(location.state),
        }),
    )
      .map((page): PaletteEntry => ({
        href: pageHref(page, location.slug),
        title: page.label,
        meta: location.name,
        icon: page.icon,
        words: page.words,
      }))
      // The saved addresses are a card on the location's Pages, found by their own name.
      .concat(
        may("locations.manage")
          ? [
              {
                href: savedAddressesHref(location.slug),
                title: "Saved Addresses",
                meta: location.name,
                icon: "addresses",
                words: "take me here places hotels airport",
              },
            ]
          : [],
      );

  const actions: PaletteEntry[] = [
    ...(may("bookings.create")
      ? [{ href: newBookingHref(null), title: "New Booking", words: "add" }]
      : []),
    ...(may("fleet.manage")
      ? [
          { href: newVehicleHref(null), title: "Add Vehicle", words: "new" },
          { href: newDriverHref(null), title: "Add Driver", words: "new" },
        ]
      : []),
    ...(may("coverage.manage")
      ? [
          {
            href: newClassHref(null),
            title: "Add Vehicle Class",
            words: "new",
          },
          ...locations.flatMap((location) => [
            {
              href: newZoneHref(location.slug),
              title: "Add Zone",
              meta: location.name,
              words: "new coverage",
            },
            {
              href: newClassHref(location.slug),
              title: "Put a Class on Sale",
              meta: location.name,
              words: "add vehicle class offering",
            },
          ]),
        ]
      : []),
    ...(may("locations.create")
      ? [{ href: NEW_LOCATION_PATH, title: "Add Location", words: "new" }]
      : []),
  ];

  return {
    pages: [...across, ...locations.flatMap(pagesOf)],
    actions,
    locations: locations.map((location) => ({
      href: dashboardHref(location.slug),
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
