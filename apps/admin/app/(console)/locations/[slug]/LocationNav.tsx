import {
  LOCATION_PAGE_LABELS,
  LOCATION_STATE_LABELS,
  PAGE_STATUS_LABELS,
  formatLocalDate,
  isPublicState,
  locationStateOf,
  plural,
  setupProgress,
  setupSteps,
  type PageStatus,
  type Permission,
} from "@repo/db";
import type { LocationOverview, LocationWithDetails } from "@repo/db/server";
import { ConsoleMenu } from "../../../_components/ConsoleMenu";
import type {
  Menu,
  MenuCount,
  MenuEntry,
  MenuMark,
  MenuRow,
} from "../../../_components/menu";
import { MENU_PART_LABELS, allLocationsMenu } from "../../../_components/nav";
import { getPermissions } from "../../../_lib/access";
import {
  locationAddressesHref,
  locationPageHref,
  locationTabHref,
  locationTabsMayOpen,
  type LocationTab,
  type LocationTabDef,
} from "../../../_lib/routes";
import { locationPublicUrl } from "../../../_lib/site";
import {
  locationDetails,
  locationIdOf,
  locationOverview,
} from "../_lib/location-data";

const PAGE_DOTS: Record<PageStatus, MenuEntry["dot"]> = {
  unpublished: "grey",
  published: "green",
  changed: "amber",
};

/** A count at a row's end with what it stands for, or none while there is nothing to count. */
const countOf = (
  value: number,
  tone: MenuCount["tone"],
  label: string,
): MenuCount | undefined => (value > 0 ? { value, tone, label } : undefined);

/** The tabs Fleet holds, in its drill's order: a vehicle is of a model of a class. */
const FLEET_TABS: readonly LocationTab[] = [
  "vehicles",
  "drivers",
  "vehicle-classes",
];

/**
 * The Fleet row over the rows of its tabs the admin may open, each a page
 * of its drill with its own count and setup mark, and its own icon on the
 * rail. The row sums the documents due, in their words together, and
 * carries the classes' setup mark. One tab alone is its own row, none is
 * no row.
 */
function fleetRow(rows: readonly MenuRow[]): MenuRow[] {
  const [first] = rows;
  if (!first) return [];
  if (rows.length === 1) return [first];
  const counts = rows.flatMap((row) => (row.count ? [row.count] : []));
  const due = counts.reduce((sum, count) => sum + count.value, 0);
  return [
    {
      key: "fleet",
      label: "Fleet",
      href: first.href,
      icon: "fleet",
      count: countOf(
        due,
        "amber",
        counts.map((count) => count.label).join(", "),
      ),
      mark: rows.find((row) => row.mark)?.mark,
      drill: {
        label: "Fleet",
        entries: rows.map((row) => ({
          key: row.key,
          label: row.label,
          href: row.href,
          icon: row.icon,
          count: row.count,
          mark: row.mark,
        })),
        spreadOnRail: true,
      },
    },
  ];
}

/**
 * The sidebar's menu while the picker is on a location, read for the
 * `@scope` slot. A slug no location has (an address from before the slugs,
 * on its way to its location) falls back to every location.
 */
export async function LocationScopeNav({ slug }: { slug: string }) {
  const [id, permissions] = await Promise.all([
    locationIdOf(slug),
    getPermissions(),
  ]);
  const fallback = <ConsoleMenu menu={allLocationsMenu(permissions)} />;
  if (!id) return fallback;
  const [location, overview] = await Promise.all([
    locationDetails(id),
    locationOverview(id),
  ]);
  if (!location || !overview) return fallback;
  return (
    <ConsoleMenu menu={locationMenu({ location, overview, permissions })} />
  );
}

/**
 * A location's menu: that location alone, its rows in the same places in
 * every state, each with its icon and, where something waits on it, a
 * count. The overview has the location's mark for its icon, as the picker
 * has, so the menu says whose it is. The day's work first (the overview,
 * the bookings awaiting confirmation, and Fleet, a drill: the vehicles
 * with a document due, the drivers with a licence due, the classes on
 * sale), then, under Selling, its zones and its rates, then, under Manage,
 * its pages and its settings, each a drill whose pages take the menu's
 * place: the location's pages one by one with their standing and its
 * saved addresses; its details, status and deletion, and its history.
 * Last, its public page once it is public. A
 * draft takes no bookings, so it has no Bookings row; the rows of its
 * setup steps carry a mark, ticked once done, and its overview, the
 * checklist, how far it has come. Each row shows only for an admin who may
 * open it. See docs/261023-console-sidebar.md.
 */
