import Link from "next/link";
import {
  BOOKING_STATUS_LABELS,
  DROPOFF_RULE_SHORT_LABELS,
  LOCATION_PAGE_LABELS,
  andList,
  dropoffRuleOf,
  locationStateOf,
  oddHoursLabel,
  oddHoursOf,
  plural,
  setupSteps,
  type BookingStatus,
  type PageStatus,
  type Permission,
  type SetupStep,
} from "@repo/db";
import {
  listBookings,
  listOfferings,
  listZones,
  type BookingWithItems,
  type LocationOverview,
} from "@repo/db/server";
import { cx } from "@repo/ui/cx";
import { ChevronRightIcon } from "@repo/ui/icons";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { BookingsTable } from "../../../_components/BookingsTable";
import { Card, CardTitle, Frame } from "../../../_components/Card";
import {
  Bone,
  CardSkeleton,
  Streamed,
  TableSkeleton,
} from "../../../_components/Skeleton";
import { getPermissions, requireAdmin } from "../../../_lib/access";
import {
  locationBookingsHref,
  locationTabHref,
  locationTabsFor,
  setupStepTab,
  type LocationTab,
} from "../../../_lib/routes";
import { LOCATION_TAB_ICONS } from "../_components/TabIcon";
import {
  locationDetails,
  locationKey,
  locationOverview,
} from "../_lib/location-data";
import { SetupChecklist } from "./SetupChecklist";

type Figure = { label: string; value: number; href: string };

/** How many of today's pick-ups and of the bookings awaiting confirmation the overview lists. */
const PICKUPS_SHOWN = 6;
const RECEIVED_SHOWN = 5;

const PAGE_DOTS: Record<PageStatus, string> = {
  unpublished: "bg-neutral-300",
  published: "bg-emerald-500",
  changed: "bg-amber-500",
};

/**
 * Route: /locations/[slug]. The Overview tab, for every team. A draft
 * location opens on its setup checklist: the four steps, where each
 * stands, and what to do next. A live or paused one opens on its day, the
 * tab named Today: its queue in numbers, today's pick-ups and the bookings
 * awaiting confirmation, for the teams that work the queue. A team that
 * does not, such as Marketing, sees the location's parts at a glance
 * instead, a line each and a way in, which the panel also lists. See
 * docs/261018-location-work-and-class-catalogue.md.
 */
export default async function LocationOverviewPage({
  params,
}: PageProps<"/locations/[slug]">) {
  await requireAdmin("locations.view");
  const { slug } = await params;
  const { id } = await locationKey(slug);

  return (
    <Streamed
      fallback={
        <div className="grid gap-6">
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {Array.from({ length: 3 }, (_, i) => (
              <Frame key={i} className="p-4 sm:p-5">
                <Bone className="h-4 w-20 sm:w-28" />
                <Bone className="mt-2 h-8 w-10" />
              </Frame>
            ))}
          </div>
          <TableSkeleton columns={5} rows={3} />
          <CardSkeleton rows={4} />
        </div>
      }
    >
      {() => overview({ id, slug })}
    </Streamed>
  );
}

