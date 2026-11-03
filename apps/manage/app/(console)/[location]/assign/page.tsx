import Link from "next/link";
import {
  ASSIGN_STATES,
  ASSIGN_STATE_LABELS,
  durationLabel,
  formatLocalDate,
  formatLocalDateTime,
  formatLocalTime,
  isTripEventKind,
  partWaitingLabel,
  TRIP_EVENT_LABELS,
  untilPickup,
  type AssignState,
} from "@repo/db";
import {
  getAssignPage,
  type AssignPart,
  type AssignRow,
} from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { Bone } from "@repo/ui/skeleton";
import { Card } from "@repo/console/Card";
import { FigureTiles, type Figure } from "@repo/console/FigureTiles";
import { PageHeader } from "@repo/console/PageHeader";
import { Streamed, TableSkeleton } from "@repo/console/Skeleton";
import { ASSIGN_TONES, AssignStateBadge } from "@repo/console/StatusBadges";
import { EmptyRow, Table, TBody, Td, Th, THead } from "@repo/console/Table";
import { requireAdmin } from "../../../_lib/access";
import {
  assignHref,
  assignTripHref,
  bookingHref,
  type ScopeSlug,
} from "../../../_lib/routes";
import { scopeOf } from "../../../_lib/scope";

const isState = (value: unknown): value is AssignState =>
  ASSIGN_STATES.includes(value as AssignState);

type Shown = AssignState | "all";

/**
 * Route: /[location]/assign?state=…. Operation's page: every trip from
 * today on, at every location under `~` or at the one under its slug, in
 * a table by pickup, those to assign first. Figure tiles count where the
 * trips stand and narrow the list to one. Each row says how soon it picks
 * up, red within the day while not yet assigned, and who does it or whose
 * answer it waits for; its reference opens the booking, Assign or Open
 * the trip's own page. See docs/261028-fulfilment-vendors-and-connect.md,
 * "Assigning a booking".
 */
export default async function AssignPage({
  params,
  searchParams,
}: PageProps<"/[location]/assign">) {
  await requireAdmin("bookings.fulfil");
  const [scope, query] = await Promise.all([scopeOf(params), searchParams]);
  const state: Shown =
    query.state === "all"
      ? "all"
      : isState(query.state)
        ? query.state
        : "to-assign";

  return (
    <>
      <PageHeader title="Assign" />
      <Streamed
        key={`${scope.slug ?? "~"}:${state}`}
        fallback={
          <>
            <FigureTiles
              label="Trips by where they stand"
              figures={stateFigures(scope.slug, state, null)}
            />
            <Card flush>
              <TableSkeleton bare columns={6} />
            </Card>
          </>
        }
      >
        {() => assignList(scope.slug, scope.location?.id, state)}
      </Streamed>
    </>
  );
}

/** The tiles: each state, then All, with its count; the one on screen ringed. Without counts, bones. */
function stateFigures(
  scope: ScopeSlug,
  shown: Shown,
  counts: Record<Shown, number> | null,
): Figure[] {
  const valueOf = (key: Shown) =>
    counts ? counts[key] : <Bone className="h-7 w-10" />;
  return [
    ...ASSIGN_STATES.map((state) => ({
      key: state,
      label: ASSIGN_STATE_LABELS[state],
      value: valueOf(state),
      tone: ASSIGN_TONES[state],
      href: assignHref(scope, {
        state: state === "to-assign" ? undefined : state,
      }),
      current: shown === state,
    })),
    {
      key: "all",
      label: "All",
      value: valueOf("all"),
      tone: "neutral" as const,
      href: assignHref(scope, { state: "all" }),
      current: shown === "all",
    },
  ];
}

const EMPTY: Record<Shown, string> = {
  "to-assign":
    "Nothing to assign: every trip from today on has its vehicle and driver asked for.",
  waiting: "No trip is waiting for an answer.",
  assigned: "No trip from today on is assigned and not yet on the road.",
  "on-the-road": "No trip is on the road.",
  done: "No trip is done today yet.",
  all: "No trip from today on.",
};

