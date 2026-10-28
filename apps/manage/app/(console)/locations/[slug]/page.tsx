import Link from "next/link";
import {
  BOOKING_STATUS_LABELS,
  LOCATION_PAGE_LABELS,
  andList,
  locationStateOf,
  plural,
  setupSteps,
  tripRulesLabel,
  tripRulesOf,
  type BookingStatus,
  type PageStatus,
  type Permission,
  type SetupStep,
} from "@repo/db";
import {
  listBookings,
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
import { MENU_ICONS } from "../../../_components/menu";
import {
  SETUP_STEP_PERMISSIONS,
  locationBookingsHref,
  locationDriversHref,
  locationTabHref,
  locationVehiclesHref,
  locationTabsMayOpen,
  setupStepTab,
  type LocationTab,
} from "../../../_lib/routes";
import {
  locationDetails,
  locationKey,
  locationOfferings,
  locationOverview,
  locationZoneNames,
} from "../_lib/location-data";
import { SetupChecklist } from "./SetupChecklist";

type Figure = { label: string; value: number; href: string };

/** How many of today's pick-ups and of the bookings awaiting confirmation the overview lists. */
const PICKUPS_SHOWN = 6;
const RECEIVED_SHOWN = 5;

const PAGE_DOTS: Record<PageStatus, string> = {
  unpublished: "bg-slate-300",
  published: "bg-emerald-500",
  changed: "bg-amber-500",
};

/**
 * Route: /locations/[slug]. The Overview tab, for every team. A draft
 * location opens on its setup checklist: the four steps, where each
 * stands, and what to do next. A live or paused one opens on its day: its
 * queue in numbers, today's pick-ups and the bookings awaiting
 * confirmation, for the teams that work the queue, and for Operation the
 * vehicles with a document due and the drivers with a licence due. A team
 * that does not, such as Marketing, sees the location's parts at a glance
 * instead, a line each and a way in, which the sidebar also lists. See
 * docs/261018-location-work-and-class-catalogue.md and
 * docs/261023-console-sidebar.md.
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
    operates ? locationZoneNames(id) : [],
    operates ? locationOfferings(id) : [],
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
    const hrefOf = (step: SetupStep) =>
      may(SETUP_STEP_PERMISSIONS[step.key])
        ? locationTabHref(slug, setupStepTab(step.key).key)
        : null;
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
  // Every pair of zones, and each zone with itself: its within-zone price.
  const pairs = (numbers.zones * (numbers.zones + 1)) / 2;
  const lines: Partial<Record<LocationTab, ReactNode>> = {
    settings: [
      andList(numbers.stateNames) || "No state yet",
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
        ? "Needs a zone"
        : `${numbers.routesPriced} of ${plural(pairs, "route")} priced`,
      `rules: ${tripRulesLabel(tripRulesOf(location)).toLowerCase()}`,
    ].join(" · "),
    pages: (
      <span className="flex flex-wrap gap-x-3 gap-y-0.5">
        {numbers.pages
          .filter((page) => page.slug === "")
          .map((page) => (
            <span key={page.page} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className={cx("size-2 rounded-full", PAGE_DOTS[page.status])}
              />
              {LOCATION_PAGE_LABELS[page.page]}
            </span>
          ))}
        <span>
          {plural(
            location.addresses.length,
            "saved address",
            "saved addresses",
          )}
        </span>
      </span>
    ),
  };
  // The tabs with a line, the admin may open, in the sidebar's order.
  const glances = glance
    ? locationTabsMayOpen(state, permissions).filter(
        (tab) => lines[tab.key] !== undefined,
      )
    : [];

  const documentsDue =
    !draft &&
    may("fleet.manage") &&
    numbers.vehiclesDue + numbers.driversDue > 0;

  return (
    <div className="grid gap-6">
      {top}
      {documentsDue ? <DocumentsDueCard slug={slug} numbers={numbers} /> : null}
      {glances.length > 0 ? (
        <Card flush>
          <CardTitle
            inset
            description="Every part of this location in a line. Open one to work on it."
          >
            At a glance
          </CardTitle>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-b-xl border-t border-slate-200">
            {glances.map((tab) => (
              <li key={tab.key}>
                <Link
                  href={locationTabHref(slug, tab.key)}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-6 py-4 transition-colors hover:bg-slate-50"
                >
                  <span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <GlanceIcon tab={tab.key} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-900">
                      {tab.label}
                    </span>
                    <span className="block truncate text-sm text-slate-500">
                      {lines[tab.key]}
                    </span>
                  </span>
                  <ChevronRightIcon className="text-slate-400" />
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
  const queue = (status?: BookingStatus) =>
    locationBookingsHref(slug, { status });
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
            <Frame className="h-full p-4 transition-shadow group-hover:border-slate-300 group-hover:shadow-md sm:p-5">
              <dt className="text-xs text-slate-500 sm:text-sm">
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

/** Operation's reminder of the documents due here within 30 days or expired, each a link to the list of them. */
function DocumentsDueCard({
  slug,
  numbers,
}: {
  slug: string;
  numbers: LocationOverview;
}) {
  const lines = [
    numbers.vehiclesDue > 0
      ? {
          text: `${plural(numbers.vehiclesDue, "vehicle has", "vehicles have")} a document due`,
          href: locationVehiclesHref(slug, { due: true }),
        }
      : null,
    numbers.driversDue > 0
      ? {
          text: `${plural(numbers.driversDue, "driver has", "drivers have")} a licence due`,
          href: locationDriversHref(slug, { due: true }),
        }
      : null,
  ].filter((line) => line !== null);
  return (
    <Card>
      <CardTitle description="Within 30 days or already expired. Renew them before the vehicle or the driver is sent out.">
        Documents due
      </CardTitle>
      <ul className="grid gap-2">
        {lines.map((line) => (
          <li key={line.href}>
            <Link
              href={line.href}
              className="flex items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 transition-colors hover:bg-amber-100"
            >
              {line.text}
              <ChevronRightIcon />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** A tab's icon on its line at a glance, the same as its row in the sidebar. */
function GlanceIcon({ tab }: { tab: LocationTab }) {
  const Icon = MENU_ICONS[tab];
  return <Icon />;
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
