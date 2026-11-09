import Link from "next/link";
import { notFound } from "next/navigation";
import {
  bookingLabelOf,
  formatLocalDateTime,
  formatMyr,
  isRevisionKind,
  ITEM_STATUS_LABELS,
  isItemStatus,
  REVISION_KIND_LABELS,
  revisionSnapshotOf,
  type SnapshotTrip,
} from "@repo/db";
import { getRevision, listRevisions } from "@repo/db/server";
import { Card, CardTitle } from "@repo/console/Card";
import { DetailColumns } from "@repo/console/PageColumn";
import { PageHeader, RecordLink } from "@repo/console/PageHeader";
import {
  CardSkeleton,
  DetailSkeleton,
  HeaderSkeleton,
  Streamed,
} from "@repo/console/Skeleton";
import { Button } from "@repo/ui/button";
import { ArrowLeftIcon, ArrowRightIcon } from "@repo/ui/icons";
import { Notice } from "@repo/ui/notice";
import { Rows } from "@repo/ui/rows";
import type { ReactNode } from "react";
import { requireAdmin } from "../../../../../../_lib/access";
import { bookingHref, revisionHref } from "../../../../../../_lib/routes";
import { scopeOf, type ConsoleScope } from "../../../../../../_lib/scope";
import { scopedBooking } from "../../../_lib/scoped-booking";

/**
 * Route: /[location]/bookings/[id]/revisions/[number]. One revision of a
 * booking, read only: the booking as it stood then, each trip with its
 * places, its stops, its quote beside what it charged and why, and the
 * charges; with its kind, its line for the customer, who made it and
 * when. The way to the revision before and after, and back to the booking.
 */
export default async function RevisionPage({
  params,
}: PageProps<"/[location]/bookings/[id]/revisions/[number]">) {
  await requireAdmin("bookings.view");
  const scope = await scopeOf(params);
  const { id, number } = await params;
  const n = Number(number);
  if (!Number.isInteger(n) || n < 1) notFound();
  return (
    <Streamed
      fallback={
        <>
          <HeaderSkeleton />
          <DetailSkeleton
            main={<CardSkeleton rows={8} />}
            side={<CardSkeleton rows={4} />}
          />
        </>
      }
    >
      {() => revisionScreen(id, n, scope)}
    </Streamed>
  );
}

async function revisionScreen(id: string, number: number, scope: ConsoleScope) {
  const [booking, revision, all] = await Promise.all([
    scopedBooking(id, scope),
    getRevision(id, number),
    listRevisions(id),
  ]);
  if (!revision) notFound();
  const snapshot = revisionSnapshotOf(revision.snapshot);
  const label = bookingLabelOf(booking);
  const kind = isRevisionKind(revision.kind)
    ? REVISION_KIND_LABELS[revision.kind]
    : revision.kind;
  const before = all.find((r) => r.number === number - 1);
  const after = all.find((r) => r.number === number + 1);
  const latest = all.at(-1)?.number === number;

  const facts: [string, ReactNode][] = [
    ["Kind", kind],
    ["Change", revision.summary],
    ["Made", formatLocalDateTime(revision.createdAt)],
  ];
  if (revision.reason) facts.push(["Reason", revision.reason]);
  facts.push(["Quoted", formatMyr(revision.quotedSen)]);
  facts.push([
    "Customer pays",
    <strong key="c" className="font-bold text-ink">
      {formatMyr(revision.chargedSen)}
    </strong>,
  ]);
  if (before) {
    const difference = revision.chargedSen - before.chargedSen;
    facts.push([
      "Against Rev " + before.number,
      difference === 0
        ? "No change"
        : `${difference > 0 ? "+" : "−"}${formatMyr(Math.abs(difference))}`,
    ]);
  }

  return (
    <>
      <PageHeader
        title={`Rev ${number}`}
        meta={
          <RecordLink href={bookingHref(scope.slug, id)}>{label}</RecordLink>
        }
        action={
          <>
            {before ? (
              <Button asChild variant="secondary" size="sm">
                <Link href={revisionHref(scope.slug, id, before.number)}>
                  <ArrowLeftIcon className="size-4" />
                  Rev {before.number}
                </Link>
              </Button>
            ) : null}
            {after ? (
              <Button asChild variant="secondary" size="sm">
                <Link href={revisionHref(scope.slug, id, after.number)}>
                  Rev {after.number}
                  <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
            ) : null}
          </>
        }
      />
      <Notice tone="info" className="mb-5">
        {latest
          ? "The booking as it stands now, read only. Change it from the booking."
          : "The booking as it stood after this change, read only."}
      </Notice>
      <DetailColumns
        main={
          snapshot ? (
            <>
              {snapshot.trips.map((trip) => (
                <SnapshotTripCard key={trip.position} trip={trip} />
              ))}
              {snapshot.charges.length > 0 ? (
                <Card>
                  <CardTitle>Charges</CardTitle>
                  <Rows
                    className="text-sm"
                    rows={snapshot.charges.map(
                      (c) =>
                        [
                          `${c.label}${c.position ? ` (trip ${c.position})` : ""}`,
                          formatMyr(c.amountSen),
                        ] as [string, ReactNode],
                    )}
                  />
                </Card>
              ) : null}
            </>
          ) : (
            <Card>
              <p className="text-sm text-muted">
                This revision keeps no snapshot.
              </p>
            </Card>
          )
        }
        side={
          <Card>
            <CardTitle>This revision</CardTitle>
            <Rows rows={facts} className="text-sm" />
          </Card>
        }
      />
    </>
  );
}

function SnapshotTripCard({ trip }: { trip: SnapshotTrip }) {
  const rows: [string, ReactNode][] = [
    ["Pick-up time", formatLocalDateTime(new Date(trip.startsAt))],
  ];
  if (trip.pickup) rows.push(["Pick-up", trip.pickup]);
  for (const stop of trip.stops) rows.push(["Stop", stop]);
  if (trip.dropoff) rows.push(["Drop-off", trip.dropoff]);
  if (trip.hours !== null) rows.push(["Duration", `${trip.hours} hours`]);
  if (trip.distanceKm !== null)
    rows.push(["Road distance", `${trip.distanceKm.toFixed(1)} km`]);
  if (trip.vehicleClassName) {
    rows.push([
      "Vehicle",
      [trip.vehicleClassName, trip.vehicleModelName].filter(Boolean).join(", "),
    ]);
  }
  if (trip.passengers !== null)
    rows.push(["Passengers", String(trip.passengers)]);
  if (trip.guideLanguage) rows.push(["Tour guide", trip.guideLanguage]);
  const price: [string, ReactNode][] = [["Quoted", formatMyr(trip.quotedSen)]];
  if (trip.chargedSen !== trip.quotedSen) {
    price.push([
      "Agreed",
      <span key="a">
        <span className="block">{formatMyr(trip.chargedSen)}</span>
        {trip.agreedReason ? (
          <span className="block text-xs font-normal text-muted">
            {trip.agreedReason}
          </span>
        ) : null}
      </span>,
    ]);
  }
  return (
    <Card>
      <CardTitle
        meta={trip.heading}
        action={
          <span className="text-caption text-muted">
            {isItemStatus(trip.status)
              ? ITEM_STATUS_LABELS[trip.status]
              : trip.status}
          </span>
        }
      >
        Trip {trip.position}
      </CardTitle>
      <Rows rows={rows} className="text-sm" />
      <div className="mt-3 border-t border-hairline pt-2">
        <Rows rows={price} className="text-sm" />
      </div>
    </Card>
  );
}
