import Link from "next/link";
import {
  assignTripsOf,
  ASSIGN_STATES,
  ASSIGN_STATE_LABELS,
  durationLabel,
  formatLocalDate,
  formatLocalTime,
  isTripEventKind,
  PART_ROLE_LABELS,
  plural,
  TRIP_EVENT_LABELS,
  type AssignState,
  type AssignTrip,
  type PartRole,
} from "@repo/db";
import {
  getAssignPage,
  type AssignPart,
  type AssignRow,
} from "@repo/db/server";
import { cx } from "@repo/ui/cx";
import { Card, CardTitle } from "@repo/console/Card";
import { EmptyState } from "@repo/console/EmptyState";
import { AssignStateBadge } from "@repo/console/StatusBadges";
import { PageHeader } from "@repo/console/PageHeader";
import { CardSkeleton, Streamed } from "@repo/console/Skeleton";
import { FilterLinks } from "../../../_components/FilterLinks";
import { requireAdmin } from "../../../_lib/access";
import {
  assignHref,
  bookingHref,
  type AssignFilter,
  type ScopeSlug,
} from "../../../_lib/routes";
import { scopeOf } from "../../../_lib/scope";
import { AssignTripButton } from "../bookings/_components/AssignTripDialog";
import { QuickViewButton } from "./QuickView";

const isState = (value: unknown): value is AssignState =>
  ASSIGN_STATES.includes(value as AssignState);

/**
 * Route: /[location]/assign?state=…&view=booking. Operation's page: every
 * trip from today on, at every location under `~` or at the one under its
 * slug, those to assign first; the chips show those waiting to accept,
 * assigned, on the road or done today, or all. Listed by day, or by
 * booking. Each trip still to assign has Assign, the same dialog as on
 * the booking, and each booking a quick view. Over them, our vehicles
 * waiting for Operation's own yes. See
 * docs/261028-fulfilment-vendors-and-connect.md, "Assigning a booking".
 */
export default async function AssignPage({
  params,
  searchParams,
}: PageProps<"/[location]/assign">) {
  await requireAdmin("bookings.fulfil");
  const [scope, query] = await Promise.all([scopeOf(params), searchParams]);
  const state: AssignState | "all" =
    query.state === "all"
      ? "all"
      : isState(query.state)
        ? query.state
        : "to-assign";
  const view = query.view === "booking" ? "booking" : undefined;

  return (
    <>
      <PageHeader title="Assign" />
      <Streamed fallback={<CardSkeleton rows={6} />}>
        {() => assignList(scope.slug, scope.location?.id, state, view)}
      </Streamed>
    </>
  );
}

