import Link from "next/link";
import {
  ASSIGN_STATES,
  ASSIGN_STATE_LABELS,
  durationLabel,
  formatLocalDate,
  formatLocalDateTime,
  formatLocalTime,
  isTripEventKind,
  tripUrgencyOf,
  PART_ROLE_LABELS,
  PART_ROLES,
  partWaitingLabel,
  todayInMalaysia,
  addDays,
  pickupInstant,
  TRIP_EVENT_LABELS,
  untilPickup,
  type AssignState,
  type TripUrgency,
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
import {
  ASSIGN_TONES,
  AssignStateBadge,
  NoGuideBadge,
  NotAssignedBadge,
  URGENCY_TEXT,
} from "@repo/console/StatusBadges";
import { EmptyRow, Table, TBody, Td, Th, THead } from "@repo/console/Table";
import { PickupDateFilter } from "../../../_components/BookingFilters";
import {
  FilterChips,
  ListFilters,
  type FilterGroup,
} from "../../../_components/ListFilters";
import { ListToolbar } from "../../../_components/ListToolbar";
import { classIn, tripFilterGroups } from "../../../_lib/trip-filters";
import { SearchBox } from "../../../_components/SearchBox";
import { requireAdmin } from "../../../_lib/access";
import {
  assignHref,
  assignTripHref,
  bookingHref,
  type AssignFilter,
  type ScopeSlug,
} from "../../../_lib/routes";
import { scopeOf } from "../../../_lib/scope";
import {
  ASSIGN_ONLY,
  ASSIGN_ONLY_LABELS,
  assignViewOf,
  classesOf,
  rowsInView,
  type AssignView,
} from "./assign-filter";
import { QuickViewButton } from "./QuickView";

const isState = (value: unknown): value is AssignState =>
  ASSIGN_STATES.includes(value as AssignState);

type Shown = AssignState | "all";

/** The table's columns: pick-up, booking, trip, a column per role, status, and the button. */
const COLUMNS = 5 + PART_ROLES.length;

/** The address's filters as the view names them, its state aside. */
function filterOf(view: AssignView): AssignFilter {
  return {
    q: view.q,
    date: view.date,
    service: view.service,
    class: view.classId,
    trip: view.trip,
    only: view.only,
  };
}

/** The address of the list narrowed to a state, its other filters kept; To assign is the default and left out. */
const hrefOf = (scope: ScopeSlug, state: Shown, filter: AssignFilter) =>
  assignHref(scope, {
    ...filter,
    state: state === "to-assign" ? undefined : state,
  });

/**
 * Route: /[location]/assign?state=…&q=…&date=…&class=…&trip=…&only=….
 * Operation's page: every trip from today on, or one day's, past or not,
 * at every location under `~` or at the one under its slug, in a table by pickup
 * under a heading for each day, those to assign first. Figure tiles count
 * where the trips stand and narrow the list to one; the search, the
 * pick-up day and the Filters (service, class, kind of trip, urgent or
 * overdue)
 * narrow the counts and the list alike, from the trips loaded.
 * Each row says how soon it picks up, red within the day while not yet
 * assigned, and who does it or whose answer it waits for; its reference
 * opens a quick view of the booking, Assign or Open the trip's own page.
 * A past day picked says it is past. Done counts today's done trips, or
 * the day's picked.
 * See docs/261028-fulfilment-vendors-and-connect.md, "Assigning a booking".
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
  const view = assignViewOf(query);

  return (
    <>
      <PageHeader title="Assign" />
      {/* Keyed by the scope and the state alone: a search or a filter keeps
          the bar, and what is typed in it, while the rows come. */}
      <Streamed
        key={`${scope.slug ?? "~"}:${state}`}
        fallback={
          <>
            <FigureTiles
              label="Trips by where they stand"
              figures={stateFigures(scope.slug, state, filterOf(view), null)}
            />
            <Card flush>
              <ListToolbar>
                <Bone className="h-10 w-full sm:w-80" />
              </ListToolbar>
              <TableSkeleton bare columns={COLUMNS} />
            </Card>
          </>
        }
      >
        {() => assignList(scope.slug, scope.location?.id, state, view)}
      </Streamed>
    </>
  );
}

