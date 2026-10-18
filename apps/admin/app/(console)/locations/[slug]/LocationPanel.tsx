import Link from "next/link";
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_LABELS,
  DROPOFF_RULE_SHORT_LABELS,
  LOCATION_PAGE_LABELS,
  LOCATION_STATE_LABELS,
  PAGE_STATUS_LABELS,
  andList,
  dropoffRuleOf,
  formatLocalDate,
  formatLocalDateTime,
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
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarPanel,
  SidebarPanelToggle,
  SidebarSeparator,
} from "@repo/ui/sidebar";
import { LocationMark } from "../../../_components/LocationMark";
import {
  WhenCollapsed,
  WhenExpanded,
} from "../../../_components/PanelVisibility";
import { LocationStateBadge } from "../../../_components/StatusBadges";
import {
  LOCATION_TABS,
  locationBookingsHref,
  locationOfferingHref,
  locationPageHref,
  locationRatesPartHref,
  locationTabHref,
  locationZoneHref,
  newLocationOfferingHref,
  newLocationZoneHref,
  setupStepTab,
  type LocationTab,
} from "../../../_lib/routes";
import { locationPublicUrl } from "../../../_lib/site";
import { SetupBar } from "../_components/SetupBar";
import { LOCATION_TAB_ICONS } from "../_components/TabIcon";
import {
  LocationPanelNav,
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

/**
 * The panel beside a location's page, after shadcn's sidebar-15 right
 * sidebar: the location's name and state on top, then its sections, each
 * with one line on where it stands (the queue on Bookings and Overview,
 * the pages on Pages) and, where it has something to list, a submenu of
 * it: the classes, the zones, the three parts of the rates, the pages,
 * the bookings by status. Then where its setup has come while it is a
 * draft, the facts about it, and at the foot its public page.
 * Every admin sees the panel; each group shows only what the admin may
 * open. On screens too narrow for the column it opens as a sheet from the
 * console header's button.
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
    if (tab === "history") {
      return overview.changedAt
        ? `Last change ${formatLocalDate(overview.changedAt)}`
        : "No changes recorded";
    }
    if (settingUp) return "Setup checklist";
    if (!may("bookings.view")) return "Pages and history";
    const today =
      overview.pickupsToday === 0
        ? "No pick-ups today"
        : `${plural(overview.pickupsToday, "pick-up")} today`;
    return overview.awaitingDriver === 0
      ? today
      : `${today}, ${overview.awaitingDriver} awaiting a driver`;
  };
  const surcharge = oddHoursOf(location);
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
          {
            key: "new",
            label: "Add class",
            href: newLocationOfferingHref(slug),
          },
        ];
      case "coverage":
        return [
          ...zones.map((zone) => ({
            key: zone.id,
            label: zone.name,
            href: locationZoneHref(slug, zone.id),
          })),
          { key: "new", label: "Add zone", href: newLocationZoneHref(slug) },
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
        return overview.pages.map((page) => ({
          key: page.page,
          label: LOCATION_PAGE_LABELS[page.page],
          href: locationPageHref(slug, page.page),
          dot: PAGE_DOTS[page.status],
          note: PAGE_STATUS_LABELS[page.status],
        }));
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
  const sections: PanelSection[] = LOCATION_TABS.filter((tab) =>
    may(tab.permission),
  ).map((tab) => {
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
  });

  const facts: { label: string; value: string }[] = [
    {
      label: "States",
      value: andList(overview.stateNames) || "None yet",
    },
    {
      label: "Saved addresses",
      value: String(location.addresses.length),
    },
    {
      label: "Home page",
      value:
        location.topChoiceOrder === null
          ? "Not a top choice"
          : `Top choice ${location.topChoiceOrder}`,
    },
    ...(location.wentLiveAt
      ? [
          {
            label: "Went live",
            value: formatLocalDateTime(location.wentLiveAt),
          },
        ]
      : []),
    {
      label: "Last change",
      value: overview.changedAt
        ? formatLocalDateTime(overview.changedAt)
        : "None recorded",
    },
  ];

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
            <span
              title={`${location.name}, ${LOCATION_STATE_LABELS[state].toLowerCase()}`}
            >
              <LocationMark name={location.name} state={state} size="lg" />
            </span>
          </div>
        </WhenCollapsed>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Sections</SidebarGroupLabel>
          <LocationPanelNav slug={slug} sections={sections} />
        </SidebarGroup>
        {/* The rail keeps the sections alone; the numbers and facts need their words. */}
        <WhenExpanded>
          {settingUp ? (
            <>
              <SidebarSeparator />
              <SidebarGroup>
                <SidebarGroupLabel>Setup</SidebarGroupLabel>
                <div className="px-2 pb-1">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium">
                      {progress.done} of {progress.total} steps done
                    </span>
                    <span className="text-xs text-neutral-500 tabular-nums">
                      {Math.round((progress.done / progress.total) * 100)}%
                    </span>
                  </div>
                  <SetupBar
                    done={progress.done}
                    total={progress.total}
                    className="mt-2"
                  />
                  {progress.next ? (
                    <p className="mt-3 text-sm text-neutral-600">
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
                    <p className="mt-3 text-sm text-neutral-600">
                      Every step is done;{" "}
                      {may("locations.activate")
                        ? "take it live when ready."
                        : "SUPER takes it live."}
                    </p>
                  )}
                </div>
              </SidebarGroup>
            </>
          ) : null}

          <SidebarSeparator />
          <SidebarGroup>
            <SidebarGroupLabel>About</SidebarGroupLabel>
            <dl className="divide-y divide-neutral-100 px-2 text-sm">
              {facts.map((fact) => (
                <div
                  key={fact.label}
                  className="flex items-baseline justify-between gap-4 py-2"
                >
                  <dt className="shrink-0 text-neutral-500">{fact.label}</dt>
                  <dd className="truncate text-right text-neutral-900">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          </SidebarGroup>
        </WhenExpanded>
      </SidebarContent>

      <SidebarFooter className="border-t border-neutral-200">
        {isPublicState(state) ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <PublicPageLink href={locationPublicUrl(location.slug)} />
            </SidebarMenuItem>
          </SidebarMenu>
        ) : (
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
