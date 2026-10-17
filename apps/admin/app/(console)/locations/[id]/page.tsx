import Link from "next/link";
import {
  BOOKING_STATUS_LABELS,
  LOCATION_PAGE_LABELS,
  PAGE_STATUS_LABELS,
  describeActivity,
  formatLocalDateTime,
  locationStateOf,
  setupSteps,
  type BookingStatus,
  type PageStanding,
  type PageStatus,
  type Permission,
  type SetupStep,
} from "@repo/db";
import {
  listActivityForMany,
  listBookings,
  type ActivityEntry,
  type BookingWithItems,
  type LocationOverview,
} from "@repo/db/server";
import { cx } from "@repo/ui/cx";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ActivityHistory } from "../../../_components/ActivityHistory";
import { BookingsTable } from "../../../_components/BookingsTable";
import { Card, CardTitle } from "../../../_components/Card";
import { HistorySheet } from "../../../_components/HistorySheet";
import { SectionHeader } from "../../../_components/SectionHeader";
import {
  Bone,
  CardSkeleton,
  Streamed,
  TableSkeleton,
} from "../../../_components/Skeleton";
import { getPermissions, requireAdmin } from "../../../_lib/access";
import {
  locationBookingsHref,
  locationPageHref,
  locationPublishHref,
  locationTabHref,
  setupStepTab,
} from "../../../_lib/routes";
import { locationDetails, locationOverview } from "../_lib/location-data";
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
 * Route: /locations/[id]. The Overview tab, for every team. A draft
 * location opens on its setup checklist: the four steps, where each
 * stands, and what to do next. A live or paused one opens on the day's
 * operation: its queue in numbers, today's pick-ups and the bookings
 * awaiting confirmation for the teams that work the queue, its pages for
 * Marketing. The history is behind a button at the foot.
 */
export default async function LocationOverviewPage({
  params,
}: PageProps<"/locations/[id]">) {
  await requireAdmin("locations.view");
  const { id } = await params;

  return (
    <Streamed
      fallback={
        <div className="grid gap-6">
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {Array.from({ length: 3 }, (_, i) => (
              <div
                key={i}
                className="rounded-lg border border-neutral-200 bg-white p-4 sm:p-5"
              >
                <Bone className="h-4 w-20 sm:h-5 sm:w-28" />
                <Bone className="mt-2 h-8 w-10 sm:h-9" />
              </div>
            ))}
          </div>
          <TableSkeleton columns={6} rows={4} />
          <CardSkeleton rows={3} />
        </div>
      }
    >
      {() => overview({ id })}
    </Streamed>
  );
}

async function overview({ id }: { id: string }) {
  const [location, numbers, permissions, history] = await Promise.all([
    locationDetails(id),
    locationOverview(id),
    getPermissions(),
    listActivityForMany([{ entityType: "location", entityId: id }]),
  ]);
  if (!location || !numbers) notFound();

  const may = (permission: Permission) => permissions.includes(permission);
  const state = locationStateOf(location.state);
  const publishHref = (entry: ActivityEntry) =>
    may("locations.manage") && entry.action === "location.page.published"
      ? locationPublishHref(id, entry.id)
      : null;

  let main: ReactNode;
  if (state === "draft") {
    const steps = setupSteps(location.pages, numbers);
    const hrefOf = (step: SetupStep) => {
      const tab = setupStepTab(step.key);
      return may(tab.permission) ? locationTabHref(id, tab.key) : null;
    };
    main = (
      <SetupChecklist
        title={`Set up ${location.name}`}
        steps={steps}
        hrefOf={hrefOf}
      />
    );
  } else {
    const worksQueue = may("bookings.view");
    const [pickups, received] = worksQueue
      ? await Promise.all([
          listBookings(
            { locationId: id, pickupOn: new Date() },
            { order: "soonest", take: PICKUPS_SHOWN },
          ),
          numbers.awaitingConfirmation > 0
            ? listBookings(
                { locationId: id, status: "received" },
                { take: RECEIVED_SHOWN },
              )
            : [],
        ])
      : [[], []];
    main = (
      <>
        {worksQueue ? (
          <Operation
            id={id}
            numbers={numbers}
            pickups={pickups}
            received={received}
          />
        ) : null}
        {may("locations.manage") ? (
          <PagesCard id={id} pages={numbers.pages} />
        ) : null}
      </>
    );
  }

  return (
    <div className="grid gap-6">
      {main}
      <HistoryLine
        name={location.name}
        history={history}
        hrefOf={publishHref}
      />
    </div>
  );
}