async function assignList(
  scope: ScopeSlug,
  locationId: string | undefined,
  state: AssignState | "all",
  view: AssignFilter["view"],
) {
  const { rows, ours } = await getAssignPage(locationId);
  const shown = rows.filter((row) => state === "all" || row.state === state);
  const count = (s: AssignState) => rows.filter((r) => r.state === s).length;
  const filter = { state: state === "to-assign" ? undefined : state, view };
  // The trips of each booking still to assign, for "Also give the same to".
  const open: Open = new Map();
  for (const row of rows) {
    const trips = open.get(row.bookingId) ?? [];
    trips.push(...assignTripsOf([{ ...row, id: row.itemId }]));
    open.set(row.bookingId, trips);
  }

  return (
    <div className="grid gap-5">
      {ours.length > 0 ? (
        <Card>
          <CardTitle description="Our vehicles asked for and not yet checked. Open the booking to accept for us.">
            Waiting for Operation
          </CardTitle>
          <ul className="divide-y divide-hairline text-sm">
            {ours.map((part) => (
              <li
                key={`${part.reference}-${part.position}-${part.role}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2"
              >
                <Link
                  href={bookingHref(scope, part.bookingId)}
                  className="font-medium tabular-nums underline-offset-4 hover:underline"
                >
                  {part.reference}
                </Link>
                <span className="text-muted">
                  Trip {part.position}, {formatLocalDate(part.startsAt)}{" "}
                  {formatLocalTime(part.startsAt)}
                </span>
                <span className="text-muted">
                  {PART_ROLE_LABELS[part.role as PartRole] ?? part.role}
                  {part.name ? ` ${part.name}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <FilterLinks
          label="Trips by where they stand"
          options={ASSIGN_STATES.map((value) => ({
            value,
            label: `${ASSIGN_STATE_LABELS[value]} (${count(value)})`,
          }))}
          active={state === "all" ? undefined : state}
          hrefOf={(value) =>
            assignHref(scope, {
              state:
                value === undefined
                  ? "all"
                  : value === "to-assign"
                    ? undefined
                    : value,
              view,
            })
          }
        />
        <div className="sm:ml-auto">
          <FilterLinks
            label="List by"
            all={false}
            options={[
              { value: "trip", label: "By trip" },
              { value: "booking", label: "By booking" },
            ]}
            active={view ?? "trip"}
            hrefOf={(value) =>
              assignHref(scope, {
                ...filter,
                view: value === "booking" ? "booking" : undefined,
              })
            }
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <Card>
          <EmptyState>
            {state === "to-assign"
              ? "Nothing to assign: every trip from today on has its vehicle and driver asked for."
              : "No trip from today on stands here."}
          </EmptyState>
        </Card>
      ) : view === "booking" ? (
        <ByBooking rows={shown} scope={scope} open={open} />
      ) : (
        <ByDay rows={shown} scope={scope} open={open} />
      )}
    </div>
  );
}

/** The trips of each booking still to assign, by the booking's id. */
type Open = Map<string, AssignTrip[]>;

/** The trips under their day, soonest first. */
function ByDay({
  rows,
  scope,
  open,
}: {
  rows: AssignRow[];
  scope: ScopeSlug;
  open: Open;
}) {
  const days = new Map<string, AssignRow[]>();
  for (const row of rows) {
    const day = formatLocalDate(row.startsAt);
    days.set(day, [...(days.get(day) ?? []), row]);
  }
  return (
    <div className="grid gap-5">
      {[...days].map(([day, dayRows]) => (
        <Card key={day} flush>
          <CardTitle inset meta={plural(dayRows.length, "trip")}>
            {day}
          </CardTitle>
          <ul className="divide-y divide-hairline">
            {dayRows.map((row) => (
              <TripRow key={row.itemId} row={row} scope={scope} open={open} />
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

/** The trips under their booking, the booking of the soonest trip first. */
function ByBooking({
  rows,
  scope,
  open,
}: {
  rows: AssignRow[];
  scope: ScopeSlug;
  open: Open;
}) {
  const bookings = new Map<string, AssignRow[]>();
  for (const row of rows) {
    bookings.set(row.bookingId, [...(bookings.get(row.bookingId) ?? []), row]);
  }
  return (
    <div className="grid gap-5">
      {[...bookings].map(([bookingId, bookingRows]) => {
        const first = bookingRows[0]!;
        return (
          <Card key={bookingId} flush>
            <CardTitle
              inset
              meta={`${first.customer} · ${plural(first.tripCount, "trip")}`}
              action={
                <QuickViewButton
                  bookingId={bookingId}
                  reference={first.reference}
                  href={bookingHref(scope, bookingId)}
                />
              }
            >
              {first.reference}
            </CardTitle>
            <ul className="divide-y divide-hairline">
              {bookingRows.map((row) => (
                <TripRow
                  key={row.itemId}
                  row={row}
                  scope={scope}
                  open={open}
                  inBooking
                />
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}

/** What a part still waits for, in a few words. */
function waitingLabel(part: AssignPart) {
  switch (part.waiting) {
    case "name":
      return "vendor to choose";
    case "vendor":
      return part.vendorName
        ? "waiting for the vendor"
        : "waiting for Operation";
    case "driver":
      return "waiting for the driver";
    case null:
      return null;
  }
}

/**
 * One trip: when, where, what, who does it and where it stands; Assign
 * while a vehicle or a driver is still to ask for, and the booking's
 * quick view.
 */
function TripRow({
  row,
  scope,
  open,
  inBooking = false,
}: {
  row: AssignRow;
  scope: ScopeSlug;
  open: Open;
  inBooking?: boolean;
}) {
  const { job } = row;
  const trips = open.get(row.bookingId) ?? [];
  const trip = trips.find((t) => t.id === row.itemId);
  return (
    <li
      className={cx(
        "grid gap-3 px-5 py-4 md:grid-cols-[6rem_minmax(0,1fr)_minmax(0,16rem)_auto] md:items-center",
        row.overdue && "bg-warning-tint",
      )}
    >
      <div className="grid gap-0.5">
        <span className="font-semibold text-ink tabular-nums">
          {formatLocalTime(row.startsAt)}
        </span>
        {inBooking ? (
          <span className="text-caption text-muted">
            {formatLocalDate(row.startsAt)}
          </span>
        ) : null}
      </div>
      <div className="grid min-w-0 gap-0.5">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="truncate font-medium text-ink">
            {job.dropoff
              ? `${job.pickup.label} → ${job.dropoff.label}`
              : job.pickup.label}
          </span>
          <AssignStateBadge state={row.state} />
        </span>
        <span className="text-caption text-muted">
          {[
            inBooking ? null : row.reference,
            `Trip ${row.position}`,
            row.hours ? durationLabel(row.hours) : "One-way",
            row.className,
            `${row.passengers} pax`,
            scope === null ? row.locationName : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
        {row.lastEvent ? (
          <span className="text-caption text-muted">
            {isTripEventKind(row.lastEvent.kind)
              ? TRIP_EVENT_LABELS[row.lastEvent.kind]
              : row.lastEvent.kind}{" "}
            at {formatLocalTime(row.lastEvent.at)}
            {row.overdue ? " · past its estimated end" : ""}
          </span>
        ) : null}
      </div>
      <dl className="grid gap-0.5 text-caption">
        {(["vehicle", "driver"] as const).map((role) => {
          const part = row.parts.find((p) => p.role === role);
          const waiting = part ? waitingLabel(part) : null;
          return (
            <div key={role} className="flex gap-1.5">
              <dt className="text-muted">{PART_ROLE_LABELS[role]}</dt>
              <dd
                className={cx(
                  "min-w-0 truncate",
                  part ? "text-body" : "text-muted",
                )}
              >
                {part
                  ? `${part.name ?? "not named yet"}${part.vendorName ? ` · ${part.vendorName}` : ""}`
                  : "not yet"}
                {waiting ? (
                  <span className="text-warning"> · {waiting}</span>
                ) : null}
              </dd>
            </div>
          );
        })}
      </dl>
      <div className="flex items-center gap-2 md:justify-end">
        {inBooking ? null : (
          <QuickViewButton
            bookingId={row.bookingId}
            reference={row.reference}
            href={bookingHref(scope, row.bookingId)}
          />
        )}
        {trip ? (
          <AssignTripButton
            bookingId={row.bookingId}
            trip={trip}
            others={trips.filter((t) => t.id !== trip.id)}
            variant={row.parts.length > 0 ? "secondary" : "primary"}
          />
        ) : null}
      </div>
    </li>
  );
}