function locationMenu({
  location,
  overview,
  permissions,
}: {
  location: LocationWithDetails;
  overview: LocationOverview;
  permissions: readonly Permission[];
}): Menu {
  const slug = location.slug;
  const state = locationStateOf(location.state);
  const draft = state === "draft";
  const steps = setupSteps(location.pages, overview);
  const progress = setupProgress(steps);
  const stepOf = (tab: LocationTabDef) =>
    steps.find((step) => step.key === tab.step);
  const markOf = (tab: LocationTabDef): MenuMark | undefined => {
    const step = stepOf(tab);
    if (!draft || !step) return undefined;
    return step.done ? "done" : "todo";
  };

  const rowOf = (tab: LocationTabDef): MenuRow => {
    const row: MenuRow = {
      key: tab.key,
      label: tab.label,
      href: locationTabHref(slug, tab.key),
      icon: tab.key,
      mark: markOf(tab),
    };
    switch (tab.key) {
      case "overview":
        return {
          ...row,
          location: { name: location.name, state: location.state },
          exact: true,
          note: draft ? `${progress.done} of ${progress.total}` : undefined,
        };
      case "bookings":
        return {
          ...row,
          count: countOf(
            overview.awaitingConfirmation,
            "brand",
            `${overview.awaitingConfirmation} awaiting confirmation`,
          ),
        };
      case "vehicles":
        return {
          ...row,
          count: countOf(
            overview.vehiclesDue,
            "amber",
            `${plural(overview.vehiclesDue, "vehicle")} with a document due`,
          ),
        };
      case "drivers":
        return {
          ...row,
          count: countOf(
            overview.driversDue,
            "amber",
            `${plural(overview.driversDue, "driver")} with a licence due`,
          ),
        };
      case "pages":
        return {
          ...row,
          drill: {
            label: tab.label,
            entries: [
              {
                key: "all",
                label: "All pages",
                href: row.href,
                icon: "pages",
              },
              ...overview.pages.map((page): MenuEntry => ({
                key: page.page,
                label: LOCATION_PAGE_LABELS[page.page],
                href: locationPageHref(slug, page.page),
                icon: "page",
                dot: PAGE_DOTS[page.status],
                note: PAGE_STATUS_LABELS[page.status],
              })),
              {
                key: "addresses",
                label: "Saved addresses",
                href: locationAddressesHref(slug),
                icon: "addresses",
                note: String(location.addresses.length),
              },
            ],
          },
        };
      case "settings":
        return {
          ...row,
          drill: {
            label: tab.label,
            entries: [
              {
                key: "general",
                label: "General",
                href: row.href,
                icon: "general",
                note: LOCATION_STATE_LABELS[state],
              },
              {
                key: "history",
                label: "History",
                href: locationTabHref(slug, "history"),
                icon: "history",
                note: overview.changedAt
                  ? formatLocalDate(overview.changedAt)
                  : undefined,
              },
            ],
            spreadOnRail: true,
          },
        };
      default:
        return row;
    }
  };

  const tabs = locationTabsMayOpen(state, permissions);
  // The history is the second page of Settings, not a row of its own.
  const rowsOf = (keys: readonly LocationTab[]) =>
    tabs.filter((tab) => keys.includes(tab.key)).map(rowOf);
  const fleet = fleetRow(rowsOf(FLEET_TABS));
  const publicPage: MenuRow[] = isPublicState(state)
    ? [
        {
          key: "public-page",
          label: "Open the public page",
          href: locationPublicUrl(slug),
          icon: "public-page",
          external: true,
        },
      ]
    : [];

  return {
    label: location.name,
    parts: [
      { rows: [...rowsOf(["overview", "bookings"]), ...fleet] },
      {
        label: MENU_PART_LABELS.selling,
        rows: rowsOf(["coverage", "rates"]),
      },
      {
        label: MENU_PART_LABELS.manage,
        rows: [...rowsOf(["pages", "settings"]), ...publicPage],
      },
    ].filter((part) => part.rows.length > 0),
    foot: isPublicState(state)
      ? undefined
      : "Not public yet. Staff read the pages through Preview.",
  };
}
