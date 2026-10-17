import Link from "next/link";
import {
  BOOKING_STATUS_LABELS,
  LOCATION_PAGE_LABELS,
  LOCATION_STATE_LABELS,
  PAGE_STATUS_LABELS,
  andList,
  formatLocalDateTime,
  isPublicState,
  setupProgress,
  type LocationState,
  type PageStatus,
  type Permission,
  type SetupStep,
} from "@repo/db";
import type { LocationOverview, LocationWithDetails } from "@repo/db/server";
import { cx } from "@repo/ui/cx";
import {
  BanknoteIcon,
  BusIcon,
  CalendarCheckIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  MapIcon,
  MapPinIcon,
} from "@repo/ui/icons";
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarPanel,
  SidebarPanelToggle,
  SidebarSeparator,
} from "@repo/ui/sidebar";
import type { ReactNode } from "react";
import { LocationMark } from "../../../_components/LocationMark";
import {
  WhenCollapsed,
  WhenExpanded,
} from "../../../_components/PanelVisibility";
import { LocationStateBadge } from "../../../_components/StatusBadges";
import {
  LOCATION_TABS,
  locationBookingsHref,
  locationPageHref,
  locationTabHref,
  setupStepTab,
  type LocationTab,
} from "../../../_lib/routes";
import { locationPublicUrl } from "../../../_lib/site";
import { LocationPanelNav, type PanelSection } from "./LocationPanelNav";
import { PublicPageLink } from "./PublicPageLink";

/** Where the panel's column sticks: under the console header, as tall as what is left. */
export const PANEL_PLACEMENT = "top-14 h-[calc(100svh-3.5rem)]";

/** The panel's accessible name, as a column and as a sheet. */
export const PANEL_TITLE = "Location panel";

const SECTION_ICONS: Record<LocationTab, ReactNode> = {
  overview: <LayoutDashboardIcon />,
  details: <MapPinIcon />,
  "vehicle-classes": <BusIcon />,
  coverage: <MapIcon />,
  rates: <BanknoteIcon />,
  pages: <FileTextIcon />,
  bookings: <CalendarCheckIcon />,
};

const PAGE_DOTS: Record<PageStatus, string> = {
  unpublished: "bg-neutral-300",
  published: "bg-emerald-500",
  changed: "bg-amber-500",
};

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

/**
 * The panel beside a location's page, after shadcn's sidebar-15 right
 * sidebar: the location's name and state on top, then its sections with
 * where each stands, its queue in numbers, where its setup has come, its
 * pages and the facts about it, and at the foot its public page. Every
 * admin sees the panel; each group shows only what the admin may open. On
 * screens too narrow for the column it opens as a sheet from the console
 * header's button.
 */
export function LocationPanel({
  location,
  overview,
  steps,
  state,
  permissions,
}: {
  location: LocationWithDetails;
  overview: LocationOverview;
  steps: readonly SetupStep[];
  state: LocationState;
  permissions: readonly Permission[];
}) {
  const may = (permission: Permission) => permissions.includes(permission);
  const id = location.id;
  const settingUp = state === "draft";
  const progress = setupProgress(steps);
  const nextTab = progress.next ? setupStepTab(progress.next.key) : null;
  const nextHref =
    nextTab && may(nextTab.permission)
      ? locationTabHref(id, nextTab.key)
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
    return settingUp ? "Setup checklist" : "Today's operation";
  };
  const sections: PanelSection[] = LOCATION_TABS.filter((tab) =>
    may(tab.permission),
  ).map((tab) => {
    const index = steps.findIndex((step) => step.key === tab.step);
    return {
      key: tab.key,
      href: locationTabHref(id, tab.key),
      label: tab.label,
      detail: detailOf(tab.key),
      step:
        settingUp && index >= 0
          ? { number: index + 1, done: steps[index]!.done }
          : null,
      icon: SECTION_ICONS[tab.key],
    };
  });

  const queue = [
    {
      label: BOOKING_STATUS_LABELS.received,
      value: overview.awaitingConfirmation,
      href: locationBookingsHref(id, "received"),
    },
    {
      label: "Pick-ups today",
      value: overview.pickupsToday,
      href: locationBookingsHref(id),
    },
    {
      label: "Awaiting driver",
      value: overview.awaitingDriver,
      href: locationBookingsHref(id, "confirmed"),
    },
  ];

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
          <LocationPanelNav id={id} sections={sections} />
        </SidebarGroup>
        {/* The rail keeps the sections alone; the numbers and facts need their words. */}
        <WhenExpanded>
          {may("bookings.view") ? (
            <>
              <SidebarSeparator />
              <SidebarGroup>
                <SidebarGroupLabel>Queue</SidebarGroupLabel>
                <SidebarMenu>
                  {queue.map((figure) => (
                    <SidebarMenuItem key={figure.label}>
                      <SidebarMenuButton asChild>
                        <Link href={figure.href}>
                          <span className="flex-1 truncate text-neutral-700">
                            {figure.label}
                          </span>
                          <span className="font-semibold tabular-nums">
                            {figure.value}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroup>
            </>
          ) : null}

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
                  <div
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={progress.total}
                    aria-valuenow={progress.done}
                    className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-200"
                  >
                    <div
                      className="h-full rounded-full bg-emerald-600 transition-[width]"
                      style={{
                        width: `${(progress.done / progress.total) * 100}%`,
                      }}
                    />
                  </div>
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

          {may("locations.manage") ? (
            <>
              <SidebarSeparator />
              <SidebarGroup>
                <SidebarGroupLabel>
                  Pages, {plural(overview.pages.length, "page")}
                </SidebarGroupLabel>
                <SidebarMenu>
                  {overview.pages.map((page) => (
                    <SidebarMenuItem key={page.page}>
                      <SidebarMenuButton
                        asChild
                        tooltip={PAGE_STATUS_LABELS[page.status]}
                      >
                        <Link
                          href={locationPageHref(id, page.page)}
                          title={PAGE_STATUS_LABELS[page.status]}
                        >
                          <span
                            aria-hidden="true"
                            className={cx(
                              "mx-1 size-2 shrink-0 rounded-full",
                              PAGE_DOTS[page.status],
                            )}
                          />
                          <span className="flex-1 truncate">
                            {LOCATION_PAGE_LABELS[page.page]}
                          </span>
                          <span className="truncate text-xs text-neutral-500">
                            {PAGE_STATUS_LABELS[page.status]}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
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
