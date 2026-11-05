import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUSES,
  formatLocalDate,
  isBookingOrder,
  isBookingStatus,
  isPaymentStatus,
  isTripMode,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUSES,
  pickupInstant,
  searchTermOf,
  TRIP_MODE_LABELS,
  TRIP_MODES,
  type BookingStatus,
} from "@repo/db";
import {
  countBookings,
  listAgents,
  listBookings,
  type BookingFilter,
} from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { PlusIcon } from "@repo/ui/icons";
import Link from "next/link";
import { Card } from "@repo/console/Card";
import { FigureTiles, type Figure } from "@repo/console/FigureTiles";
import { PageHeader } from "@repo/console/PageHeader";
import { Streamed, TableSkeleton } from "@repo/console/Skeleton";
import { Bone } from "@repo/ui/skeleton";
import { BOOKING_TONES } from "@repo/console/StatusBadges";
import { PickupDateFilter } from "../../../_components/BookingFilters";
import { BookingsTable } from "../../../_components/BookingsTable";
import {
  FilterChips,
  ListFilters,
  type FilterGroup,
} from "../../../_components/ListFilters";
import { Pager, pageOf } from "../../../_components/Pager";
import { SearchBox } from "../../../_components/SearchBox";
import { getPermissions, requireAdmin } from "../../../_lib/access";
import {
  bookingsHref,
  DATE_PARAM,
  DATE_TO_PARAM,
  DIRECT,
  newBookingHref,
  PAGE_PARAM,
  SEARCH_PARAM,
  SORT_PARAM,
  type BookingsListFilter,
  type ScopeSlug,
} from "../../../_lib/routes";
import { scopeOf } from "../../../_lib/scope";
import { ListToolbar } from "../../../_components/ListToolbar";

/** How many bookings a page of the list holds. */
const PAGE_SIZE = 50;

/** A field of the address as text: "" when missing or repeated. */
const textOf = (value: unknown) => (typeof value === "string" ? value : "");

/**
 * Route: /[location]/bookings?status=received&q=…&date=2026-10-29&to=…
 * &agent=…&payment=…&trip=…&sort=…&page=2. The bookings of the scope,
 * newest made first unless sorted by pick-up: every location's under `~`,
 * with the column of locations, or those with a trip picking up in one
 * location under its slug. Figure tiles count each status and narrow the
 * list to it; the search, the pick-up days and the Filters (the agent,
 * the payment and the kind of trip) narrow the counts and the list alike.
 * A draft location's opens too, though its menu has no row for it. Every
 * team that sees bookings opens it; "New booking" is Reservation's and
 * Sales'.
 */
export default async function BookingsPage({
  params,
  searchParams,
}: PageProps<"/[location]/bookings">) {
  await requireAdmin("bookings.view");
  const [scope, query, agents, permissions] = await Promise.all([
    scopeOf(params),
    searchParams,
    listAgents(),
    getPermissions(),
  ]);
  const status = isBookingStatus(query.status) ? query.status : undefined;
  const q = searchTermOf(query[SEARCH_PARAM]) ?? undefined;
  // Pick-up days as the address names them; anything else is any day,
  // and a last day not after the first is the first alone.
  const day = textOf(query[DATE_PARAM]);
  const pickupOn = pickupInstant(day, "00:00") ?? undefined;
  const date = pickupOn ? day : undefined;
  const lastDay = textOf(query[DATE_TO_PARAM]);
  const pickupTo =
    date && lastDay > date
      ? (pickupInstant(lastDay, "00:00") ?? undefined)
      : undefined;
  const to = pickupTo ? lastDay : undefined;
  // An agent no longer listed is no filter, as any unknown value is.
  const agentParam = textOf(query.agent);
  const agent =
    agentParam === DIRECT || agents.some((a) => a.id === agentParam)
      ? agentParam
      : undefined;
  const payment = isPaymentStatus(query.payment) ? query.payment : undefined;
  const sortParam = query[SORT_PARAM];
  const trip = isTripMode(query.trip) ? query.trip : undefined;
  const sort =
    isBookingOrder(sortParam) && sortParam !== "newest" ? sortParam : undefined;
  const filter: BookingsListFilter = {
    status,
    q,
    date,
    to,
    agent,
    payment,
    trip,
    sort,
    page: pageOf(query[PAGE_PARAM]),
  };
  const where: BookingFilter = {
    locationId: scope.location?.id,
    search: q,
    pickupOn,
    pickupTo,
    agentId: agent === DIRECT ? null : agent,
    paymentStatus: payment,
    tripMode: trip,
  };
  const groups: FilterGroup[] = [
    {
      param: "agent",
      label: "Agent",
      value: agent ?? "",
      options: [
        { value: DIRECT, label: "Direct, no agent" },
        ...agents.map((a) => ({ value: a.id, label: a.name })),
      ],
    },
    {
      param: "payment",
      label: "Payment",
      value: payment ?? "",
      options: PAYMENT_STATUSES.map((value) => ({
        value,
        label: PAYMENT_STATUS_LABELS[value],
      })),
    },
    {
      param: "trip",
      label: "Trip type",
      value: trip ?? "",
      options: TRIP_MODES.map((value) => ({
        value,
        label: TRIP_MODE_LABELS[value],
      })),
    },
  ];
  // The list as filtered, on its first page: what each control changes a field of.
  const listed = bookingsHref(scope.slug, { ...filter, page: undefined });
  const narrowed = [scope.slug ?? "~", q, date, to, agent, payment, trip]
    .map((part) => part ?? "")
    .join(":");

  return (
    <>
      <PageHeader
        title="Bookings"
        action={
          permissions.includes("bookings.create") ? (
            <Button asChild>
              <Link href={newBookingHref(scope.slug)}>
                <PlusIcon className="size-4" />
                New booking
              </Link>
            </Button>
          ) : null
        }
      />
      <Streamed
        key={narrowed}
        fallback={
          <FigureTiles
            label="Bookings by status"
            figures={statusFigures(scope.slug, filter, null)}
          />
        }
      >
        {() => statusTiles(scope.slug, filter, where)}
      </Streamed>
      <Card flush>
        <ListToolbar>
          <SearchBox
            href={bookingsHref(scope.slug, {
              ...filter,
              q: undefined,
              page: undefined,
            })}
            value={q ?? ""}
            label="Search bookings"
            placeholder="Reference, name, phone or email"
          />
          <PickupDateFilter href={listed} value={date ?? ""} to={to ?? ""} />
          <ListFilters href={listed} groups={groups} />
        </ListToolbar>
        <FilterChips href={listed} groups={groups} />
        {/* Keyed by the filters, so another filter shows the skeleton, not
            the rows of the one before. */}
        <Streamed
          key={`${narrowed}:${status ?? "all"}:${sort ?? ""}:${filter.page ?? 1}`}
          fallback={<TableSkeleton bare columns={scope.slug ? 9 : 10} />}
        >
          {() => bookingsPage(scope.slug, filter, where)}
        </Streamed>
      </Card>
    </>
  );
}

