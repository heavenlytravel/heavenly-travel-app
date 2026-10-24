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
  type LocationState,
  type PageStatus,
  type Permission,
  type SetupStep,
} from "@repo/db";
import type { LocationOverview, LocationWithDetails } from "@repo/db/server";
import { ConsoleMenu } from "../../../_components/ConsoleMenu";
import type {
  Menu,
  MenuEntry,
  MenuMark,
  MenuRow,
} from "../../../_components/menu";
import { allLocationsMenu } from "../../../_components/nav";
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

/** "3 vehicles in service, 1 with a document due": a vehicles or drivers row's line, a driver's documents being licences. */
function fleetLine(
  count: string,
  state: string,
  due: number,
  document: "document" | "licence",
) {
  const line = `${count} ${state}`;
  return due === 0 ? line : `${line}, ${due} with a ${document} due`;
}

/** A count at a row's end, or none while there is nothing to count. */
const countOf = (value: number, tone: "brand" | "amber") =>
  value > 0 ? { value, tone } : undefined;

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
 * count. The day's work first (the overview, the bookings awaiting
 * confirmation, the vehicles with a document due, the drivers with a
 * licence due), then what the location sells and where (its classes on
 * sale, its zones, its rates), then its pages and its settings, each a
 * drill whose pages take the menu's place: the location's pages one by one
 * with their standing and its saved addresses; its details, status and
 * deletion, and its history. Last, its public page once it is public. A
 * draft takes no bookings, so it has no Bookings row; the rows of its
 * setup steps carry a mark, ticked once done, and its overview, the
 * checklist, how far it has come. Each row shows only for an admin who may
 * open it. Where a section stands, in a line, is its row's tooltip on the
 * rail. See docs/261023-console-sidebar.md.
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
      detail: detailOf({
        tab: tab.key,
        step: stepOf(tab),
        state,
        overview,
        permissions,
        progress,
      }),
      mark: markOf(tab),
    };
    switch (tab.key) {
      case "overview":
        return {
          ...row,
          exact: true,
          note: draft ? `${progress.done} of ${progress.total}` : undefined,
        };
      case "bookings":
        return {
          ...row,
          count: countOf(overview.awaitingConfirmation, "brand"),
        };
      case "vehicles":
        return { ...row, count: countOf(overview.vehiclesDue, "amber") };
      case "drivers":
        return { ...row, count: countOf(overview.driversDue, "amber") };
      case "pages":
        return {
          ...row,
          drill: {
            label: tab.label,
            entries: [
              { key: "all", label: "All pages", href: row.href },
              ...overview.pages.map((page) => ({
                key: page.page,
                label: LOCATION_PAGE_LABELS[page.page],
                href: locationPageHref(slug, page.page),
                dot: PAGE_DOTS[page.status],
                note: PAGE_STATUS_LABELS[page.status],
              })),
              {
                key: "addresses",
                label: "Saved addresses",
                href: locationAddressesHref(slug),
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
                note: LOCATION_STATE_LABELS[state],
              },
              {
                key: "history",
                label: "History",
                href: locationTabHref(slug, "history"),
                note: overview.changedAt
                  ? formatLocalDate(overview.changedAt)
                  : undefined,
              },
            ],
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
      rowsOf(["overview", "bookings", "vehicles", "drivers"]),
      rowsOf(["vehicle-classes", "coverage", "rates"]),
      [...rowsOf(["pages", "settings"]), ...publicPage],
    ].filter((rows) => rows.length > 0),
    foot: isPublicState(state)
      ? undefined
      : "Not public yet. Staff read the pages through Preview.",
  };
}

/** Where a section of the location stands, in a line: its row's tooltip on the rail. */
function detailOf({
  tab,
  step,
  state,
  overview,
  permissions,
  progress,
}: {
  tab: LocationTab;
  step: SetupStep | undefined;
  state: LocationState;
  overview: LocationOverview;
  permissions: readonly Permission[];
  progress: ReturnType<typeof setupProgress>;
}): string {
  switch (tab) {
    case "overview": {
      if (state === "draft") {
        return `Setup checklist, ${progress.done} of ${progress.total} done`;
      }
      // A team with no queue to work sees the location at a glance.
      if (!permissions.includes("bookings.view")) {
        return "Every part at a glance";
      }
      const today =
        overview.pickupsToday === 0
          ? "No pick-ups today"
          : `${plural(overview.pickupsToday, "pick-up")} today`;
      return overview.awaitingDriver === 0
        ? today
        : `${today}, ${overview.awaitingDriver} awaiting a driver`;
    }
    case "bookings":
      return overview.awaitingConfirmation === 0
        ? "Nothing awaiting confirmation"
        : `${overview.awaitingConfirmation} awaiting confirmation`;
    case "vehicles":
      return fleetLine(
        plural(overview.vehicles, "vehicle"),
        "in service",
        overview.vehiclesDue,
        "document",
      );
    case "drivers":
      return fleetLine(
        plural(overview.drivers, "driver"),
        "active",
        overview.driversDue,
        "licence",
      );
    case "rates":
      return overview.routesPriced === 0
        ? "No routes priced; only hourly hire is sold"
        : `${plural(overview.routesPriced, "route")} priced`;
    case "settings":
      if (state === "live") return "Live, taking bookings";
      if (state === "paused") return "Paused, taking no bookings";
      return progress.next
        ? "Goes live once the setup is done"
        : "Ready to go live";
    default:
      return step?.status ?? "";
  }
}