async function assignList(
  scope: ScopeSlug,
  locationId: string | undefined,
  state: Shown,
) {
  const rows = await getAssignPage(locationId);
  const counts = Object.fromEntries([
    ...ASSIGN_STATES.map((s) => [s, rows.filter((r) => r.state === s).length]),
    ["all", rows.length],
  ]) as Record<Shown, number>;
  const shown = rows.filter((row) => state === "all" || row.state === state);
  const now = new Date();

  return (
    <>
      <FigureTiles
        label="Trips by where they stand"
        figures={stateFigures(scope, state, counts)}
      />
      <Card flush>
        <Table bare>
          <THead>
            <Th>Pick-up</Th>
            <Th>Booking</Th>
            <Th>Trip</Th>
            <Th>Vehicle</Th>
            <Th>Driver</Th>
            <Th>Status</Th>
            <Th />
          </THead>
          <TBody>
            {shown.length === 0 ? (
              <EmptyRow colSpan={7}>{EMPTY[state]}</EmptyRow>
            ) : (
              shown.map((row) => (
                <TripRow key={row.itemId} row={row} scope={scope} now={now} />
              ))
            )}
          </TBody>
        </Table>
      </Card>
    </>
  );
}

/** One trip: when and how soon, its booking, where and what, who does it, where it stands, and its page. */
function TripRow({
  row,
  scope,
  now,
}: {
  row: AssignRow;
  scope: ScopeSlug;
  now: Date;
}) {
  const { job } = row;
  const until = untilPickup(row.startsAt, now);
  const toDo = row.state === "to-assign" || row.state === "waiting";
  const urgent = until.soon && toDo;
  return (
    <tr className={cx(row.overdue && "bg-warning-tint")}>
      <Td className="whitespace-nowrap tabular-nums">
        <span className="block font-medium text-ink">
          {formatLocalDate(row.startsAt)}
        </span>
        <span className="block text-xs text-muted">
          {formatLocalTime(row.startsAt)}
          {" · "}
          <span className={cx(urgent && "font-semibold text-danger")}>
            {until.label}
          </span>
        </span>
      </Td>
      <Td className="whitespace-nowrap">
        <Link
          href={bookingHref(scope, row.bookingId)}
          className="font-medium tabular-nums underline-offset-4 hover:underline"
        >
          {row.reference}
        </Link>
        <span className="block max-w-40 truncate text-xs text-muted">
          {row.customer}
        </span>
      </Td>
      <Td className="min-w-56 text-body">
        <span className="block">
          {job.dropoff
            ? `${job.pickup.label} → ${job.dropoff.label}`
            : job.pickup.label}
        </span>
        <span className="block text-xs text-muted">
          {[
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
          <span className="block text-xs text-muted">
            {isTripEventKind(row.lastEvent.kind)
              ? TRIP_EVENT_LABELS[row.lastEvent.kind]
              : row.lastEvent.kind}{" "}
            at {formatLocalTime(row.lastEvent.at)}
            {row.overdue ? " · past its estimated end" : ""}
          </span>
        ) : null}
      </Td>
      {(["vehicle", "driver"] as const).map((role) => (
        <Td key={role} className="min-w-40">
          <PartCell part={row.parts.find((p) => p.role === role) ?? null} />
        </Td>
      ))}
      <Td className="whitespace-nowrap">
        <AssignStateBadge state={row.state} />
      </Td>
      <Td className="text-right whitespace-nowrap">
        <Button
          asChild
          size="sm"
          variant={row.state === "to-assign" ? "primary" : "secondary"}
        >
          <Link href={assignTripHref(scope, row.itemId)}>
            {row.state === "to-assign" ? "Assign" : "Open"}
          </Link>
        </Button>
      </Td>
    </tr>
  );
}

/** Who does one role: whom it names and from which vendor, and whose answer it waits for, by when. */
function PartCell({ part }: { part: AssignPart | null }) {
  if (!part) return <span className="text-muted">Not asked</span>;
  return (
    <>
      <span className="block text-body">
        {part.name ?? (part.isOurs ? "Any, we name it" : "Any")}
      </span>
      <span className="block text-xs text-muted">{part.vendorName}</span>
      {part.waiting ? (
        <span className="block text-xs text-warning">
          {partWaitingLabel(part.waiting, part.vendorName)}
          {part.respondBy ? `, by ${formatLocalDateTime(part.respondBy)}` : ""}
        </span>
      ) : null}
    </>
  );
}