/**
 * The figure tiles: each status, then All, each with its count in the
 * scope, the search, the days and the Filters, and the list narrowed to
 * it; the one on screen ringed, All when no status is chosen. Without
 * counts, bones.
 */
function statusFigures(
  scope: ScopeSlug,
  filter: BookingsListFilter,
  counts: Record<BookingStatus | "all", number> | null,
): Figure[] {
  const valueOf = (key: BookingStatus | "all") =>
    counts ? counts[key] : <Bone className="h-7 w-10" />;
  const narrow = { ...filter, status: undefined, page: undefined };
  return [
    ...BOOKING_STATUSES.map((status) => ({
      key: status,
      label: BOOKING_STATUS_LABELS[status],
      value: valueOf(status),
      tone: BOOKING_TONES[status],
      href: bookingsHref(scope, { ...narrow, status }),
      current: filter.status === status,
    })),
    {
      key: "all",
      label: "All",
      value: valueOf("all"),
      tone: "neutral" as const,
      href: bookingsHref(scope, narrow),
      current: filter.status === undefined,
    },
  ];
}

async function statusTiles(
  scope: ScopeSlug,
  filter: BookingsListFilter,
  where: BookingFilter,
) {
  const [all, ...byStatus] = await Promise.all([
    countBookings(where),
    ...BOOKING_STATUSES.map((status) => countBookings({ ...where, status })),
  ]);
  const counts = Object.fromEntries(
    BOOKING_STATUSES.map((status, index) => [status, byStatus[index]!]),
  ) as Record<BookingStatus, number>;
  return (
    <FigureTiles
      label="Bookings by status"
      figures={statusFigures(scope, filter, { ...counts, all })}
    />
  );
}

/** What the list says when its filters leave nothing: the search, the Filters, the days and the status. */
function emptyMessage(filter: BookingsListFilter, where: BookingFilter) {
  if (filter.q) return `No booking matches “${filter.q}”.`;
  const which = filter.status
    ? `${BOOKING_STATUS_LABELS[filter.status].toLowerCase()} bookings`
    : "bookings";
  if (filter.agent || filter.payment || filter.trip) {
    return `No ${which} match these filters.`;
  }
  if (where.pickupOn && where.pickupTo) {
    return `No ${which} pick up from ${formatLocalDate(where.pickupOn)} to ${formatLocalDate(where.pickupTo)}.`;
  }
  if (where.pickupOn) {
    return `No ${which} pick up on ${formatLocalDate(where.pickupOn)}.`;
  }
  return filter.status ? `No ${which}.` : "No bookings yet.";
}

/** One page of the bookings the filters leave, in their order, with the way to the others. */
async function bookingsPage(
  scope: ScopeSlug,
  filter: BookingsListFilter,
  where: BookingFilter,
) {
  const page = filter.page ?? 1;
  const listed = { ...where, status: filter.status };
  const [bookings, total] = await Promise.all([
    listBookings(listed, {
      order: isBookingOrder(filter.sort) ? filter.sort : "newest",
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    countBookings(listed),
  ]);
  return (
    <>
      <BookingsTable
        bare
        bookings={bookings}
        scope={scope}
        emptyMessage={emptyMessage(filter, where)}
        sort={{
          order: isBookingOrder(filter.sort) ? filter.sort : "newest",
          hrefOf: (order) =>
            bookingsHref(scope, {
              ...filter,
              sort: order === "newest" ? undefined : order,
              page: undefined,
            }),
        }}
      />
      <Pager
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        hrefOf={(next) => bookingsHref(scope, { ...filter, page: next })}
      />
    </>
  );
}
