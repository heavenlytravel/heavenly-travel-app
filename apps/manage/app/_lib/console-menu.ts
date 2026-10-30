import "server-only";
import {
  isPublicState,
  locationStateOf,
  plural,
  setupSteps,
  type Permission,
  type SetupStepKey,
} from "@repo/db";
import { countPendingVendors, type LocationOverview } from "@repo/db/server";
import type {
  Menu,
  MenuCount,
  MenuMark,
  MenuPage,
  MenuSection,
} from "../_components/menu";
import {
  CONSOLE_GROUPS,
  CONSOLE_SECTIONS,
  pageHref,
  pageShown,
  type MenuFor,
} from "./console-map";
import { locationOverview, locationOverviews } from "./location-data";
import type { ConsoleScope } from "./scope";

/** What waits, in the scope: the bookings received, the vehicles and drivers with a document due. */
type Waiting = { received: number; vehiclesDue: number; driversDue: number };

/** A count with what it stands for, or none while there is nothing to count. */
const countOf = (value: number, label: string): MenuCount | undefined =>
  value > 0 ? { value, label } : undefined;

/** Each page's count, by its key: counts only where something waits. */
function countsOf(waiting: Waiting): Record<string, MenuCount | undefined> {
  return {
    bookings: countOf(waiting.received, `${waiting.received} received`),
    vehicles: countOf(
      waiting.vehiclesDue,
      `${plural(waiting.vehiclesDue, "vehicle")} with a document due`,
    ),
    drivers: countOf(
      waiting.driversDue,
      `${plural(waiting.driversDue, "driver")} with a licence due`,
    ),
  };
}

/** The sum of what waits at every location. */
function sumOf(overviews: readonly LocationOverview[]): Waiting {
  return overviews.reduce(
    (sum, overview) => ({
      received: sum.received + overview.awaitingConfirmation,
      vehiclesDue: sum.vehiclesDue + overview.vehiclesDue,
      driversDue: sum.driversDue + overview.driversDue,
    }),
    { received: 0, vehiclesDue: 0, driversDue: 0 },
  );
}

/**
 * The sidebar's menu in a scope, for this admin: the same groups and
 * sections in every scope, a row hidden only by permission, by a draft
 * location's state (it has no Bookings yet), never moved. A console-wide
 * row (Media, Team) leads to `~` from a location. Without `counts`, the
 * menu alone, drawn at once while the counts load: the received bookings
 * and the documents due, summed under `~`, and a draft location's setup
 * marks, and under `~` the vendors waiting for approval. See
 * docs/261029-manage-signature-overhaul.md, "The menu".
 */
export async function consoleMenu(
  scope: ConsoleScope,
  permissions: readonly Permission[],
  counts: boolean,
): Promise<Menu> {
  const state = scope.location
    ? locationStateOf(scope.location.state)
    : undefined;
  const at: MenuFor = { scope: scope.slug, permissions, state };

  let waiting: Waiting | null = null;
  let marks: Partial<Record<SetupStepKey, MenuMark>> = {};
  if (counts && scope.location) {
    const overview = await locationOverview(scope.location.id);
    if (overview) {
      waiting = sumOf([overview]);
      if (state === "draft") {
        marks = Object.fromEntries(
          setupSteps(overview.pages, overview).map((step) => [
            step.key,
            step.done ? "done" : "todo",
          ]),
        );
      }
    }
  } else if (counts) {
    waiting = sumOf(await locationOverviews());
  }
  const pageCounts: Record<string, MenuCount | undefined> = waiting
    ? countsOf(waiting)
    : {};
  // The vendors waiting for a SUPER's review, on every location's Vendors.
  if (counts && !scope.location && permissions.includes("vendors.review")) {
    const pending = await countPendingVendors();
    pageCounts.vendors = countOf(
      pending,
      `${plural(pending, "vendor")} waiting for approval`,
    );
  }

  const groups = CONSOLE_GROUPS.map((group) => ({
    key: group.key,
    label: group.label,
    sections: CONSOLE_SECTIONS.filter(
      (section) => section.group === group.key,
    ).flatMap((section): MenuSection[] => {
      const pages = section.pages
        .filter((page) => pageShown(page, at))
        .map((page): MenuPage => ({
          key: page.key,
          label: page.label,
          href: pageHref(page, scope.slug),
          icon: page.icon,
          exact: page.path === "" || undefined,
          count: pageCounts[page.key],
          mark: page.step ? marks[page.step] : undefined,
        }));
      if (pages.length === 0) return [];
      const waits = pages.flatMap((page) => (page.count ? [page.count] : []));
      return [
        {
          key: section.key,
          label: section.label,
          icon: section.icon,
          pages,
          count: countOf(
            waits.reduce((sum, count) => sum + count.value, 0),
            waits.map((count) => count.label).join(", "),
          ),
          mark: pages.find((page) => page.mark)?.mark,
        },
      ];
    }),
  })).filter((group) => group.sections.length > 0);

  return {
    label: scope.location?.name ?? "All locations",
    groups,
    foot:
      state && !isPublicState(state)
        ? "Not public yet. Staff read the pages through Preview."
        : undefined,
  };
}
