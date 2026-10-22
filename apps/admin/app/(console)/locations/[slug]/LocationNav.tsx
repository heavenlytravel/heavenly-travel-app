import Link from "next/link";
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_LABELS,
  DROPOFF_RULE_SHORT_LABELS,
  LOCATION_PAGE_LABELS,
  PAGE_STATUS_LABELS,
  dropoffRuleOf,
  formatLocalDate,
  isPublicState,
  locationStateOf,
  oddHoursLabel,
  oddHoursOf,
  plural,
  setupProgress,
  setupSteps,
  type LocationState,
  type PageStatus,
  type Permission,
  type SetupStep,
} from "@repo/db";
import type { LocationOverview, LocationWithDetails } from "@repo/db/server";
import { AllLocationsMenu } from "../../../_components/AppSidebar";
import { getPermissions } from "../../../_lib/access";
import {
  locationBookingsHref,
  locationDriversHref,
  locationOfferingHref,
  locationAddressesHref,
  locationPageHref,
  locationRatesPartHref,
  locationTabHref,
  locationTabsFor,
  locationVehiclesHref,
  locationZoneHref,
  newLocationDriverHref,
  newLocationOfferingHref,
  newLocationVehicleHref,
  newLocationZoneHref,
  setupStepTab,
  type LocationTab,
} from "../../../_lib/routes";
import { locationPublicUrl } from "../../../_lib/site";
import { SetupBar } from "../_components/SetupBar";
import { LOCATION_TAB_ICONS } from "../_components/TabIcon";
import {
  locationDetails,
  locationIdOf,
  locationOfferings,
  locationOverview,
  locationZoneNames,
} from "../_lib/location-data";
import {
  LocationNavMenu,
  type LocationNavGroup,
  type LocationNavItem,
  type LocationNavSection,
} from "./LocationNavMenu";

const PAGE_DOTS: Record<PageStatus, LocationNavItem["dot"]> = {
  unpublished: "grey",
  published: "green",
  changed: "amber",
};

/** "3 vehicles in service, 1 with a document due": a vehicles or drivers tab's line, a driver's documents being licences. */
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
 * The sidebar's sections while the picker is on a location, read for the
 * `@scope` slot: the location, its numbers, and for an admin who may
 * change the coverage its zones and classes, which fill the submenus of
 * the tabs Operation opens. A slug no location has (an address from
 * before the slugs, on its way to its location) falls back to every
 * location.
 */
export async function LocationScopeNav({ slug }: { slug: string }) {
  const [id, permissions] = await Promise.all([
    locationIdOf(slug),
    getPermissions(),
  ]);
  if (!id) return <AllLocationsMenu permissions={permissions} />;
  const listsThem = permissions.includes("coverage.manage");
  const [location, overview, zones, offerings] = await Promise.all([
    locationDetails(id),
    locationOverview(id),
    listsThem ? locationZoneNames(id) : [],
    listsThem ? locationOfferings(id) : [],
  ]);
  if (!location || !overview) {
    return <AllLocationsMenu permissions={permissions} />;
  }
  return (
    <LocationNav
      location={location}
      overview={overview}
      state={locationStateOf(location.state)}
      steps={setupSteps(location.pages, overview)}
      permissions={permissions}
      zones={zones}
      offerings={offerings.map((offering) => ({
        id: offering.id,
        name: offering.vehicleClass.name,
        onSale: offering.isActive && offering.vehicleClass.isActive,
      }))}
    />
  );
}

/**
 * A location's sections in the sidebar, under its name, each a row with
 * its icon and, where something waits on it, a count: the bookings
 * awaiting confirmation, the vehicles with a document due, the drivers
 * with a licence due. Where a section has something to list, a submenu
 * holds it: the classes, the zones, the parts of the rates, the pages and
 * their saved addresses, the bookings by status, the vehicles and drivers
 * due. A draft is set up before anything else: its overview stands alone
 * on top, then the Setup group with how far it has come and what to do
 * next, its steps numbered. Once live or paused the day comes first: Today,
 * the bookings, the vehicles, the drivers and the pages; the setup, done
 * once and rarely touched, folds away under it. Last, the history and the
 * public page. Each group shows only what the admin may open. Where each
 * section stands, in a line, is its row's tooltip on the rail. See
 * docs/261022-console-scope.md and
 * docs/261018-location-work-and-class-catalogue.md.
 */