/**
 * The tiles: each state, then All, with its count; the one on screen
 * ringed. Without counts, bones. Done is today's, the list starting today,
 * unless a day is picked.
 */
function stateFigures(
  scope: ScopeSlug,
  shown: Shown,
  filter: AssignFilter,
  counts: Record<Shown, number> | null,
): Figure[] {
  const valueOf = (key: Shown) =>
    counts ? counts[key] : <Bone className="h-7 w-10" />;
  return [
    ...ASSIGN_STATES.map((state) => ({
      key: state,
      label:
        state === "done" && !filter.date
          ? "Done Today"
          : ASSIGN_STATE_LABELS[state],
      value: valueOf(state),
      tone: ASSIGN_TONES[state],
      href: hrefOf(scope, state, filter),
      current: shown === state,
    })),
    {
      key: "all",
      label: "All",
      value: valueOf("all"),
      tone: "neutral" as const,
      href: hrefOf(scope, "all", filter),
      current: shown === "all",
    },
  ];
}

const EMPTY: Record<Shown, string> = {
  "to-assign":
    "Nothing to assign: every trip from today on has a vendor asked for each role.",
  waiting: "No trip is waiting for an answer.",
  assigned: "No trip from today on is assigned and not yet on the road.",
  "on-the-road": "No trip is on the road.",
  done: "No trip is done today yet.",
  all: "No trip from today on.",
};

/** The Filters' choices: the service, the classes the trips name, the kind of trip, and what needs Operation first. */
function groupsOf(rows: readonly AssignRow[], view: AssignView) {
  const classes = classesOf(rows);
  // A class no trip names any more, or of the other service, is no filter.
  const live: AssignView = {
    ...view,
    classId: classIn(classes, view.classId, view.service),
  };
  const groups: FilterGroup[] = [
    ...tripFilterGroups({
      classes,
      service: live.service,
      classId: live.classId,
      trip: live.trip,
    }),
    {
      param: "only",
      label: "Needs Attention",
      value: view.only ?? "",
      options: ASSIGN_ONLY.map((value) => ({
        value,
        label: ASSIGN_ONLY_LABELS[value],
      })),
    },
  ];
  return { groups, live };
}

/** A day, "2026-11-05", as its start in Malaysia, to write it out. */
const pickupDay = (day: string) => pickupInstant(day, "00:00") ?? new Date();

/** "Today · Thu, 5 Nov", "Tomorrow · Fri, 6 Nov", or the day alone, for the heading over a day's trips. */
function dayHeading(day: string, at: Date, today: string) {
  const date = formatLocalDate(at);
  if (day === today) return `Today · ${date}`;
  if (day === addDays(today, 1)) return `Tomorrow · ${date}`;
  return date;
}