async function overview({ id, slug }: { id: string; slug: string }) {
  const [location, numbers, permissions] = await Promise.all([
    locationDetails(id),
    locationOverview(id),
    getPermissions(),
  ]);
  if (!location || !numbers) notFound();

  const may = (permission: Permission) => permissions.includes(permission);
  const state = locationStateOf(location.state);
  const draft = state === "draft";
  const worksQueue = !draft && may("bookings.view");
  // A live location's parts at a glance, for a team with no queue to work.
  const glance = !draft && !worksQueue;
  const operates = glance && may("coverage.view");
  const [zones, offerings, pickups, received] = await Promise.all([
    operates ? listZones(id) : [],
    operates ? listOfferings(id) : [],
    worksQueue
      ? listBookings(
          { locationId: id, pickupOn: new Date() },
          { order: "soonest", take: PICKUPS_SHOWN },
        )
      : [],
    worksQueue && numbers.awaitingConfirmation > 0
      ? listBookings(
          { locationId: id, status: "received" },
          { take: RECEIVED_SHOWN },
        )
      : [],
  ]);

  let top: ReactNode = null;
  if (draft) {
    const steps = setupSteps(location.pages, numbers);
    const hrefOf = (step: SetupStep) => {
      const tab = setupStepTab(step.key);
      return may(tab.permission) ? locationTabHref(slug, tab.key) : null;
    };
    top = (
      <SetupChecklist
        title={`Set up ${location.name}`}
        steps={steps}
        hrefOf={hrefOf}
      />
    );
  } else if (worksQueue) {
    top = (
      <Operation
        slug={slug}
        numbers={numbers}
        pickups={pickups}
        received={received}
      />
    );
  }

  const onSale = offerings.filter(
    (offering) => offering.isActive && offering.vehicleClass.isActive,
  );
  const off = offerings.length - onSale.length;
  const pairs = (numbers.zones * (numbers.zones - 1)) / 2;
  const surcharge = oddHoursOf(location);
  const lines: Partial<Record<LocationTab, ReactNode>> = {
    details: [
      andList(numbers.stateNames) || "No state yet",
      plural(location.addresses.length, "saved address", "saved addresses"),
      location.topChoiceOrder === null
        ? null
        : `Top choice ${location.topChoiceOrder}`,
    ]
      .filter(Boolean)
      .join(" · "),
    "vehicle-classes":
      offerings.length === 0
        ? "Nothing sold here yet"
        : `${plural(onSale.length, "class", "classes")} on sale${off > 0 ? `, ${off} off` : ""}`,
    coverage:
      zones.length === 0
        ? "No zone yet, so no pickup is served"
        : `${plural(zones.length, "zone")}: ${zones.map((zone) => zone.name).join(", ")}`,
    rates: [
      pairs === 0
        ? "Needs two zones"
        : `${numbers.routesPriced} of ${plural(pairs, "pair")} priced`,
      `drop-offs: ${DROPOFF_RULE_SHORT_LABELS[dropoffRuleOf(location)].toLowerCase()}`,
      surcharge
        ? `odd hours ${oddHoursLabel(surcharge)}`
        : "no odd-hours surcharge",
    ].join(" · "),
    pages: (
      <span className="flex flex-wrap gap-x-3 gap-y-0.5">
        {numbers.pages.map((page) => (
          <span key={page.page} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={cx("size-2 rounded-full", PAGE_DOTS[page.status])}
            />
            {LOCATION_PAGE_LABELS[page.page]}
          </span>
        ))}
      </span>
    ),
  };
  // The tabs with a line, the admin may open, in the panel's order.
  const glances = glance
    ? locationTabsFor(state).filter(
        (tab) => lines[tab.key] !== undefined && may(tab.permission),
      )
    : [];

  return (
    <div className="grid gap-6">
      {top}
      {glances.length > 0 ? (
        <Card flush>
          <CardTitle
            inset
            description="Every part of this location in a line. Open one to work on it."
          >
            At a glance
          </CardTitle>
          <ul className="divide-y divide-neutral-100 overflow-hidden rounded-b-xl border-t border-neutral-200">
            {glances.map((tab) => (
              <li key={tab.key}>
                <Link
                  href={locationTabHref(slug, tab.key)}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-6 py-4 transition-colors hover:bg-neutral-50"
                >
                  <span className="flex size-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
                    {LOCATION_TAB_ICONS[tab.key]}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-neutral-900">
                      {tab.label}
                    </span>
                    <span className="block truncate text-sm text-neutral-500">
                      {lines[tab.key]}
                    </span>
                  </span>
                  <ChevronRightIcon className="text-neutral-400" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

/** The day's work in a live location: the queue in numbers and the bookings behind them. */
function Operation({
  slug,
  numbers,
  pickups,
  received,
}: {
  slug: string;
  numbers: LocationOverview;
  pickups: BookingWithItems[];
  received: BookingWithItems[];
}) {
  const queue = (status?: BookingStatus) => locationBookingsHref(slug, status);
  const figures: Figure[] = [
    {
      label: BOOKING_STATUS_LABELS.received,
      value: numbers.awaitingConfirmation,
      href: queue("received"),
    },
    { label: "Pick-ups today", value: numbers.pickupsToday, href: queue() },
    {
      label: "Awaiting driver",
      value: numbers.awaitingDriver,
      href: queue("confirmed"),
    },
  ];
  const more = (shown: number, total: number) =>
    total > shown ? `${shown} of ${total} shown.` : null;

  return (
    <>
      <dl className="grid grid-cols-3 gap-3 sm:gap-4">
        {figures.map((figure) => (
          <Link key={figure.label} href={figure.href} className="group min-w-0">
            <Frame className="h-full p-4 transition-shadow group-hover:border-neutral-300 group-hover:shadow-md sm:p-5">
              <dt className="text-xs text-neutral-500 sm:text-sm">
                {figure.label}
              </dt>
              <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums sm:mt-2 sm:text-3xl">
                {figure.value}
              </dd>
            </Frame>
          </Link>
        ))}
      </dl>

      <Card flush>
        <CardTitle
          inset
          description={
            more(pickups.length, numbers.pickupsToday) ??
            "Every booking with a live item picking up here today, soonest first."
          }
          action={<AllBookingsLink href={queue()} />}
        >
          Today&apos;s pick-ups
        </CardTitle>
        <BookingsTable
          bare
          locationSlug={slug}
          bookings={pickups}
          emptyMessage="No pick-ups today."
        />
      </Card>

      {received.length > 0 ? (
        <Card flush>
          <CardTitle
            inset
            description={
              more(received.length, numbers.awaitingConfirmation) ??
              "Bookings that have come in and wait for Reservation, newest first."
            }
            action={<AllBookingsLink href={queue("received")} />}
          >
            Awaiting confirmation
          </CardTitle>
          <BookingsTable
            bare
            locationSlug={slug}
            bookings={received}
            emptyMessage="Nothing awaiting confirmation."
          />
        </Card>
      ) : null}
    </>
  );
}

function AllBookingsLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="text-sm font-medium whitespace-nowrap underline-offset-4 hover:underline"
    >
      All bookings
    </Link>
  );
}