export function LocationNav({
  location,
  overview,
  steps,
  state,
  permissions,
  zones,
  offerings,
}: {
  location: LocationWithDetails;
  overview: LocationOverview;
  steps: readonly SetupStep[];
  state: LocationState;
  permissions: readonly Permission[];
  /** The zones, for the Coverage submenu; empty for an admin who cannot open it. */
  zones: readonly { id: string; name: string }[];
  /** The classes sold here, for the Vehicle classes submenu. */
  offerings: readonly { id: string; name: string; onSale: boolean }[];
}) {
  const may = (permission: Permission) => permissions.includes(permission);
  const slug = location.slug;
  const settingUp = state === "draft";
  const progress = setupProgress(steps);
  const nextTab = progress.next ? setupStepTab(progress.next.key) : null;
  const nextHref =
    nextTab && may(nextTab.permission)
      ? locationTabHref(slug, nextTab.key)
      : null;

  const detailOf = (tab: LocationTab) => {
    const step = steps.find((entry) => entry.key === tab);
    if (step) return step.status;
    if (tab === "bookings") {
      return overview.awaitingConfirmation === 0
        ? "Nothing awaiting confirmation"
        : `${overview.awaitingConfirmation} awaiting confirmation`;
    }
    if (tab === "rates") {
      return overview.routesPriced === 0
        ? "No routes priced; trips are metered"
        : `${plural(overview.routesPriced, "route")} priced`;
    }
    if (tab === "vehicles") {
      return fleetLine(
        plural(overview.vehicles, "vehicle"),
        "in service",
        overview.vehiclesDue,
        "document",
      );
    }
    if (tab === "drivers") {
      return fleetLine(
        plural(overview.drivers, "driver"),
        "active",
        overview.driversDue,
        "licence",
      );
    }
    if (tab === "status") {
      if (state === "live") return "Live, taking bookings";
      if (state === "paused") return "Paused, taking no bookings";
      return progress.next
        ? "Goes live once the setup is done"
        : "Ready to go live";
    }
    if (tab === "history") {
      return overview.changedAt
        ? `Last change ${formatLocalDate(overview.changedAt)}`
        : "No changes recorded";
    }
    if (settingUp) return "Setup checklist";
    // A team with no queue to work sees the location at a glance.
    if (!may("bookings.view")) return "Every part at a glance";
    const today =
      overview.pickupsToday === 0
        ? "No pick-ups today"
        : `${plural(overview.pickupsToday, "pick-up")} today`;
    return overview.awaitingDriver === 0
      ? today
      : `${today}, ${overview.awaitingDriver} awaiting a driver`;
  };
  const surcharge = oddHoursOf(location);
  // Adding a class or a zone is Operation's; the teams that read see the tab.
  const adds = may("coverage.manage");
  const itemsOf = (tab: LocationTab): LocationNavItem[] => {
    switch (tab) {
      case "vehicle-classes":
        return [
          ...offerings.map((offering) => ({
            key: offering.id,
            label: offering.name,
            href: locationOfferingHref(slug, offering.id),
            dot: offering.onSale ? ("green" as const) : ("grey" as const),
            note: offering.onSale ? undefined : "Off sale",
          })),
          ...(adds
            ? [
                {
                  key: "new",
                  label: "Add class",
                  href: newLocationOfferingHref(slug),
                },
              ]
            : []),
        ];
      case "coverage":
        return [
          ...zones.map((zone) => ({
            key: zone.id,
            label: zone.name,
            href: locationZoneHref(slug, zone.id),
          })),
          ...(adds
            ? [
                {
                  key: "new",
                  label: "Add zone",
                  href: newLocationZoneHref(slug),
                },
              ]
            : []),
        ];
      case "rates":
        return [
          {
            key: "metered",
            label: "Metered rates",
            href: locationRatesPartHref(slug, "metered"),
            note: plural(
              offerings.filter((offering) => offering.onSale).length,
              "class",
              "classes",
            ),
          },
          {
            key: "grid",
            label: "Rate grid",
            href: locationRatesPartHref(slug, "grid"),
            note: plural(overview.routesPriced, "route"),
          },
          {
            key: "dropoffs",
            label: "Drop-offs",
            href: locationRatesPartHref(slug, "dropoffs"),
            note: DROPOFF_RULE_SHORT_LABELS[dropoffRuleOf(location)],
          },
          {
            key: "odd-hours",
            label: "Odd hours",
            href: locationRatesPartHref(slug, "oddHours"),
            note: surcharge ? oddHoursLabel(surcharge) : "Off",
          },
        ];
      case "pages":
        return [
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
        ];
      case "vehicles":
        return [
          {
            key: "due",
            label: "Documents due",
            href: locationVehiclesHref(slug, { due: true }),
            note:
              overview.vehiclesDue > 0
                ? String(overview.vehiclesDue)
                : undefined,
          },
          {
            key: "new",
            label: "Add vehicle",
            href: newLocationVehicleHref(slug),
          },
        ];
      case "drivers":
        return [
          {
            key: "due",
            label: "Licences due",
            href: locationDriversHref(slug, { due: true }),
            note:
              overview.driversDue > 0 ? String(overview.driversDue) : undefined,
          },
          {
            key: "new",
            label: "Add driver",
            href: newLocationDriverHref(slug),
          },
        ];
      case "bookings":
        return BOOKING_STATUSES.map((status) => ({
          key: status,
          label: BOOKING_STATUS_LABELS[status],
          href: locationBookingsHref(slug, { status }),
          note:
            status === "received" && overview.awaitingConfirmation > 0
              ? String(overview.awaitingConfirmation)
              : undefined,
        }));
      default:
        return [];
    }
  };
  const tabs = locationTabsFor(state).filter((tab) => may(tab.permission));
  const countFor = (tab: LocationTab) =>
    tab === "bookings"
      ? countOf(overview.awaitingConfirmation, "brand")
      : tab === "vehicles"
        ? countOf(overview.vehiclesDue, "amber")
        : tab === "drivers"
          ? countOf(overview.driversDue, "amber")
          : undefined;
  const sectionOf = (tab: (typeof tabs)[number]): LocationNavSection => {
    const index = steps.findIndex((step) => step.key === tab.step);
    return {
      key: tab.key,
      href: locationTabHref(slug, tab.key),
      label: tab.label,
      detail: detailOf(tab.key),
      count: countFor(tab.key),
      step:
        settingUp && index >= 0
          ? { number: index + 1, done: steps[index]!.done }
          : null,
      icon: LOCATION_TAB_ICONS[tab.key],
      items: itemsOf(tab.key),
    };
  };
  const sectionsIn = (group: "work" | "setup" | "foot") =>
    tabs.filter((tab) => tab.group === group).map(sectionOf);

  const setupIntro = settingUp ? (
    <div className="px-2 pb-2">
      <SetupBar done={progress.done} total={progress.total} />
      {progress.next ? (
        <p className="mt-2 text-xs text-slate-600">
          Next: {progress.next.todos[0]}.{" "}
          {nextHref ? (
            <Link
              href={nextHref}
              className="font-medium text-slate-900 underline-offset-4 hover:underline"
            >
              Open {progress.next.title}
            </Link>
          ) : null}
        </p>
      ) : (
        <p className="mt-2 text-xs text-slate-600">
          Every step is done;{" "}
          {may("locations.activate")
            ? "take it live when ready."
            : "SUPER takes it live."}
        </p>
      )}
    </div>
  ) : null;
  const groups: LocationNavGroup[] = [
    {
      key: "work" as const,
      label: location.name,
      foldable: false,
      sections: sectionsIn("work"),
    },
    {
      key: "setup" as const,
      label: "Setup",
      note: settingUp
        ? `${progress.done} of ${progress.total} done`
        : "Set once",
      intro: setupIntro,
      foldable: !settingUp,
      sections: sectionsIn("setup"),
    },
    {
      key: "foot" as const,
      label: null,
      foldable: false,
      sections: sectionsIn("foot"),
    },
  ].filter((group) => group.sections.length > 0);

  return (
    <LocationNavMenu
      slug={slug}
      groups={groups}
      publicHref={isPublicState(state) ? locationPublicUrl(slug) : null}
    />
  );
}