async function assignList(
  scope: ScopeSlug,
  locationId: string | undefined,
  state: Shown,
  asked: AssignView,
) {
  // A day asked for is read on its own, so an old one is always found.
  const now = new Date();
  const rows = await getAssignPage(locationId, asked.date, now);
  const { groups, live: view } = groupsOf(rows, asked);
  const inView = rowsInView(rows, view, now);
  const counts = Object.fromEntries([
    ...ASSIGN_STATES.map((s) => [
      s,
      inView.filter((r) => r.state === s).length,
    ]),
    ["all", inView.length],
  ]) as Record<Shown, number>;
  const shown = inView.filter((row) => state === "all" || row.state === state);
  const filter = filterOf(view);
  // The list as filtered, in its state: what each control changes a field of.
  const listed = hrefOf(scope, state, filter);
  const today = todayInMalaysia(now);
  const filtered = Object.values(filter).some(Boolean);
  const past = view.date !== undefined && view.date < today;

  return (
    <>
      <FigureTiles
        label="Trips by where they stand"
        figures={stateFigures(scope, state, filter, counts)}
      />
      <Card flush>
        <ListToolbar>
          <SearchBox
            href={hrefOf(scope, state, { ...filter, q: undefined })}
            value={view.q ?? ""}
            label="Search trips"
            placeholder="Booking, customer, place, plate or driver"
          />
          <PickupDateFilter href={listed} value={view.date ?? ""} />
          <ListFilters href={listed} groups={groups} />
        </ListToolbar>
        {past ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-warning-edge bg-warning-tint px-5 py-2.5 text-sm text-warning-strong">
            <span>
              <span className="font-semibold">Past day.</span>{" "}
              {formatLocalDate(pickupDay(view.date!))}: the trips as they were
              left.
            </span>
            <Link
              href={hrefOf(scope, state, { ...filter, date: undefined })}
              className="font-medium text-link"
            >
              Back to Upcoming
            </Link>
          </div>
        ) : null}
        <FilterChips href={listed} groups={groups} />
        <Table bare>
          <THead>
            <Th>Pick-up</Th>
            <Th>Booking</Th>
            <Th>Trip</Th>
            {PART_ROLES.map((role) => (
              <Th key={role}>{PART_ROLE_LABELS[role]}</Th>
            ))}
            <Th>Status</Th>
            <Th />
          </THead>
          <TBody>
            {shown.length === 0 ? (
              <EmptyRow colSpan={COLUMNS}>
                {filtered ? "No trip matches these filters." : EMPTY[state]}
              </EmptyRow>
            ) : (
              shown.map((row, index) => {
                const day = todayInMalaysia(row.startsAt);
                const before = shown[index - 1];
                const opensDay =
                  !before || todayInMalaysia(before.startsAt) !== day;
                return [
                  opensDay ? (
                    <tr key={`day:${day}`}>
                      <th
                        scope="colgroup"
                        colSpan={COLUMNS}
                        className="bg-canvas px-5 py-2 text-left text-xs font-semibold text-ink"
                      >
                        {dayHeading(day, row.startsAt, today)}
                      </th>
                    </tr>
                  ) : null,
                  <TripRow
                    key={row.itemId}
                    row={row}
                    scope={scope}
                    now={now}
                  />,
                ];
              })
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
  const { job, state } = row;
  const until = untilPickup(row.startsAt, now);
  const urgency = tripUrgencyOf(row, now);
  return (
    <tr className={cx(row.overdue && "bg-warning-tint")}>
      <Td className="whitespace-nowrap tabular-nums">
        <span className="block font-medium text-ink">
          {formatLocalDate(row.startsAt)}
        </span>
        <span className="block text-xs text-muted">
          {formatLocalTime(row.startsAt)}
          {" · "}
          <span className={urgency ? URGENCY_TEXT[urgency] : undefined}>
            {until.label}
          </span>
        </span>
      </Td>
      <Td className="whitespace-nowrap">
        <QuickViewButton
          bookingId={row.bookingId}
          label={row.label}
          href={bookingHref(scope, row.bookingId)}
        />
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
            row.hours ? durationLabel(row.hours) : "Transfer",
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
      {PART_ROLES.map((role) => (
        <Td key={role} className="min-w-40">
          {role === "guide" && !row.withGuide ? (
            <NoGuideBadge />
          ) : (
            <PartCell
              part={row.parts.find((p) => p.role === role) ?? null}
              urgency={urgency}
            />
          )}
          {role === "guide" && row.guideLanguage ? (
            <span className="block text-xs text-muted">
              Speaks {row.guideLanguage}
            </span>
          ) : null}
          {role === "guide" && row.guideRequest ? (
            <span className="block text-xs text-muted">
              {row.guideRequest} asked for
            </span>
          ) : null}
        </Td>
      ))}
      <Td className="whitespace-nowrap">
        <AssignStateBadge state={state} />
      </Td>
      <Td className="text-right whitespace-nowrap">
        <Button
          asChild
          size="sm"
          variant={state === "to-assign" ? "primary" : "secondary"}
        >
          <Link href={assignTripHref(scope, row.itemId)}>
            {state === "to-assign" ? "Assign" : "Open"}
          </Link>
        </Button>
      </Td>
    </tr>
  );
}

/** Who does one role: whom it names and from which vendor, and whose answer it waits for, by when. */
function PartCell({
  part,
  urgency,
}: {
  part: AssignPart | null;
  /** How soon the trip needs Operation: a role no one is asked to do takes its colour. */
  urgency: TripUrgency | null;
}) {
  if (!part) return <NotAssignedBadge urgency={urgency} />;
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