/** The day's work in a live location: the queue in numbers and the bookings behind them. */
function Operation({
  id,
  numbers,
  pickups,
  received,
}: {
  id: string;
  numbers: LocationOverview;
  pickups: BookingWithItems[];
  received: BookingWithItems[];
}) {
  const queue = (status?: BookingStatus) => locationBookingsHref(id, status);
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
          <Link
            key={figure.label}
            href={figure.href}
            className="block min-w-0 rounded-lg border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300 sm:p-5"
          >
            <dt className="text-xs text-neutral-600 sm:text-sm">
              {figure.label}
            </dt>
            <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums sm:mt-2 sm:text-3xl">
              {figure.value}
            </dd>
          </Link>
        ))}
      </dl>

      <section className="grid gap-3">
        <SectionHeader
          title="Today's pick-ups"
          description={
            more(pickups.length, numbers.pickupsToday) ??
            "Every booking with a live item picking up here today, soonest first."
          }
          action={<AllBookingsLink href={queue()} />}
        />
        <BookingsTable bookings={pickups} emptyMessage="No pick-ups today." />
      </section>

      {received.length > 0 ? (
        <section className="grid gap-3">
          <SectionHeader
            title="Awaiting confirmation"
            description={
              more(received.length, numbers.awaitingConfirmation) ??
              "Bookings that have come in and wait for Reservation, newest first."
            }
            action={<AllBookingsLink href={queue("received")} />}
          />
          <BookingsTable
            bookings={received}
            emptyMessage="Nothing awaiting confirmation."
          />
        </section>
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

/** Marketing's part of a live location: its pages and where each stands. */
function PagesCard({
  id,
  pages,
}: {
  id: string;
  pages: readonly PageStanding[];
}) {
  return (
    <Card>
      <CardTitle description="What the public reads; edits wait until they are published.">
        Pages
      </CardTitle>
      <ul className="divide-y divide-neutral-100">
        {pages.map((page) => (
          <li
            key={page.page}
            className="flex items-center gap-3 py-2.5 text-sm"
          >
            <span
              aria-hidden="true"
              className={cx(
                "size-2 shrink-0 rounded-full",
                PAGE_DOTS[page.status],
              )}
            />
            <span className="min-w-0 flex-1 truncate font-medium">
              {LOCATION_PAGE_LABELS[page.page]}
            </span>
            <span className="truncate text-neutral-500">
              {PAGE_STATUS_LABELS[page.status]}
            </span>
            <Link
              href={locationPageHref(id, page.page)}
              className="font-medium whitespace-nowrap underline-offset-4 hover:underline"
            >
              Open
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** The foot of the overview: the last change in a line, the whole history behind a button. */
function HistoryLine({
  name,
  history,
  hrefOf,
}: {
  name: string;
  history: ActivityEntry[];
  hrefOf: (entry: ActivityEntry) => string | null;
}) {
  const last = history.at(-1);
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-neutral-200 pt-4 text-sm text-neutral-600">
      {last ? (
        <p className="min-w-0">
          Last change: {describeActivity(last)}.{" "}
          <span className="text-neutral-500">
            {last.actorName}, {formatLocalDateTime(last.createdAt)}.
          </span>
        </p>
      ) : (
        <p>No changes recorded for this location.</p>
      )}
      {history.length > 0 ? (
        <HistorySheet
          title={`History of ${name}`}
          description="The location's changes, oldest first: its details, its zones and rates, its classes, its pages and its state. Open a publish to read the page as it was before and after."
        >
          <ActivityHistory
            entries={history}
            emptyMessage="No changes recorded for this location."
            hrefOf={hrefOf}
          />
        </HistorySheet>
      ) : null}
    </div>
  );
}
