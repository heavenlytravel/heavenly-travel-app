import Link from "next/link";
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_LABELS,
  DROPOFF_RULE_SHORT_LABELS,
  LOCATION_PAGE_LABELS,
  LOCATION_STATE_LABELS,
  PAGE_STATUS_LABELS,
  dropoffRuleOf,
  formatLocalDate,
  isPublicState,
  oddHoursLabel,
  oddHoursOf,
  plural,
  setupProgress,
  type LocationState,
  type PageStatus,
  type Permission,
  type SetupStep,
} from "@repo/db";
import type { LocationOverview, LocationWithDetails } from "@repo/db/server";
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarPanel,
  SidebarPanelToggle,
} from "@repo/ui/sidebar";
import { Tooltip } from "@repo/ui/tooltip";
import { LocationMark } from "../../../_components/LocationMark";
import {
  WhenCollapsed,
  WhenExpanded,
} from "../../../_components/PanelVisibility";
import { LocationStateBadge } from "../../../_components/StatusBadges";
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
  LocationPanelNav,
  PanelFootLink,
  type PanelGroup,
  type PanelItem,
  type PanelSection,
} from "./LocationPanelNav";
import { PublicPageLink } from "./PublicPageLink";

/** Where the panel's column sticks: under the console header, as tall as what is left. */
export const PANEL_PLACEMENT = "top-14 h-[calc(100svh-3.5rem)]";

/** The panel's accessible name, as a column and as a sheet. */
export const PANEL_TITLE = "Location panel";

const PAGE_DOTS: Record<PageStatus, PanelItem["dot"]> = {
  unpublished: "grey",
  published: "green",
  changed: "amber",
};

/** "3 vehicles in service, 1 with a document due": a vehicles or drivers tab's line. */
function fleetLine(count: string, state: string, due: number) {
  const line = `${count} ${state}`;
  return due === 0 ? line : `${line}, ${due} with a document due`;
}

/**
 * The panel beside a location's page, after shadcn's sidebar-15 right
 * sidebar: the location's name and state on top, then its sections in two
 * groups, each section with one line on where it stands and, where it has
 * something to list, a submenu of it: the classes, the zones, the three
 * parts of the rates, the pages and their saved addresses, the bookings by
 * status, the vehicles and drivers with a document due. A draft is set up
 * before anything else: its overview stands alone on top, then the Setup
 * group with how far it has come and what to do next, its steps numbered.
 * Once live or paused the day comes first: Work holds Today, the bookings,
 * the vehicles, the drivers and the pages; the setup, done once and rarely touched, folds away under
 * it. At the foot, the history and the public page. Every admin sees the
 * panel; each group shows only what the admin may open. On screens too
 * narrow for the column it opens as a sheet from the console header's
 * button. See docs/261018-location-work-and-class-catalogue.md.
 */
export function LocationPanel({
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
      );
    }
    if (tab === "drivers") {
      return fleetLine(
        plural(overview.drivers, "driver"),
        "active",
        overview.driversDue,
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
  const itemsOf = (tab: LocationTab): PanelItem[] => {
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
            href: locationVehiclesHref(slug, true),
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
            href: locationDriversHref(slug, true),
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
          href: locationBookingsHref(slug, status),
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
  const sectionOf = (tab: (typeof tabs)[number]): PanelSection => {
    const index = steps.findIndex((step) => step.key === tab.step);
    return {
      key: tab.key,
      href: locationTabHref(slug, tab.key),
      label: tab.label,
      detail: detailOf(tab.key),
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
        <p className="mt-2 text-xs text-neutral-600">
          Next: {progress.next.todos[0]}.{" "}
          {nextHref ? (
            <Link
              href={nextHref}
              className="font-medium text-neutral-900 underline-offset-4 hover:underline"
            >
              Open {progress.next.title}
            </Link>
          ) : null}
        </p>
      ) : (
        <p className="mt-2 text-xs text-neutral-600">
          Every step is done;{" "}
          {may("locations.activate")
            ? "take it live when ready."
            : "SUPER takes it live."}
        </p>
      )}
    </div>
  ) : null;
  const groups: PanelGroup[] = [
    {
      key: "work" as const,
      label: settingUp ? null : "Work",
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
  ].filter((group) => group.sections.length > 0);
  const foot = sectionsIn("foot");

  return (
    <SidebarPanel title={PANEL_TITLE} className={PANEL_PLACEMENT}>
      <SidebarHeader className="border-b border-neutral-200">
        <WhenExpanded>
          <div className="flex items-center gap-3 p-2">
            <LocationMark name={location.name} state={state} size="lg" />
            <span className="grid min-w-0 flex-1 leading-tight">
              <span className="truncate text-sm font-semibold">
                {location.name}
              </span>
              <span className="truncate text-xs text-neutral-500">
                /{location.slug}
              </span>
            </span>
            <LocationStateBadge state={state} />
            <SidebarPanelToggle className="-mr-1" />
          </div>
        </WhenExpanded>
        {/* Collapsed: the toggle, then the location's mark with its name and state as the tooltip. */}
        <WhenCollapsed>
          <div className="grid justify-items-center gap-2 py-1">
            <SidebarPanelToggle />
            <Tooltip
              content={`${location.name}, ${LOCATION_STATE_LABELS[state].toLowerCase()}`}
              side="right"
            >
              <LocationMark name={location.name} state={state} size="lg" />
            </Tooltip>
          </div>
        </WhenCollapsed>
      </SidebarHeader>

      <SidebarContent>
        <LocationPanelNav slug={slug} groups={groups} />
      </SidebarContent>

      <SidebarFooter className="border-t border-neutral-200">
        <SidebarMenu>
          {foot.map((section) => (
            <SidebarMenuItem key={section.key}>
              <PanelFootLink slug={slug} section={section} />
            </SidebarMenuItem>
          ))}
          {isPublicState(state) ? (
            <SidebarMenuItem>
              <PublicPageLink href={locationPublicUrl(location.slug)} />
            </SidebarMenuItem>
          ) : null}
        </SidebarMenu>
        {isPublicState(state) ? null : (
          <WhenExpanded>
            <p className="px-2 py-1.5 text-xs text-neutral-500">
              Not public yet. Staff read the pages through Preview.
            </p>
          </WhenExpanded>
        )}
      </SidebarFooter>
    </SidebarPanel>
  );
}
